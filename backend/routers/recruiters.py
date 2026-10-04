from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.core.security import Role
from backend.core.dependencies import require_role, require_active_recruiter
from backend.core.tasks import notify_students_on_job_deletion
from backend.models.recruiter import Recruiter
from backend.models.job import Job, JobStatus
from backend.models.application import Application, ApplicationStatus
from backend.models.student import Student
from backend.schemas.recruiter import RecruiterResponse
from backend.schemas.job import JobCreate, JobUpdate, JobResponse
from backend.schemas.application import (
    ApplicationBatchUpdateRequest,
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
    State Transition: DRAFT or REQUIRES_CHANGES -> PENDING_APPROVAL.
    Submits job to Placement Cell Admin queue for vetting.
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
            detail=f"Invalid transition: Cannot submit job in status '{job.status.value}' for approval."
        )

    job.status = JobStatus.PENDING_APPROVAL
    db.commit()
    db.refresh(job)
    return job


@router.post("/jobs/{job_id}/close", response_model=JobResponse)
def close_job(
    job_id: int,
    current_recruiter: Recruiter = Depends(require_active_recruiter),
    db: Session = Depends(get_db),
):
    """
    State Transition: ACTIVE -> CLOSED.
    Closes the recruitment pipeline for this position.
    """
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
            detail=f"Only ACTIVE jobs can be closed. Current status is '{job.status.value}'."
        )

    job.status = JobStatus.CLOSED
    db.commit()
    db.refresh(job)
    return job


@router.delete("/jobs/{job_id}")
def delete_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    current_recruiter: Recruiter = Depends(require_active_recruiter),
    db: Session = Depends(get_db),
):
    """
    Soft Deletion & Automated Background Alerts.
    Sets is_deleted = True to preserve relational ATS records for reporting.
    Dispatches automated notification to all students in applicant pool via FastAPI BackgroundTasks.
    """
    job = (
        db.query(Job)
        .filter(Job.id == job_id, Job.recruiter_id == current_recruiter.id, Job.is_deleted == False)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found or already deleted")

    # Soft delete
    job.is_deleted = True
    db.commit()

    # Enqueue non-blocking background observer process
    background_tasks.add_task(
        notify_students_on_job_deletion,
        job.id,
        job.title,
        job.company_name,
    )

    return {
        "message": f"Job '{job.title}' archived successfully. Automated alerts enqueued asynchronously for applicant pool.",
        "job_id": job.id,
        "is_deleted": True,
    }


@router.get("/jobs/{job_id}/applications", response_model=PaginatedApplicationsResponse)
def get_job_applications(
    job_id: int,
    page: int = Query(1, ge=1, description="Page index"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[ApplicationStatus] = Query(None, description="Filter by funnel stage"),
    branch: Optional[str] = Query(None, description="Filter by student academic department"),
    current_recruiter: Recruiter = Depends(require_role(Role.RECRUITER)),
    db: Session = Depends(get_db),
):
    """
    Applicant Tracking System (ATS) Data Table.
    Implements offset pagination, status filtering, and branch filtering with explicit index support.
    """
    job = (
        db.query(Job)
        .filter(Job.id == job_id, Job.recruiter_id == current_recruiter.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    query = db.query(Application).join(Student).filter(Application.job_id == job.id)

    if status:
        query = query.filter(Application.status == status)
    if branch:
        query = query.filter(Student.branch.ilike(f"%{branch}%"))

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
