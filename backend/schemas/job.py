from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from backend.models.job import JobStatus


class JobCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    min_cgpa: float = Field(0.0, ge=0.0, le=10.0)
    allowed_branches: List[str] = Field(default_factory=list, description="Target academic departments")
    allowed_graduation_years: List[int] = Field(default_factory=list, description="Target graduating batches")


class JobUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    min_cgpa: Optional[float] = Field(None, ge=0.0, le=10.0)
    allowed_branches: Optional[List[str]] = None
    allowed_graduation_years: Optional[List[int]] = None


class JobFeedbackRequest(BaseModel):
    admin_feedback: str = Field(..., min_length=3, description="Mandatory feedback explaining necessary corrections")


class JobResponse(BaseModel):
    id: int
    recruiter_id: int
    title: str
    description: str
    company_name: str
    min_cgpa: float
    allowed_branches: List[str]
    allowed_graduation_years: List[int]
    status: JobStatus
    admin_feedback: Optional[str] = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JobWithEligibilityResponse(JobResponse):
    is_eligible: bool
    reasons: List[str] = Field(default_factory=list)
