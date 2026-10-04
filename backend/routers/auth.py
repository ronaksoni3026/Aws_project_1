from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.config import settings
from backend.core.security import verify_password, get_password_hash, create_access_token, Role
from backend.core.dependencies import get_current_user
from backend.core.rate_limiter import limiter
from backend.models.student import Student
from backend.models.recruiter import Recruiter, RecruiterStatus
from backend.models.admin import Admin
from backend.schemas.auth import (
    StudentRegister,
    RecruiterRegister,
    LoginRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])


@router.post("/register/student", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_AUTH)
def register_student(request: Request, payload: StudentRegister, db: Session = Depends(get_db)):
    """
    Registers a new student applicant.
    Validates uniqueness of email and roll number within the isolated 'students' table.
    Issues a JWT with role claim 'STUDENT'.
    """
    if db.query(Student).filter(Student.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Student email is already registered")
    if db.query(Student).filter(Student.roll_number == payload.roll_number).first():
        raise HTTPException(status_code=400, detail="Roll number is already registered")

    student = Student(
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        full_name=payload.full_name,
        roll_number=payload.roll_number,
        cgpa=payload.cgpa,
        branch=payload.branch,
        graduation_year=payload.graduation_year,
        resume_url=str(payload.resume_url) if payload.resume_url else None,
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    token = create_access_token({"sub": str(student.id), "email": student.email, "role": Role.STUDENT.value})
    return TokenResponse(
        access_token=token,
        role=Role.STUDENT.value,
        user_id=student.id,
        email=student.email,
        name=student.full_name,
    )


@router.post("/register/recruiter", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_AUTH)
def register_recruiter(request: Request, payload: RecruiterRegister, db: Session = Depends(get_db)):
    """
    Registers a company recruiter.
    Recruiter account defaults strictly to PENDING state and requires admin approval.
    """
    if db.query(Recruiter).filter(Recruiter.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Recruiter email is already registered")

    recruiter = Recruiter(
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        company_name=payload.company_name,
        hr_name=payload.hr_name,
        status=RecruiterStatus.PENDING,
    )
    db.add(recruiter)
    db.commit()
    db.refresh(recruiter)

    token = create_access_token({
        "sub": str(recruiter.id),
        "email": recruiter.email,
        "role": Role.RECRUITER.value,
        "status": recruiter.status.value,
    })
    return TokenResponse(
        access_token=token,
        role=Role.RECRUITER.value,
        user_id=recruiter.id,
        email=recruiter.email,
        name=recruiter.company_name,
        status=recruiter.status.value,
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_AUTH)
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Role-aware authentication endpoint.
    Performs physical schema isolation by querying only the target role table.
    """
    user = None
    display_name = ""
    user_status = None

    if payload.role == Role.STUDENT:
        user = db.query(Student).filter(Student.email == payload.email).first()
        if user:
            display_name = user.full_name
    elif payload.role == Role.RECRUITER:
        user = db.query(Recruiter).filter(Recruiter.email == payload.email).first()
        if user:
            display_name = user.company_name
            user_status = user.status.value
    elif payload.role == Role.ADMIN:
        user = db.query(Admin).filter(Admin.email == payload.email).first()
        if user:
            display_name = user.full_name

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid credentials for {payload.role.value} account",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": payload.role.value,
    }
    if user_status:
        token_data["status"] = user_status

    token = create_access_token(token_data)
    return TokenResponse(
        access_token=token,
        role=payload.role.value,
        user_id=user.id,
        email=user.email,
        name=display_name,
        status=user_status,
    )


@router.get("/me")
def get_current_user_profile(current_user=Depends(get_current_user)):
    """Returns profile information for the authenticated identity."""
    role = getattr(current_user, "role")
    display_name = getattr(current_user, "full_name", getattr(current_user, "company_name", ""))
    status_val = getattr(current_user, "status", None)
    if hasattr(status_val, "value"):
        status_val = status_val.value

    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": role,
        "name": display_name,
        "status": status_val,
    }
