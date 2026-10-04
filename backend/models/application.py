import datetime
import enum
from sqlalchemy import Column, Integer, DateTime, ForeignKey, Enum as SAEnum, Index, UniqueConstraint
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
