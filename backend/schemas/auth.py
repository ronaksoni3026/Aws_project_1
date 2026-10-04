from typing import Optional
from pydantic import BaseModel, EmailStr
from backend.core.security import Role


class StudentRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    roll_number: str
    cgpa: float = 0.0
    branch: str = ""
    graduation_year: int = 2026
    resume_url: Optional[str] = None


class RecruiterRegister(BaseModel):
    email: EmailStr
    password: str
    company_name: str
    hr_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Role


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    email: str
    name: str
    status: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    status: Optional[str] = None

    class Config:
        from_attributes = True
