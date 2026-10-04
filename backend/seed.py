from backend.database import SessionLocal, engine, Base
from backend.models import (
    Student,
    Recruiter,
    RecruiterStatus,
    Admin,
    Job,
    JobStatus,
    Application,
    ApplicationStatus,
    AuditLog,
    Notification,
)
from backend.core.security import get_password_hash


def init_db():
    """Creates all database tables and ensures initial Placement Cell Admin exists."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin_email = "admin@placement.edu"
        admin = db.query(Admin).filter(Admin.email == admin_email).first()
        if not admin:
            admin = Admin(
                email=admin_email,
                password_hash=get_password_hash("Admin@1234"),
                full_name="Placement Cell Director",
            )
            db.add(admin)
            db.commit()
            print(f"[Seed] Created default Admin: {admin_email} / Admin@1234")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
