import datetime
import enum
from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from backend.database import Base


class RecruiterStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"


class Recruiter(Base):
    __tablename__ = "recruiters"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=False)
    hr_name = Column(String(255), nullable=False)
    status = Column(
        SAEnum(RecruiterStatus, native_enum=False),
        nullable=False,
        default=RecruiterStatus.PENDING,
        index=True
    )

    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    jobs = relationship("Job", back_populates="recruiter", cascade="all, delete-orphan")
