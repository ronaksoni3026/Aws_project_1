from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from backend.models.application import ApplicationStatus
from backend.schemas.student import StudentResponse


class ApplicationCreate(BaseModel):
    job_id: int


class ApplicationBatchUpdateRequest(BaseModel):
    application_ids: List[int] = Field(..., min_length=1, description="List of target application IDs for atomic update")
    status: ApplicationStatus = Field(..., description="Target funnel stage (Applied -> Under Review -> Shortlisted -> Offered/Rejected)")


class ApplicationResponse(BaseModel):
    id: int
    student_id: int
    job_id: int
    status: ApplicationStatus
    applied_at: datetime
    updated_at: datetime
    student: Optional[StudentResponse] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None

    class Config:
        from_attributes = True


class PaginatedApplicationsResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    items: List[ApplicationResponse]
