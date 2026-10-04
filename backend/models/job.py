import datetime
import enum
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Enum as SAEnum, JSON
from sqlalchemy.orm import relationship
from backend.database import Base


class JobStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    ACTIVE = "ACTIVE"
    REQUIRES_CHANGES = "REQUIRES_CHANGES"
    CLOSED = "CLOSED"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("recruiters.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    company_name = Column(String(255), nullable=False)

    # Server-Side Eligibility Constraints
    min_cgpa = Column(Float, nullable=False, default=0.0)
    allowed_branches = Column(JSON, nullable=False, default=list)  # List of string branches e.g. ["CSE", "ECE"]
    allowed_graduation_years = Column(JSON, nullable=False, default=list)  # List of ints e.g. [2025, 2026]

    # State Machine & Admin Feedback
    status = Column(
        SAEnum(JobStatus, native_enum=False),
        nullable=False,
        default=JobStatus.DRAFT,
        index=True
    )
    admin_feedback = Column(Text, nullable=True)

    # Soft Deletion
    is_deleted = Column(Boolean, nullable=False, default=False, index=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    recruiter = relationship("Recruiter", back_populates="jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")
