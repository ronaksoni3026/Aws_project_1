from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, HttpUrl, Field, ConfigDict


class StudentProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    cgpa: Optional[float] = Field(None, ge=0.0, le=10.0, description="CGPA must be between 0.0 and 10.0")
    branch: Optional[str] = None
    graduation_year: Optional[int] = Field(None, ge=2000, le=2040)
    resume_url: Optional[HttpUrl] = Field(None, description="Rigorous external URL validation")


class StudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    roll_number: str
    cgpa: float
    branch: str
    graduation_year: int
    resume_url: Optional[str] = None
    created_at: datetime


class StudentAdminDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    roll_number: str
    cgpa: float
    branch: str
    graduation_year: int
    resume_url: Optional[str] = None
    created_at: datetime
    applications_count: int = 0


class PaginatedAdminStudentsResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    items: List[StudentAdminDetailResponse]
