def test_admin_audit_trail_and_metrics(client, admin_token):
    # 1. Register a recruiter
    rec_res = client.post("/api/auth/register/recruiter", json={
        "email": "lead_hr@innovate.com",
        "password": "Password123",
        "company_name": "Innovate Ltd",
        "hr_name": "Edward"
    })
    rec_id = rec_res.json()["user_id"]

    # 2. Admin approves recruiter -> triggers audit log
    appr_res = client.post(
        f"/api/admin/recruiters/{rec_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert appr_res.status_code == 200

    # 3. Verify audit log was recorded
    audit_res = client.get(
        "/api/admin/audit-logs",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert audit_res.status_code == 200
    logs = audit_res.json()["items"]
    assert len(logs) >= 1
    actions = [l["action"] for l in logs]
    assert "APPROVE_RECRUITER" in actions

    # 4. Check global metrics
    metrics_res = client.get(
        "/api/admin/metrics",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert metrics["active_recruiters"] >= 1
    assert "conversion_rate_percentage" in metrics


def test_admin_student_and_recruiter_directories(client, admin_token):
    # Register 2 students
    s1_res = client.post("/api/auth/register/student", json={
        "email": "john.cse@campus.edu",
        "password": "Password123",
        "full_name": "John Doe",
        "roll_number": "CS2026_500",
        "cgpa": 9.2,
        "branch": "CSE",
        "graduation_year": 2026,
        "resume_url": "https://example.com/resumes/john.pdf"
    })
    assert s1_res.status_code == 201

    s2_res = client.post("/api/auth/register/student", json={
        "email": "mary.ece@campus.edu",
        "password": "Password123",
        "full_name": "Mary Jane",
        "roll_number": "EC2026_501",
        "cgpa": 8.4,
        "branch": "ECE",
        "graduation_year": 2026,
        "resume_url": "https://example.com/resumes/mary.pdf"
    })
    assert s2_res.status_code == 201

    # Admin fetches student directory
    students_res = client.get(
        "/api/admin/students",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert students_res.status_code == 200
    data = students_res.json()
    assert data["total"] >= 2
    student_rolls = [s["roll_number"] for s in data["items"]]
    assert "CS2026_500" in student_rolls
    assert "EC2026_501" in student_rolls

    # Test branch filter
    cse_res = client.get(
        "/api/admin/students?branch=CSE",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert cse_res.status_code == 200
    cse_items = cse_res.json()["items"]
    assert all(s["branch"] == "CSE" for s in cse_items)

    # Test search query
    search_res = client.get(
        "/api/admin/students?search=Mary",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert search_res.status_code == 200
    assert len(search_res.json()["items"]) == 1
    assert search_res.json()["items"][0]["full_name"] == "Mary Jane"

    # Register a recruiter
    client.post("/api/auth/register/recruiter", json={
        "email": "corp@google.com",
        "password": "Password123",
        "company_name": "Google Alphabet",
        "hr_name": "Larry"
    })

    # Admin fetches recruiter directory
    recruiters_res = client.get(
        "/api/admin/recruiters",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert recruiters_res.status_code == 200
    rec_data = recruiters_res.json()
    assert rec_data["total"] >= 1
    assert any(r["company_name"] == "Google Alphabet" for r in rec_data["items"])
