from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from backend.models.application import ApplicationStatus
from backend.schemas.student import StudentResponse


class ApplicationCreate(BaseModel):
    job_id: int


class ApplicationBatchUpdateRequest(BaseModel):
    application_ids: List[int] = Field(..., min_length=1, description="List of target application IDs for atomic update")
    status: ApplicationStatus = Field(..., description="Target funnel stage (Applied -> Under Review -> Shortlisted -> Offered/Rejected)")


class ScheduleInterviewRequest(BaseModel):
    interview_round: str = Field(..., min_length=2, max_length=100, description="Round name (e.g. Technical Round 1)")
    interview_scheduled_at: datetime = Field(..., description="Date and time of the interview")
    interview_meeting_link: Optional[str] = Field(None, max_length=1000, description="Meeting URL or venue")
    interview_notes: Optional[str] = Field(None, description="Instructions or topics for candidate preparation")


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    job_id: int
    status: ApplicationStatus
    interview_round: Optional[str] = None
    interview_scheduled_at: Optional[datetime] = None
    interview_meeting_link: Optional[str] = None
    interview_notes: Optional[str] = None
    applied_at: datetime
    updated_at: datetime
    student: Optional[StudentResponse] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None


class PaginatedApplicationsResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    items: List[ApplicationResponse]
