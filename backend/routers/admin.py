import io
import csv
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from backend.database import get_db
from backend.core.security import Role
from backend.core.dependencies import require_role
from backend.models.admin import Admin
from backend.models.student import Student
from backend.models.recruiter import Recruiter, RecruiterStatus
from backend.models.job import Job, JobStatus
from backend.models.application import Application, ApplicationStatus
from backend.models.audit_log import AuditLog
from backend.schemas.recruiter import (
    RecruiterResponse,
    RecruiterAdminDetailResponse,
    PaginatedAdminRecruitersResponse,
)
from backend.schemas.job import JobResponse, JobFeedbackRequest
from backend.schemas.audit import (
    AuditLogResponse,
    PaginatedAuditLogsResponse,
    AdminMetricsResponse,
)
from backend.schemas.student import (
    StudentAdminDetailResponse,
    PaginatedAdminStudentsResponse,
)

router = APIRouter(prefix="/admin", tags=["Placement Cell Administration"])


@router.get("/recruiters/pending", response_model=List[RecruiterResponse])
def get_pending_recruiters(
    current_admin: Admin = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    """Admin Staging Queue: Lists newly registered recruiters awaiting verification."""
    recruiters = (
        db.query(Recruiter)
        .filter(Recruiter.status == RecruiterStatus.PENDING)
        .order_by(Recruiter.created_at.asc())
        .all()
    )
    return recruiters


@router.post("/recruiters/{recruiter_id}/approve", response_model=RecruiterResponse)
def approve_recruiter(
    recruiter_id: int,
    current_admin: Admin = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Approves recruiter onboarding.
    Transitions recruiter status to ACTIVE and atomically records an immutable audit log.
    """
    recruiter = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter not found")

    recruiter.status = RecruiterStatus.ACTIVE

    # Application-Level Audit Logging within the exact same database transaction
    audit_entry = AuditLog(
        admin_id=current_admin.id,
        action="APPROVE_RECRUITER",
        target_entity="RECRUITER",
        target_id=recruiter.id,
        details=f"Approved recruiter account for '{recruiter.company_name}' (HR: {recruiter.hr_name})",
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(recruiter)
    return recruiter


@router.post("/recruiters/{recruiter_id}/reject", response_model=RecruiterResponse)
def reject_recruiter(
    recruiter_id: int,
    current_admin: Admin = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Rejects recruiter onboarding.
    Transitions recruiter status to REJECTED and atomically records an immutable audit log.
    """
    recruiter = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter not found")

    recruiter.status = RecruiterStatus.REJECTED

    # Audit Logging
    audit_entry = AuditLog(
        admin_id=current_admin.id,
        action="REJECT_RECRUITER",
        target_entity="RECRUITER",
        target_id=recruiter.id,
        details=f"Rejected recruiter account for '{recruiter.company_name}' (HR: {recruiter.hr_name})",
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(recruiter)
    return recruiter


@router.get("/jobs/pending", response_model=List[JobResponse])
def get_pending_jobs(
    current_admin: Admin = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    """Admin Job Vetting Queue: Lists jobs submitted for administrative review."""
    jobs = (
        db.query(Job)
        .filter(Job.status == JobStatus.PENDING_APPROVAL, Job.is_deleted == False)
        .order_by(Job.updated_at.asc())
        .all()
    )
    return jobs


@router.post("/jobs/{job_id}/approve", response_model=JobResponse)
def approve_job_posting(
    job_id: int,
    current_admin: Admin = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Approves a job posting.
    State Transition: PENDING_APPROVAL -> ACTIVE.
    Clears any prior feedback and records audit trail.
    """
    job = db.query(Job).filter(Job.id == job_id, Job.is_deleted == False).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    if job.status != JobStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve job in status '{job.status.value}'. Must be PENDING_APPROVAL."
        )

    job.status = JobStatus.ACTIVE
    job.admin_feedback = None

    # Application-Level Audit Logging
    audit_entry = AuditLog(
        admin_id=current_admin.id,
        action="APPROVE_JOB",
        target_entity="JOB",
        target_id=job.id,
        details=f"Approved job post '{job.title}' by '{job.company_name}' for live student discovery.",
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(job)
    return job


@router.post("/jobs/{job_id}/request-changes", response_model=JobResponse)
def request_changes_on_job(
    job_id: int,
    payload: JobFeedbackRequest,
    current_admin: Admin = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Feedback Loop: Rejects job draft with required modifications.
    State Transition: PENDING_APPROVAL -> REQUIRES_CHANGES.
    Appends mandatory admin_feedback allowing the recruiter to correct and resubmit without starting over.
    """
    job = db.query(Job).filter(Job.id == job_id, Job.is_deleted == False).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    if job.status != JobStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot request changes on job in status '{job.status.value}'. Must be PENDING_APPROVAL."
        )

    job.status = JobStatus.REQUIRES_CHANGES
    job.admin_feedback = payload.admin_feedback

    # Application-Level Audit Logging
    audit_entry = AuditLog(
        admin_id=current_admin.id,
        action="REQUEST_JOB_CHANGES",
        target_entity="JOB",
        target_id=job.id,
        details=f"Requested changes for '{job.title}': {payload.admin_feedback}",
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(job)
    return job


@router.get("/students", response_model=PaginatedAdminStudentsResponse)
def get_all_students(
    page: int = Query(1, ge=1, description="Page index"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name, roll number, or email"),
    branch: Optional[str] = Query(None, description="Filter by student department / branch"),
    min_cgpa: Optional[float] = Query(None, description="Filter by minimum CGPA"),
    current_admin: Admin = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Admin Student Directory.
    Enables administrators to inspect full student applicant metrics (CGPA, Branch, Resume, Applications count).
    """
    query = db.query(Student)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Student.full_name.ilike(search_fmt),
                Student.roll_number.ilike(search_fmt),
                Student.email.ilike(search_fmt),
            )
        )

    if branch:
        query = query.filter(Student.branch.ilike(f"%{branch.strip()}%"))

    if min_cgpa is not None:
        query = query.filter(Student.cgpa >= min_cgpa)

    total = query.count()
    offset = (page - 1) * limit
    students = query.order_by(Student.cgpa.desc(), Student.roll_number.asc()).offset(offset).limit(limit).all()

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    items = []
    for s in students:
        apps_count = db.query(func.count(Application.id)).filter(Application.student_id == s.id).scalar() or 0
        items.append(
            StudentAdminDetailResponse(
                id=s.id,
                email=s.email,
                full_name=s.full_name,
                roll_number=s.roll_number,
                cgpa=s.cgpa,
                branch=s.branch,
                graduation_year=s.graduation_year,
                resume_url=s.resume_url,
                created_at=s.created_at,
                applications_count=apps_count,
            )
        )

    return PaginatedAdminStudentsResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=items,
    )


@router.get("/recruiters", response_model=PaginatedAdminRecruitersResponse)
def get_all_recruiters(
    page: int = Query(1, ge=1, description="Page index"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[RecruiterStatus] = Query(None, description="Filter by status (PENDING, ACTIVE, REJECTED)"),
    search: Optional[str] = Query(None, description="Search company or HR name"),
    current_admin: Admin = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Admin Recruiter Directory.
    Enables administrators to inspect all registered partner companies and their activity.
    """
    query = db.query(Recruiter)

    if status:
        query = query.filter(Recruiter.status == status)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Recruiter.company_name.ilike(search_fmt),
                Recruiter.hr_name.ilike(search_fmt),
                Recruiter.email.ilike(search_fmt),
            )
        )

    total = query.count()
    offset = (page - 1) * limit
    recruiters = query.order_by(Recruiter.created_at.desc()).offset(offset).limit(limit).all()

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    items = []
    for r in recruiters:
        jobs_count = (
            db.query(func.count(Job.id))
            .filter(Job.recruiter_id == r.id, Job.is_deleted == False)
            .scalar()
            or 0
        )
        items.append(
            RecruiterAdminDetailResponse(
                id=r.id,
                email=r.email,
                company_name=r.company_name,
                hr_name=r.hr_name,
                status=r.status,
                created_at=r.created_at,
                jobs_count=jobs_count,
            )
        )

    return PaginatedAdminRecruitersResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=items,
    )


@router.get("/audit-logs", response_model=PaginatedAuditLogsResponse)
def get_audit_trail(
    page: int = Query(1, ge=1, description="Page index"),
    limit: int = Query(25, ge=1, le=100, description="Items per page"),
    current_admin: Admin = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Immutable Administrative Audit Trail.
    Enforces strict pagination limits and query optimization.
    """
    query = db.query(AuditLog).join(Admin)
    total = query.count()
    offset = (page - 1) * limit
    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    items = [
        AuditLogResponse(
            id=log.id,
            admin_id=log.admin_id,
            admin_email=log.admin.email if log.admin else "Unknown",
            action=log.action,
            target_entity=log.target_entity,
            target_id=log.target_id,
            details=log.details,
            timestamp=log.timestamp,
        )
        for log in logs
    ]

    return PaginatedAuditLogsResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=items,
    )


@router.get("/metrics", response_model=AdminMetricsResponse)
def get_placement_portal_metrics(
    current_admin: Admin = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Global Placement Dashboard & Query Limits.
    Provides live platform KPIs: student signups, recruiter funnels, job statuses,
    total applications, and system conversion rates.
    """
    total_students = db.query(func.count(Student.id)).scalar() or 0

    total_recruiters = db.query(func.count(Recruiter.id)).scalar() or 0
    pending_recruiters = db.query(func.count(Recruiter.id)).filter(Recruiter.status == RecruiterStatus.PENDING).scalar() or 0
    active_recruiters = db.query(func.count(Recruiter.id)).filter(Recruiter.status == RecruiterStatus.ACTIVE).scalar() or 0

    total_jobs = db.query(func.count(Job.id)).filter(Job.is_deleted == False).scalar() or 0
    active_jobs = db.query(func.count(Job.id)).filter(Job.status == JobStatus.ACTIVE, Job.is_deleted == False).scalar() or 0
    pending_jobs = db.query(func.count(Job.id)).filter(Job.status == JobStatus.PENDING_APPROVAL, Job.is_deleted == False).scalar() or 0

    total_applications = db.query(func.count(Application.id)).scalar() or 0
    total_offered = db.query(func.count(Application.id)).filter(Application.status == ApplicationStatus.OFFERED).scalar() or 0

    conversion_rate = 0.0
    if total_applications > 0:
        conversion_rate = round((total_offered / total_applications) * 100.0, 2)

    return AdminMetricsResponse(
        total_students=total_students,
        total_recruiters=total_recruiters,
        pending_recruiters=pending_recruiters,
        active_recruiters=active_recruiters,
        total_jobs=total_jobs,
        active_jobs=active_jobs,
        pending_jobs=pending_jobs,
        total_applications=total_applications,
        total_offered=total_offered,
        conversion_rate_percentage=conversion_rate,
    )


@router.get("/export/students-csv")
def export_students_directory_csv(
    current_admin: Admin = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    """Exports all registered student profiles into CSV for administrative records."""
    students = db.query(Student).order_by(Student.roll_number.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Student ID",
        "Roll Number",
        "Full Name",
        "Email",
        "CGPA",
        "Department / Branch",
        "Graduation Year",
        "Resume URL",
        "Registered Date",
    ])

    for s in students:
        writer.writerow([
            s.id,
            s.roll_number,
            s.full_name,
            s.email,
            s.cgpa,
            s.branch,
            s.graduation_year,
            s.resume_url or "N/A",
            s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else "N/A",
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="institutional_student_directory.csv"'},
    )


@router.get("/export/placements-csv")
def export_placements_report_csv(
    current_admin: Admin = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    """Exports all successfully placed / offered students into a CSV placement report."""
    offered_apps = (
        db.query(Application)
        .filter(Application.status == ApplicationStatus.OFFERED)
        .order_by(Application.updated_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Application ID",
        "Student Name",
        "Roll Number",
        "Student Email",
        "Department / Branch",
        "CGPA",
        "Company Name",
        "Job Title",
        "Package (LPA)",
        "Job Location",
        "Offer Date",
    ])

    for app in offered_apps:
        s = app.student
        j = app.job
        writer.writerow([
            app.id,
            s.full_name if s else "N/A",
            s.roll_number if s else "N/A",
            s.email if s else "N/A",
            s.branch if s else "N/A",
            s.cgpa if s else "N/A",
            j.company_name if j else "N/A",
            j.title if j else "N/A",
            j.ctc_lpa if j and j.ctc_lpa else "N/A",
            j.job_location if j and j.job_location else "N/A",
            app.updated_at.strftime("%Y-%m-%d %H:%M") if app.updated_at else "N/A",
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="institutional_placements_report.csv"'},
    )
