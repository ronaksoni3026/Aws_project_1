from backend.models.recruiter import RecruiterStatus


def test_student_registration_and_login(client):
    # Register student
    reg_res = client.post("/api/auth/register/student", json={
        "email": "student1@campus.edu",
        "password": "Password123",
        "full_name": "Alice Smith",
        "roll_number": "CS2026_001",
        "cgpa": 8.75,
        "branch": "CSE",
        "graduation_year": 2026,
        "resume_url": "https://drive.google.com/resume/alice"
    })
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["role"] == "STUDENT"
    assert "access_token" in reg_data

    # Login student
    login_res = client.post("/api/auth/login", json={
        "email": "student1@campus.edu",
        "password": "Password123",
        "role": "STUDENT"
    })
    assert login_res.status_code == 200
    assert login_res.json()["role"] == "STUDENT"


def test_recruiter_pending_onboarding_and_gating(client, admin_token):
    # Register recruiter
    reg_res = client.post("/api/auth/register/recruiter", json={
        "email": "recruiter1@techcorp.com",
        "password": "Password123",
        "company_name": "TechCorp Global",
        "hr_name": "Bob Miller"
    })
    assert reg_res.status_code == 201
    recruiter_data = reg_res.json()
    assert recruiter_data["role"] == "RECRUITER"
    assert recruiter_data["status"] == "PENDING"
    recruiter_token = recruiter_data["access_token"]
    recruiter_id = recruiter_data["user_id"]

    # Attempt job creation while PENDING -> MUST RETURN HTTP 403 FORBIDDEN
    blocked_job_res = client.post(
        "/api/recruiter/jobs",
        headers={"Authorization": f"Bearer {recruiter_token}"},
        json={
            "title": "Backend Systems Engineer",
            "description": "Building high-throughput microservices in Python",
            "min_cgpa": 7.5,
            "allowed_branches": ["CSE", "ECE"],
            "allowed_graduation_years": [2026]
        }
    )
    assert blocked_job_res.status_code == 403
    assert "pending administrator verification" in blocked_job_res.json()["detail"].lower()

    # Admin approves recruiter
    approve_res = client.post(
        f"/api/admin/recruiters/{recruiter_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == RecruiterStatus.ACTIVE.value

    # Now re-login as active recruiter
    login_res = client.post("/api/auth/login", json={
        "email": "recruiter1@techcorp.com",
        "password": "Password123",
        "role": "RECRUITER"
    })
    active_token = login_res.json()["access_token"]

    # Recruiter can now successfully create job in DRAFT
    job_res = client.post(
        "/api/recruiter/jobs",
        headers={"Authorization": f"Bearer {active_token}"},
        json={
            "title": "Backend Systems Engineer",
            "description": "Building high-throughput microservices in Python",
            "min_cgpa": 7.5,
            "allowed_branches": ["CSE", "ECE"],
            "allowed_graduation_years": [2026]
        }
    )
    assert job_res.status_code == 201
    assert job_res.json()["status"] == "DRAFT"


def test_rbac_cross_role_access_denied(client):
    # Register student
    reg_res = client.post("/api/auth/register/student", json={
        "email": "student2@campus.edu",
        "password": "Password123",
        "full_name": "Bob Dylan",
        "roll_number": "CS2026_002",
        "cgpa": 8.0,
        "branch": "CSE",
        "graduation_year": 2026
    })
    student_token = reg_res.json()["access_token"]

    # Student attempts to access Admin metrics endpoint -> HTTP 403
    admin_access_res = client.get(
        "/api/admin/metrics",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert admin_access_res.status_code == 403
    assert "Requires role 'ADMIN'" in admin_access_res.json()["detail"]
