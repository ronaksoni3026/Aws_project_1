import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("admins.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)  # e.g. APPROVE_RECRUITER, REJECT_RECRUITER, APPROVE_JOB, REQUEST_JOB_CHANGES
    target_entity = Column(String(50), nullable=False)        # e.g. RECRUITER, JOB
    target_id = Column(Integer, nullable=False)
    details = Column(Text, nullable=True)                     # JSON string or descriptive explanation
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    # Relationship
    admin = relationship("Admin", back_populates="audit_logs")

    __table_args__ = (
        Index("idx_audit_admin_time", "admin_id", "timestamp"),
    )
