import datetime
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
    """Creates all database tables and ensures initial Placement Cell Admin, demo recruiter, students, and demo jobs exist."""
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
            db.flush()
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
                db.flush()
                print(f"[Seed] Created student: {s_data['full_name']} ({s_data['roll_number']})")

        # 4. Demo Jobs & Applications
        sample_job = db.query(Job).filter(Job.title == "Cloud Solutions Engineer (AWS)").first()
        if not sample_job and recruiter:
            sample_job = Job(
                recruiter_id=recruiter.id,
                title="Cloud Solutions Engineer (AWS)",
                description="Design, deploy, and optimize scalable cloud infrastructure across AWS ECS, RDS, and S3. Requirements include proficiency in Python, Linux, and distributed cloud systems.",
                company_name="Amazon Web Services",
                ctc_lpa=18.5,
                job_location="Bengaluru / Hybrid",
                job_type="Full-Time",
                min_cgpa=7.50,
                allowed_branches=["CSE", "ECE", "IT"],
                allowed_graduation_years=[2025, 2026],
                status=JobStatus.ACTIVE,
                is_deleted=False,
            )
            db.add(sample_job)
            db.commit()
            db.refresh(sample_job)
            print(f"[Seed] Created demo Job: {sample_job.title} (₹{sample_job.ctc_lpa} LPA)")

        # Link Ronak Soni to sample job as shortlisted with interview scheduled
        ronak = db.query(Student).filter(Student.email == "student@placement.edu").first()
        if ronak and sample_job:
            app_exists = db.query(Application).filter(Application.student_id == ronak.id, Application.job_id == sample_job.id).first()
            if not app_exists:
                demo_app = Application(
                    student_id=ronak.id,
                    job_id=sample_job.id,
                    status=ApplicationStatus.SHORTLISTED,
                    interview_round="Technical Round 1: Cloud Architecture & Python",
                    interview_scheduled_at=datetime.datetime.utcnow() + datetime.timedelta(days=2),
                    interview_meeting_link="https://meet.google.com/aws-placement-interview",
                    interview_notes="Prepare core fundamentals on Docker, REST APIs, and SQL transactions.",
                )
                db.add(demo_app)
                print("[Seed] Created demo Application with interview schedule for Ronak Soni")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
