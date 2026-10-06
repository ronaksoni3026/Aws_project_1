import datetime
import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.database import Base


class ApplicationStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    UNDER_REVIEW = "UNDER_REVIEW"
    SHORTLISTED = "SHORTLISTED"
    OFFERED = "OFFERED"
    REJECTED = "REJECTED"


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(
        SAEnum(ApplicationStatus, native_enum=False),
        nullable=False,
        default=ApplicationStatus.APPLIED,
        index=True
    )

    # Interview Scheduling & ATS Pipeline Metadata
    interview_round = Column(String(100), nullable=True)  # e.g., "Round 1: Tech Interview", "Round 2: HR"
    interview_scheduled_at = Column(DateTime, nullable=True)
    interview_meeting_link = Column(String(1000), nullable=True)
    interview_notes = Column(Text, nullable=True)

    applied_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    student = relationship("Student", back_populates="applications")
    job = relationship("Job", back_populates="applications")

    # Compound Indexes and Constraints
    __table_args__ = (
        Index("idx_job_status", "job_id", "status"),
        UniqueConstraint("student_id", "job_id", name="uq_student_job_application"),
    )
