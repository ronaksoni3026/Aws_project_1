from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.core.security import decode_access_token, Role
from backend.models.student import Student
from backend.models.recruiter import Recruiter, RecruiterStatus
from backend.models.admin import Admin

security_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
):
    """
    Extracts Bearer token, decodes JWT claims, and fetches the corresponding
    actor from their isolated PostgreSQL/SQLite entity table.
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    role = payload.get("role")

    if not user_id or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing essential identity or role claims",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch from isolated entity tables based on role claim
    user = None
    if role == Role.STUDENT.value:
        user = db.query(Student).filter(Student.id == int(user_id)).first()
    elif role == Role.RECRUITER.value:
        user = db.query(Recruiter).filter(Recruiter.id == int(user_id)).first()
    elif role == Role.ADMIN.value:
        user = db.query(Admin).filter(Admin.id == int(user_id)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User identity not found in corresponding entity registry",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Attach role to the user object dynamically for downstream inspection
    setattr(user, "role", role)
    return user


def require_role(required_role: Role):
    """
    Dependency factory that restricts endpoint access to a specific role.
    Raises HTTP 403 Forbidden if the role claim does not match.
    """
    def role_checker(current_user=Depends(get_current_user)):
        if getattr(current_user, "role", None) != required_role.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Requires role '{required_role.value}'"
            )
        return current_user

    return role_checker


def require_active_recruiter(current_user=Depends(require_role(Role.RECRUITER))):
    """
    Dependency that enforces the Admin-Gated Onboarding Workflow.
    Recruiter accounts in PENDING state hit HTTP 403 Forbidden.
    """
    if current_user.status == RecruiterStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account pending administrator verification. Job creation and management are locked."
        )
    if current_user.status == RecruiterStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recruiter account has been rejected by placement cell administration."
        )
    return current_user
