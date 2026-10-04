from backend.schemas.auth import (
    StudentRegister,
    RecruiterRegister,
    LoginRequest,
    TokenResponse,
    UserResponse,
)
from backend.schemas.student import (
    StudentProfileUpdate,
    StudentResponse,
    StudentAdminDetailResponse,
    PaginatedAdminStudentsResponse,
)
from backend.schemas.recruiter import (
    RecruiterResponse,
    RecruiterAdminDetailResponse,
    PaginatedAdminRecruitersResponse,
)
from backend.schemas.job import (
    JobCreate,
    JobUpdate,
    JobFeedbackRequest,
    JobResponse,
    JobWithEligibilityResponse,
)
from backend.schemas.application import (
    ApplicationCreate,
    ApplicationBatchUpdateRequest,
    ApplicationResponse,
    PaginatedApplicationsResponse,
)
from backend.schemas.audit import (
    AuditLogResponse,
    PaginatedAuditLogsResponse,
    AdminMetricsResponse,
)
from backend.schemas.notification import NotificationResponse

__all__ = [
    "StudentRegister",
    "RecruiterRegister",
    "LoginRequest",
    "TokenResponse",
    "UserResponse",
    "StudentProfileUpdate",
    "StudentResponse",
    "StudentAdminDetailResponse",
    "PaginatedAdminStudentsResponse",
    "RecruiterResponse",
    "RecruiterAdminDetailResponse",
    "PaginatedAdminRecruitersResponse",
    "JobCreate",
    "JobUpdate",
    "JobFeedbackRequest",
    "JobResponse",
    "JobWithEligibilityResponse",
    "ApplicationCreate",
    "ApplicationBatchUpdateRequest",
    "ApplicationResponse",
    "PaginatedApplicationsResponse",
    "AuditLogResponse",
    "PaginatedAuditLogsResponse",
    "AdminMetricsResponse",
    "NotificationResponse",
]
