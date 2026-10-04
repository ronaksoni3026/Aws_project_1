from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    admin_id: int
    admin_email: Optional[str] = None
    action: str
    target_entity: str
    target_id: int
    details: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class PaginatedAuditLogsResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    items: List[AuditLogResponse]


class AdminMetricsResponse(BaseModel):
    total_students: int
    total_recruiters: int
    pending_recruiters: int
    active_recruiters: int
    total_jobs: int
    active_jobs: int
    pending_jobs: int
    total_applications: int
    total_offered: int
    conversion_rate_percentage: float
