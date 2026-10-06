from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from backend.models.job import JobStatus


class JobCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    ctc_lpa: Optional[float] = Field(0.0, ge=0.0, description="Annual package in LPA")
    job_location: Optional[str] = Field("Bengaluru / Hybrid", max_length=255)
    job_type: Optional[str] = Field("Full-Time", max_length=100)
    deadline: Optional[datetime] = None
    min_cgpa: float = Field(0.0, ge=0.0, le=10.0)
    allowed_branches: List[str] = Field(default_factory=list, description="Target academic departments")
    allowed_graduation_years: List[int] = Field(default_factory=list, description="Target graduating batches")


class JobUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    ctc_lpa: Optional[float] = Field(None, ge=0.0)
    job_location: Optional[str] = Field(None, max_length=255)
    job_type: Optional[str] = Field(None, max_length=100)
    deadline: Optional[datetime] = None
    min_cgpa: Optional[float] = Field(None, ge=0.0, le=10.0)
    allowed_branches: Optional[List[str]] = None
    allowed_graduation_years: Optional[List[int]] = None


class JobFeedbackRequest(BaseModel):
    admin_feedback: str = Field(..., min_length=3, description="Mandatory feedback explaining necessary corrections")


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recruiter_id: int
    title: str
    description: str
    company_name: str
    ctc_lpa: float = 0.0
    job_location: str = "Bengaluru / Hybrid"
    job_type: str = "Full-Time"
    deadline: Optional[datetime] = None
    min_cgpa: float
    allowed_branches: List[str]
    allowed_graduation_years: List[int]
    status: JobStatus
    admin_feedback: Optional[str] = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class JobWithEligibilityResponse(JobResponse):
    is_eligible: bool
    reasons: List[str] = Field(default_factory=list)
