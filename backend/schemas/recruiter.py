from datetime import datetime
from typing import List
from pydantic import BaseModel, ConfigDict
from backend.models.recruiter import RecruiterStatus


class RecruiterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    company_name: str
    hr_name: str
    status: RecruiterStatus
    created_at: datetime


class RecruiterAdminDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    company_name: str
    hr_name: str
    status: RecruiterStatus
    created_at: datetime
    jobs_count: int = 0


class PaginatedAdminRecruitersResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    items: List[RecruiterAdminDetailResponse]
