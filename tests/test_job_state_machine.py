def test_job_posting_lifecycle_and_feedback_loop(client, admin_token):
    # 1. Register and approve recruiter
    rec_res = client.post("/api/auth/register/recruiter", json={
        "email": "hr@datacorp.com",
        "password": "Password123",
        "company_name": "DataCorp",
        "hr_name": "Carol"
    })
    rec_id = rec_res.json()["user_id"]
    client.post(f"/api/admin/recruiters/{rec_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})

    login_res = client.post("/api/auth/login", json={
        "email": "hr@datacorp.com",
        "password": "Password123",
        "role": "RECRUITER"
    })
    rec_token = login_res.json()["access_token"]

    # 2. Create job -> DRAFT
    job_create_res = client.post(
        "/api/recruiter/jobs",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "title": "Data Analyst Intern",
            "description": "SQL, Python, and Tableau experience required.",
            "min_cgpa": 7.0,
            "allowed_branches": ["CSE", "IT"],
            "allowed_graduation_years": [2026]
        }
    )
    assert job_create_res.status_code == 201
    job = job_create_res.json()
    assert job["status"] == "DRAFT"
    job_id = job["id"]

    # 3. Submit job -> PENDING_APPROVAL
    submit_res = client.post(
        f"/api/recruiter/jobs/{job_id}/submit",
        headers={"Authorization": f"Bearer {rec_token}"}
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "PENDING_APPROVAL"

    # 4. Admin requests changes with feedback -> REQUIRES_CHANGES
    feedback_res = client.post(
        f"/api/admin/jobs/{job_id}/request-changes",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"admin_feedback": "Please clarify if Mechanical students with minor in CS are eligible."}
    )
    assert feedback_res.status_code == 200
    updated_job = feedback_res.json()
    assert updated_job["status"] == "REQUIRES_CHANGES"
    assert "clarify if Mechanical" in updated_job["admin_feedback"]

    # 5. Recruiter updates job and resubmits
    edit_res = client.put(
        f"/api/recruiter/jobs/{job_id}",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "title": "Data Analyst Intern (CSE/IT Only)",
            "allowed_branches": ["CSE", "IT"]
        }
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["title"] == "Data Analyst Intern (CSE/IT Only)"

    resubmit_res = client.post(
        f"/api/recruiter/jobs/{job_id}/submit",
        headers={"Authorization": f"Bearer {rec_token}"}
    )
    assert resubmit_res.status_code == 200
    assert resubmit_res.json()["status"] == "PENDING_APPROVAL"

    # 6. Admin approves job -> ACTIVE
    approve_job_res = client.post(
        f"/api/admin/jobs/{job_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert approve_job_res.status_code == 200
    assert approve_job_res.json()["status"] == "ACTIVE"

    # 7. Recruiter closes job -> CLOSED
    close_res = client.post(
        f"/api/recruiter/jobs/{job_id}/close",
        headers={"Authorization": f"Bearer {rec_token}"}
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "CLOSED"

    # 8. Soft delete job
    del_res = client.delete(
        f"/api/recruiter/jobs/{job_id}",
        headers={"Authorization": f"Bearer {rec_token}"}
    )
    assert del_res.status_code == 200
    assert del_res.json()["is_deleted"] is True
