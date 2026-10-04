from datetime import datetime
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
