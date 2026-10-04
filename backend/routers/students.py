from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.config import settings
from backend.core.security import Role
from backend.core.dependencies import require_role
from backend.core.eligibility import evaluate_eligibility
from backend.core.rate_limiter import limiter
from backend.models.student import Student
from backend.models.job import Job, JobStatus
from backend.models.application import Application, ApplicationStatus
from backend.models.notification import Notification
from backend.schemas.student import StudentProfileUpdate, StudentResponse
from backend.schemas.job import JobWithEligibilityResponse
from backend.schemas.application import ApplicationResponse
from backend.schemas.notification import NotificationResponse

router = APIRouter(prefix="/student", tags=["Student Applicant Portal"])


@router.get("/profile", response_model=StudentResponse)
def get_student_profile(
    current_student: Student = Depends(require_role(Role.STUDENT)),
):
    """Fetches the live academic and contact profile of the authenticated student."""
    return current_student


@router.put("/profile", response_model=StudentResponse)
def update_student_profile(
    payload: StudentProfileUpdate,
    current_student: Student = Depends(require_role(Role.STUDENT)),
    db: Session = Depends(get_db),
):
    """
    Updates student academic metrics.
    Resume URL is strictly validated using Pydantic HttpUrl to prevent malicious script injection.
    """
    if payload.full_name is not None:
        current_student.full_name = payload.full_name
    if payload.cgpa is not None:
        current_student.cgpa = payload.cgpa
    if payload.branch is not None:
        current_student.branch = payload.branch
    if payload.graduation_year is not None:
        current_student.graduation_year = payload.graduation_year
    if payload.resume_url is not None:
        current_student.resume_url = str(payload.resume_url)

    db.commit()
    db.refresh(current_student)
    return current_student


@router.get("/jobs", response_model=List[JobWithEligibilityResponse])
def get_jobs_for_student(
    current_student: Student = Depends(require_role(Role.STUDENT)),
    db: Session = Depends(get_db),
):
    """
    Smart Job Board for Students.
    Retrieves all active, non-deleted job postings.
    Annotates each job with server-side computed eligibility ('is_eligible' and 'reasons')
    so the frontend can display clear status badges and tooltips.
    """
    active_jobs = (
        db.query(Job)
        .filter(Job.status == JobStatus.ACTIVE, Job.is_deleted == False)
        .order_by(Job.created_at.desc())
        .all()
    )

    result = []
    for job in active_jobs:
        is_eligible, reasons = evaluate_eligibility(current_student, job)
        result.append(
            JobWithEligibilityResponse(
                id=job.id,
                recruiter_id=job.recruiter_id,
                title=job.title,
                description=job.description,
                company_name=job.company_name,
                min_cgpa=job.min_cgpa,
                allowed_branches=job.allowed_branches or [],
                allowed_graduation_years=job.allowed_graduation_years or [],
                status=job.status,
                admin_feedback=job.admin_feedback,
                is_deleted=job.is_deleted,
                created_at=job.created_at,
                updated_at=job.updated_at,
                is_eligible=is_eligible,
                reasons=reasons,
            )
        )
    return result


@router.post("/jobs/{job_id}/apply", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_APPLY)
def apply_for_job(
    request: Request,
    job_id: int,
    current_student: Student = Depends(require_role(Role.STUDENT)),
    db: Session = Depends(get_db),
):
    """
    Centralized Server-Side Eligibility Engine Gatekeeper.
    Intercepts the application attempt and compares live student metrics with job constraints.
    If ineligible, BLOCKS persistence and returns HTTP 422 with structured failure criteria.
    """
    job = (
        db.query(Job)
        .filter(Job.id == job_id, Job.status == JobStatus.ACTIVE, Job.is_deleted == False)
        .first()
    )
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting is not active, has been closed, or does not exist."
        )

    # Check for existing application (enforcing idempotent / unique constraint)
    existing_application = (
        db.query(Application)
        .filter(Application.student_id == current_student.id, Application.job_id == job.id)
        .first()
    )
    if existing_application:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted an application for this position."
        )

    # Server-Side Gating Interception
    is_eligible, reasons = evaluate_eligibility(current_student, job)
    if not is_eligible:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Eligibility criteria not met. Application rejected by server gatekeeper.",
                "eligible": False,
                "reasons": reasons,
            },
        )

    # Persist application in linear macro-funnel (Applied)
    application = Application(
        student_id=current_student.id,
        job_id=job.id,
        status=ApplicationStatus.APPLIED,
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    return ApplicationResponse(
        id=application.id,
        student_id=application.student_id,
        job_id=application.job_id,
        status=application.status,
        applied_at=application.applied_at,
        updated_at=application.updated_at,
        job_title=job.title,
        company_name=job.company_name,
    )


@router.get("/applications", response_model=List[ApplicationResponse])
def get_my_applications(
    current_student: Student = Depends(require_role(Role.STUDENT)),
    db: Session = Depends(get_db),
):
    """
    Student Application Tracker.
    Lists all submissions and their progress across the macro-funnel:
    Applied -> Under Review -> Shortlisted -> Offered / Rejected.
    """
    applications = (
        db.query(Application)
        .filter(Application.student_id == current_student.id)
        .order_by(Application.applied_at.desc())
        .all()
    )

    results = []
    for app in applications:
        job = db.query(Job).filter(Job.id == app.job_id).first()
        results.append(
            ApplicationResponse(
                id=app.id,
                student_id=app.student_id,
                job_id=app.job_id,
                status=app.status,
                applied_at=app.applied_at,
                updated_at=app.updated_at,
                job_title=job.title if job else "Archived Position",
                company_name=job.company_name if job else "N/A",
            )
        )
    return results


@router.get("/notifications", response_model=List[NotificationResponse])
def get_student_notifications(
    current_student: Student = Depends(require_role(Role.STUDENT)),
    db: Session = Depends(get_db),
):
    """Retrieves asynchronous alerts dispatched to the student (e.g. from background tasks)."""
    notifications = (
        db.query(Notification)
        .filter(Notification.student_id == current_student.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return notifications


@router.post("/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    current_student: Student = Depends(require_role(Role.STUDENT)),
    db: Session = Depends(get_db),
):
    """Marks a notification as read."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.student_id == current_student.id)
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}
