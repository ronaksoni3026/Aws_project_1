import io
import csv
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks, Response
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.core.security import Role
from backend.core.dependencies import require_role, require_active_recruiter
from backend.core.tasks import notify_students_on_job_deletion
from backend.core.aws import send_email_via_ses
from backend.models.recruiter import Recruiter
from backend.models.job import Job, JobStatus
from backend.models.application import Application, ApplicationStatus
from backend.models.student import Student
from backend.models.notification import Notification
from backend.schemas.recruiter import RecruiterResponse
from backend.schemas.job import JobCreate, JobUpdate, JobResponse
from backend.schemas.application import (
    ApplicationBatchUpdateRequest,
    ScheduleInterviewRequest,
    ApplicationResponse,
    PaginatedApplicationsResponse,
)
from backend.schemas.student import StudentResponse

router = APIRouter(prefix="/recruiter", tags=["Company Recruiter Portal"])


@router.get("/profile", response_model=RecruiterResponse)
def get_recruiter_profile(
    current_recruiter: Recruiter = Depends(require_role(Role.RECRUITER)),
):
    """
    Returns recruiter profile.
    Allows recruiter to inspect onboarding status (PENDING, ACTIVE, or REJECTED).
    """
    return current_recruiter


@router.get("/jobs", response_model=List[JobResponse])
def get_recruiter_jobs(
    current_recruiter: Recruiter = Depends(require_role(Role.RECRUITER)),
    db: Session = Depends(get_db),
):
    """Lists all active and non-deleted jobs posted by the logged-in recruiter."""
    jobs = (
        db.query(Job)
        .filter(Job.recruiter_id == current_recruiter.id, Job.is_deleted == False)
        .order_by(Job.created_at.desc())
        .all()
    )
    return jobs


@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job_draft(
    payload: JobCreate,
    current_recruiter: Recruiter = Depends(require_active_recruiter),
    db: Session = Depends(get_db),
):
    """
    Creates a new job posting in DRAFT state.
    Strictly blocked (HTTP 403) if recruiter account is still in PENDING state.
    """
    job = Job(
        recruiter_id=current_recruiter.id,
        title=payload.title,
        description=payload.description,
        company_name=current_recruiter.company_name,
        ctc_lpa=payload.ctc_lpa or 0.0,
        job_location=payload.job_location or "Bengaluru / Hybrid",
        job_type=payload.job_type or "Full-Time",
        deadline=payload.deadline,
        min_cgpa=payload.min_cgpa,
        allowed_branches=payload.allowed_branches,
        allowed_graduation_years=payload.allowed_graduation_years,
        status=JobStatus.DRAFT,
        is_deleted=False,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.put("/jobs/{job_id}", response_model=JobResponse)
def update_job_posting(
    job_id: int,
    payload: JobUpdate,
    current_recruiter: Recruiter = Depends(require_active_recruiter),
    db: Session = Depends(get_db),
):
    """
    Updates a job posting.
    Permitted only while job is in DRAFT or REQUIRES_CHANGES state.
    """
    job = (
        db.query(Job)
        .filter(Job.id == job_id, Job.recruiter_id == current_recruiter.id, Job.is_deleted == False)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    if job.status not in [JobStatus.DRAFT, JobStatus.REQUIRES_CHANGES]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit job in status '{job.status.value}'. Only DRAFT or REQUIRES_CHANGES can be edited."
        )

    if payload.title is not None:
        job.title = payload.title
    if payload.description is not None:
        job.description = payload.description
    if payload.ctc_lpa is not None:
        job.ctc_lpa = payload.ctc_lpa
    if payload.job_location is not None:
        job.job_location = payload.job_location
    if payload.job_type is not None:
        job.job_type = payload.job_type
    if payload.deadline is not None:
        job.deadline = payload.deadline
    if payload.min_cgpa is not None:
        job.min_cgpa = payload.min_cgpa
    if payload.allowed_branches is not None:
        job.allowed_branches = payload.allowed_branches
    if payload.allowed_graduation_years is not None:
        job.allowed_graduation_years = payload.allowed_graduation_years

    db.commit()
    db.refresh(job)
    return job


@router.post("/jobs/{job_id}/submit", response_model=JobResponse)
def submit_job_for_approval(
    job_id: int,
    current_recruiter: Recruiter = Depends(require_active_recruiter),
    db: Session = Depends(get_db),
):
    """
    State Transition: [DRAFT | REQUIRES_CHANGES] -> [PENDING_APPROVAL].
    Sends the job posting to the placement admin review queue.
    """
    job = (
        db.query(Job)
        .filter(Job.id == job_id, Job.recruiter_id == current_recruiter.id, Job.is_deleted == False)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    if job.status not in [JobStatus.DRAFT, JobStatus.REQUIRES_CHANGES]:
        raise HTTPException(
            status_code=400,
            detail=f"Only DRAFT or REQUIRES_CHANGES jobs can be submitted for approval (current: {job.status.value})"
        )

    job.status = JobStatus.PENDING_APPROVAL
    db.commit()
    db.refresh(job)
    return job


@router.post("/jobs/{job_id}/close", response_model=JobResponse)
def close_job_posting(
    job_id: int,
    current_recruiter: Recruiter = Depends(require_active_recruiter),
    db: Session = Depends(get_db),
):
    """Transitions an ACTIVE job to CLOSED."""
    job = (
        db.query(Job)
        .filter(Job.id == job_id, Job.recruiter_id == current_recruiter.id, Job.is_deleted == False)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    if job.status != JobStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail=f"Only ACTIVE jobs can be closed (current: {job.status.value})"
        )

    job.status = JobStatus.CLOSED
    db.commit()
    db.refresh(job)
    return job


@router.delete("/jobs/{job_id}", response_model=JobResponse)
def soft_delete_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    current_recruiter: Recruiter = Depends(require_active_recruiter),
    db: Session = Depends(get_db),
):
    """
    Soft Deletion & Event Dispatch.
    Marks job as is_deleted = True and asynchronously notifies all applicants.
    """
    job = (
        db.query(Job)
        .filter(Job.id == job_id, Job.recruiter_id == current_recruiter.id, Job.is_deleted == False)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    job.is_deleted = True
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        notify_students_on_job_deletion,
        job_id=job.id,
        job_title=job.title,
        company_name=job.company_name,
    )

    return job


@router.get("/jobs/{job_id}/applications", response_model=PaginatedApplicationsResponse)
def get_job_applications(
    job_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[ApplicationStatus] = None,
    branch: Optional[str] = None,
    current_recruiter: Recruiter = Depends(require_active_recruiter),
    db: Session = Depends(get_db),
):
    """ATS Candidate Funnel. Returns paginated list of applicants with filters."""
    job = (
        db.query(Job)
        .filter(Job.id == job_id, Job.recruiter_id == current_recruiter.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    query = db.query(Application).filter(Application.job_id == job.id)

    if status:
        query = query.filter(Application.status == status)

    if branch:
        query = query.join(Student).filter(Student.branch.ilike(f"%{branch}%"))

    total = query.count()
    offset = (page - 1) * limit
    applications = query.order_by(Application.applied_at.desc()).offset(offset).limit(limit).all()
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    items = []
    for app in applications:
        student_res = StudentResponse.model_validate(app.student)
        items.append(
            ApplicationResponse(
                id=app.id,
                student_id=app.student_id,
                job_id=app.job_id,
                status=app.status,
                interview_round=app.interview_round,
                interview_scheduled_at=app.interview_scheduled_at,
                interview_meeting_link=app.interview_meeting_link,
                interview_notes=app.interview_notes,
                applied_at=app.applied_at,
                updated_at=app.updated_at,
                student=student_res,
                job_title=job.title,
                company_name=job.company_name,
            )
        )

    return PaginatedApplicationsResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=items,
    )


@router.post("/jobs/{job_id}/applications/{application_id}/schedule-interview", response_model=ApplicationResponse)
def schedule_candidate_interview(
    job_id: int,
    application_id: int,
    payload: ScheduleInterviewRequest,
    current_recruiter: Recruiter = Depends(require_active_recruiter),
    db: Session = Depends(get_db),
):
    """
    Schedules an interview for a candidate in the ATS funnel.
    Moves status to SHORTLISTED, records meeting details, and dispatches an alert to the candidate.
    """
    job = db.query(Job).filter(Job.id == job_id, Job.recruiter_id == current_recruiter.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    application = (
        db.query(Application)
        .filter(Application.id == application_id, Application.job_id == job.id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found for this job")

    application.interview_round = payload.interview_round
    application.interview_scheduled_at = payload.interview_scheduled_at
    application.interview_meeting_link = payload.interview_meeting_link
    application.interview_notes = payload.interview_notes
    application.status = ApplicationStatus.SHORTLISTED

    # Create internal notification for student
    meeting_info = f" Meeting link: {payload.interview_meeting_link}" if payload.interview_meeting_link else ""
    notif = Notification(
        student_id=application.student_id,
        job_id=job.id,
        title=f"Interview Scheduled: {job.title}",
        message=(
            f"You have been invited for '{payload.interview_round}' by {job.company_name} "
            f"on {payload.interview_scheduled_at.strftime('%Y-%m-%d %H:%M UTC')}.{meeting_info}"
        ),
    )
    db.add(notif)
    db.commit()
    db.refresh(application)

    # Dispatch email via AWS SES if candidate has email
    if application.student and application.student.email:
        email_body = f"""
        <h3>Interview Invitation from {job.company_name}</h3>
        <p>Dear {application.student.full_name},</p>
        <p>You have been shortlisted for an interview for the position <b>{job.title}</b>.</p>
        <ul>
            <li><b>Round:</b> {payload.interview_round}</li>
            <li><b>Date & Time:</b> {payload.interview_scheduled_at.strftime('%Y-%m-%d %H:%M UTC')}</li>
            <li><b>Meeting Link / Venue:</b> <a href="{payload.interview_meeting_link}">{payload.interview_meeting_link or 'TBA'}</a></li>
        </ul>
        <p>Best regards,<br/>{job.company_name} Placement Team</p>
        """
        send_email_via_ses(
            to_email=application.student.email,
            subject=f"Interview Scheduled: {job.title} at {job.company_name}",
            html_body=email_body,
        )

    student_res = StudentResponse.model_validate(application.student)
    return ApplicationResponse(
        id=application.id,
        student_id=application.student_id,
        job_id=application.job_id,
        status=application.status,
        interview_round=application.interview_round,
        interview_scheduled_at=application.interview_scheduled_at,
        interview_meeting_link=application.interview_meeting_link,
        interview_notes=application.interview_notes,
        applied_at=application.applied_at,
        updated_at=application.updated_at,
        student=student_res,
        job_title=job.title,
        company_name=job.company_name,
    )


@router.get("/jobs/{job_id}/export-csv")
def export_job_applications_csv(
    job_id: int,
    current_recruiter: Recruiter = Depends(require_active_recruiter),
    db: Session = Depends(get_db),
):
    """Exports all applicant records for this job in CSV format for offline reporting."""
    job = db.query(Job).filter(Job.id == job_id, Job.recruiter_id == current_recruiter.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    applications = db.query(Application).filter(Application.job_id == job.id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Application ID",
        "Student Name",
        "Roll Number",
        "Email",
        "CGPA",
        "Branch",
        "Graduation Year",
        "Status",
        "Resume URL",
        "Applied Date",
        "Interview Round",
        "Interview Date",
        "Meeting Link",
    ])

    for app in applications:
        student = app.student
        writer.writerow([
            app.id,
            student.full_name if student else "N/A",
            student.roll_number if student else "N/A",
            student.email if student else "N/A",
            student.cgpa if student else "N/A",
            student.branch if student else "N/A",
            student.graduation_year if student else "N/A",
            app.status.value,
            student.resume_url if student else "N/A",
            app.applied_at.strftime("%Y-%m-%d %H:%M"),
            app.interview_round or "N/A",
            app.interview_scheduled_at.strftime("%Y-%m-%d %H:%M") if app.interview_scheduled_at else "N/A",
            app.interview_meeting_link or "N/A",
        ])

    csv_data = output.getvalue()
    filename = f"applications_job_{job.id}_{job.company_name.replace(' ', '_')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/jobs/{job_id}/applications/batch-update")
def batch_update_application_status(
    job_id: int,
    payload: ApplicationBatchUpdateRequest,
    current_recruiter: Recruiter = Depends(require_active_recruiter),
    db: Session = Depends(get_db),
):
    """
    Batch Status Processing via ACID Database Transaction.
    Recruiters can update dozens of candidates simultaneously (e.g., Shortlist All).
    Guarantees atomic all-or-nothing execution: if any application ID is invalid or does
    not belong to this job posting, the whole transaction rolls back immediately.
    """
    job = (
        db.query(Job)
        .filter(Job.id == job_id, Job.recruiter_id == current_recruiter.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    target_ids = list(set(payload.application_ids))
    if not target_ids:
        raise HTTPException(status_code=400, detail="No application IDs provided")

    try:
        # Transaction Block
        existing_apps = (
            db.query(Application)
            .filter(Application.id.in_(target_ids), Application.job_id == job.id)
            .all()
        )

        found_ids = {app.id for app in existing_apps}
        missing_ids = set(target_ids) - found_ids

        if missing_ids:
            # Atomic rollback on invalid reference
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ACID Transaction Aborted: Application ID(s) {list(missing_ids)} do not exist or belong to another job.",
            )

        # Apply state transition across all validated rows
        for app in existing_apps:
            app.status = payload.status

        db.commit()

        return {
            "message": f"Successfully updated {len(existing_apps)} application(s) to '{payload.status.value}'.",
            "updated_count": len(existing_apps),
            "target_status": payload.status.value,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction error during batch update: {str(e)}"
        )
