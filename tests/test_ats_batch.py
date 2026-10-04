def test_ats_pagination_and_acid_batch_update(client, admin_token):
    # Setup Recruiter and Active Job
    rec_res = client.post("/api/auth/register/recruiter", json={
        "email": "hr@scaletech.com",
        "password": "Password123",
        "company_name": "ScaleTech",
        "hr_name": "Sarah"
    })
    rec_id = rec_res.json()["user_id"]
    client.post(f"/api/admin/recruiters/{rec_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})

    login_res = client.post("/api/auth/login", json={
        "email": "hr@scaletech.com",
        "password": "Password123",
        "role": "RECRUITER"
    })
    rec_token = login_res.json()["access_token"]

    job_res = client.post(
        "/api/recruiter/jobs",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "title": "Full Stack Developer",
            "description": "React and FastAPI development.",
            "min_cgpa": 6.0,
            "allowed_branches": ["CSE", "IT"],
            "allowed_graduation_years": [2026]
        }
    )
    job_id = job_res.json()["id"]
    client.post(f"/api/recruiter/jobs/{job_id}/submit", headers={"Authorization": f"Bearer {rec_token}"})
    client.post(f"/api/admin/jobs/{job_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})

    # Register 3 eligible students and submit applications
    app_ids = []
    for i in range(1, 4):
        s_res = client.post("/api/auth/register/student", json={
            "email": f"applicant{i}@campus.edu",
            "password": "Password123",
            "full_name": f"Student {i}",
            "roll_number": f"ROLL_{i:03d}",
            "cgpa": 8.0,
            "branch": "CSE",
            "graduation_year": 2026,
            "resume_url": f"https://example.com/resumes/applicant_{i}.pdf"
        })
        s_token = s_res.json()["access_token"]
        a_res = client.post(f"/api/student/jobs/{job_id}/apply", headers={"Authorization": f"Bearer {s_token}"})
        assert a_res.status_code == 201
        app_ids.append(a_res.json()["id"])

    # Test ATS Pagination: page 1 with limit 2
    p1_res = client.get(
        f"/api/recruiter/jobs/{job_id}/applications?page=1&limit=2",
        headers={"Authorization": f"Bearer {rec_token}"}
    )
    assert p1_res.status_code == 200
    p1_data = p1_res.json()
    assert p1_data["total"] == 3
    assert len(p1_data["items"]) == 2
    assert p1_data["total_pages"] == 2

    # Test Valid ACID Batch Update: Shortlist first 2 candidates
    batch_res = client.post(
        f"/api/recruiter/jobs/{job_id}/applications/batch-update",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "application_ids": [app_ids[0], app_ids[1]],
            "status": "SHORTLISTED"
        }
    )
    assert batch_res.status_code == 200
    assert batch_res.json()["updated_count"] == 2

    # Verify updated statuses in ATS
    chk_res = client.get(
        f"/api/recruiter/jobs/{job_id}/applications?page=1&limit=10",
        headers={"Authorization": f"Bearer {rec_token}"}
    )
    apps_by_id = {app["id"]: app["status"] for app in chk_res.json()["items"]}
    assert apps_by_id[app_ids[0]] == "SHORTLISTED"
    assert apps_by_id[app_ids[1]] == "SHORTLISTED"
    assert apps_by_id[app_ids[2]] == "APPLIED"

    # Test ACID Rollback: Include a non-existent application ID
    invalid_batch_res = client.post(
        f"/api/recruiter/jobs/{job_id}/applications/batch-update",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "application_ids": [app_ids[2], 99999],
            "status": "OFFERED"
        }
    )
    assert invalid_batch_res.status_code == 400
    assert "ACID Transaction Aborted" in invalid_batch_res.json()["detail"]

    # Verify that app_ids[2] was NOT updated to OFFERED (Rollback preserved data integrity)
    chk_rollback = client.get(
        f"/api/recruiter/jobs/{job_id}/applications?page=1&limit=10",
        headers={"Authorization": f"Bearer {rec_token}"}
    )
    apps_after_rollback = {app["id"]: app["status"] for app in chk_rollback.json()["items"]}
    assert apps_after_rollback[app_ids[2]] == "APPLIED"  # Unchanged!
