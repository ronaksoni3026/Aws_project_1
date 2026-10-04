from datetime import datetime
from pydantic import BaseModel
from backend.models.recruiter import RecruiterStatus


class RecruiterResponse(BaseModel):
    id: int
    email: str
    company_name: str
    hr_name: str
    status: RecruiterStatus
    created_at: datetime

    class Config:
        from_attributes = True
