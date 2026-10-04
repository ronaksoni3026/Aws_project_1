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
    """Creates all database tables and ensures initial Placement Cell Admin, demo recruiter, and students exist."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Placement Cell Admin
        admin_email = "admin@placement.edu"
        admin = db.query(Admin).filter(Admin.email == admin_email).first()
        if not admin:
            admin = Admin(
                email=admin_email,
                password_hash=get_password_hash("Admin@1234"),
                full_name="Placement Cell Director",
            )
            db.add(admin)
            print(f"[Seed] Created default Admin: {admin_email} / Admin@1234")

        # 2. Demo Partner Recruiter
        recruiter_email = "recruiter@placement.edu"
        recruiter = db.query(Recruiter).filter(Recruiter.email == recruiter_email).first()
        if not recruiter:
            recruiter = Recruiter(
                email=recruiter_email,
                password_hash=get_password_hash("Recruiter@1234"),
                company_name="Amazon Web Services",
                hr_name="Priya Sharma",
                status=RecruiterStatus.ACTIVE,
            )
            db.add(recruiter)
            print(f"[Seed] Created demo Recruiter: {recruiter_email} / Recruiter@1234")

        # 3. Demo Students
        demo_students = [
            {
                "email": "student@placement.edu",
                "full_name": "Ronak Soni",
                "roll_number": "21CS001",
                "cgpa": 9.20,
                "branch": "CSE",
                "graduation_year": 2025,
                "resume_url": "https://example.com/resumes/ronak_soni.pdf",
            },
            {
                "email": "ananya.patel@placement.edu",
                "full_name": "Ananya Patel",
                "roll_number": "21EC042",
                "cgpa": 8.45,
                "branch": "ECE",
                "graduation_year": 2025,
                "resume_url": "https://example.com/resumes/ananya_patel.pdf",
            },
            {
                "email": "devendra.verma@placement.edu",
                "full_name": "Devendra Verma",
                "roll_number": "21IT019",
                "cgpa": 7.80,
                "branch": "IT",
                "graduation_year": 2026,
                "resume_url": "https://example.com/resumes/devendra_verma.pdf",
            },
        ]
        for s_data in demo_students:
            exists = db.query(Student).filter(Student.email == s_data["email"]).first()
            if not exists:
                student = Student(
                    email=s_data["email"],
                    password_hash=get_password_hash("Student@1234"),
                    full_name=s_data["full_name"],
                    roll_number=s_data["roll_number"],
                    cgpa=s_data["cgpa"],
                    branch=s_data["branch"],
                    graduation_year=s_data["graduation_year"],
                    resume_url=s_data["resume_url"],
                )
                db.add(student)
                print(f"[Seed] Created student: {s_data['full_name']} ({s_data['roll_number']})")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
