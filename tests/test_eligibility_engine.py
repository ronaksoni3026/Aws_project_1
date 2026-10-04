def test_eligibility_engine_gating_and_rejection_payload(client, admin_token):
    # Setup active recruiter and active job requiring CGPA 8.0, CSE only, 2026 batch
    rec_res = client.post("/api/auth/register/recruiter", json={
        "email": "hr@tier1.com",
        "password": "Password123",
        "company_name": "Tier 1 Tech",
        "hr_name": "Dave"
    })
    rec_id = rec_res.json()["user_id"]
    client.post(f"/api/admin/recruiters/{rec_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})

    login_res = client.post("/api/auth/login", json={
        "email": "hr@tier1.com",
        "password": "Password123",
        "role": "RECRUITER"
    })
    rec_token = login_res.json()["access_token"]

    job_res = client.post(
        "/api/recruiter/jobs",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "title": "Core Algorithm Engineer",
            "description": "Distributed algorithms and low-latency C++.",
            "min_cgpa": 8.0,
            "allowed_branches": ["CSE"],
            "allowed_graduation_years": [2026]
        }
    )
    job_id = job_res.json()["id"]
    client.post(f"/api/recruiter/jobs/{job_id}/submit", headers={"Authorization": f"Bearer {rec_token}"})
    client.post(f"/api/admin/jobs/{job_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})

    # Register student who fails multiple criteria: CGPA 7.2 (< 8.0), Branch ME (!= CSE), No Resume
    stu_res = client.post("/api/auth/register/student", json={
        "email": "failing_student@campus.edu",
        "password": "Password123",
        "full_name": "Underqualified Applicant",
        "roll_number": "ME2026_099",
        "cgpa": 7.20,
        "branch": "Mechanical",
        "graduation_year": 2026,
    })
    stu_token = stu_res.json()["access_token"]

    # Student attempts to apply -> MUST RETURN HTTP 422 UNPROCESSABLE ENTITY
    apply_res = client.post(
        f"/api/student/jobs/{job_id}/apply",
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert apply_res.status_code == 422
    payload = apply_res.json()
    detail = payload["detail"]
    assert detail["eligible"] is False
    assert len(detail["reasons"]) >= 3

    # Check that individual reasons are clearly identified
    reasons_text = " ".join(detail["reasons"])
    assert "8.00" in reasons_text
    assert "Mechanical" in reasons_text
    assert "resume" in reasons_text.lower()

    # Now update student profile to meet all criteria
    client.put(
        "/api/student/profile",
        headers={"Authorization": f"Bearer {stu_token}"},
        json={
            "cgpa": 9.1,
            "branch": "CSE",
            "resume_url": "https://example.com/resumes/valid_resume.pdf"
        }
    )

    # Re-attempt application -> MUST SUCCEED with HTTP 201 CREATED
    apply_success = client.post(
        f"/api/student/jobs/{job_id}/apply",
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert apply_success.status_code == 201
    assert apply_success.json()["status"] == "APPLIED"
