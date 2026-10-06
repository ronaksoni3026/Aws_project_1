import io
import datetime
from backend.models import Student, Recruiter, RecruiterStatus, Job, JobStatus, Application, ApplicationStatus
from backend.core.security import get_password_hash, create_access_token, Role


def test_aws_status_endpoint(client):
    res = client.get("/api/aws/status")
    assert res.status_code == 200
    data = res.json()
    assert "region" in data
    assert "s3_configured" in data
    assert "ses_configured" in data


def test_resume_upload_endpoint(client, db_session):
    # Create student
    student = Student(
        email="resumetest@placement.edu",
        password_hash=get_password_hash("Pass123"),
        full_name="Resume Test Student",
        roll_number="21CS999",
        cgpa=8.5,
        branch="CSE",
        graduation_year=2025,
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)

    token = create_access_token({"sub": str(student.id), "email": student.email, "role": Role.STUDENT.value})

    # Test rejection of non-PDF
    bad_file = io.BytesIO(b"dummy text")
    res_bad = client.post(
        "/api/student/resume/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("resume.txt", bad_file, "text/plain")}
    )
    assert res_bad.status_code == 400
    assert "PDF" in res_bad.json()["detail"]

    # Test PDF upload
    pdf_bytes = io.BytesIO(b"%PDF-1.4 dummy pdf binary stream")
    res = client.post(
        "/api/student/resume/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("resume.pdf", pdf_bytes, "application/pdf")}
    )
    assert res.status_code == 200
    data = res.json()
    assert "resume_url" in data
    assert data["storage"] in ["AWS_S3", "LOCAL_FALLBACK"]

    # Verify student record was updated
    db_session.refresh(student)
    assert student.resume_url is not None


def test_interview_scheduling_and_recruiter_csv_export(client, db_session):
    # Create recruiter and student
    recruiter = Recruiter(
        email="aws_recruiter@company.com",
        password_hash=get_password_hash("Pass123"),
        company_name="Cloud Corp",
        hr_name="Sarah",
        status=RecruiterStatus.ACTIVE,
    )
    student = Student(
        email="candidate@placement.edu",
        password_hash=get_password_hash("Pass123"),
        full_name="Candidate Student",
        roll_number="21IT888",
        cgpa=9.0,
        branch="IT",
        graduation_year=2025,
        resume_url="https://example.com/resume.pdf",
    )
    db_session.add_all([recruiter, student])
    db_session.commit()

    rec_token = create_access_token({"sub": str(recruiter.id), "email": recruiter.email, "role": Role.RECRUITER.value})

    # Create Job
    job = Job(
        recruiter_id=recruiter.id,
        title="Site Reliability Engineer",
        description="Kubernetes, AWS, and Observability.",
        company_name="Cloud Corp",
        ctc_lpa=20.0,
        status=JobStatus.ACTIVE,
    )
    db_session.add(job)
    db_session.commit()

    # Create application
    app = Application(
        student_id=student.id,
        job_id=job.id,
        status=ApplicationStatus.APPLIED,
    )
    db_session.add(app)
    db_session.commit()
    db_session.refresh(app)

    # Schedule Interview
    interview_time = (datetime.datetime.utcnow() + datetime.timedelta(days=3)).isoformat()
    sched_res = client.post(
        f"/api/recruiter/jobs/{job.id}/applications/{app.id}/schedule-interview",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "interview_round": "Round 1: System Design",
            "interview_scheduled_at": interview_time,
            "interview_meeting_link": "https://chime.aws/123456",
            "interview_notes": "Focus on high availability and fault tolerance.",
        }
    )
    assert sched_res.status_code == 200
    sched_data = sched_res.json()
    assert sched_data["status"] == "SHORTLISTED"
    assert sched_data["interview_round"] == "Round 1: System Design"
    assert "chime.aws" in sched_data["interview_meeting_link"]

    # Test Recruiter CSV Export
    csv_res = client.get(
        f"/api/recruiter/jobs/{job.id}/export-csv",
        headers={"Authorization": f"Bearer {rec_token}"}
    )
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Candidate Student" in csv_res.text
    assert "Round 1: System Design" in csv_res.text


def test_admin_csv_exports(client, admin_token, db_session):
    # Verify student directory CSV
    stud_csv = client.get(
        "/api/admin/export/students-csv",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert stud_csv.status_code == 200
    assert "text/csv" in stud_csv.headers["content-type"]
    assert "Roll Number" in stud_csv.text

    # Verify placements report CSV
    place_csv = client.get(
        "/api/admin/export/placements-csv",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert place_csv.status_code == 200
    assert "text/csv" in place_csv.headers["content-type"]
    assert "Company Name" in place_csv.text


def test_change_password(client, db_session):
    student = Student(
        email="passchange@placement.edu",
        password_hash=get_password_hash("OldPassword123"),
        full_name="Password Changer",
        roll_number="21EE777",
        cgpa=8.0,
        branch="EEE",
        graduation_year=2025,
    )
    db_session.add(student)
    db_session.commit()

    token = create_access_token({"sub": str(student.id), "email": student.email, "role": Role.STUDENT.value})

    # Test incorrect old password
    fail_res = client.post(
        "/api/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"old_password": "WrongPassword", "new_password": "NewSecretPassword123"}
    )
    assert fail_res.status_code == 400

    # Test valid change
    success_res = client.post(
        "/api/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"old_password": "OldPassword123", "new_password": "NewSecretPassword123"}
    )
    assert success_res.status_code == 200

    # Verify login with new password
    login_res = client.post(
        "/api/auth/login",
        json={"email": "passchange@placement.edu", "password": "NewSecretPassword123", "role": "STUDENT"}
    )
    assert login_res.status_code == 200
