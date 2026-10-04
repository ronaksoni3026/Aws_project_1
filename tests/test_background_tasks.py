def test_soft_delete_background_notification_dispatch(client, admin_token):
    # Setup active recruiter
    rec_res = client.post("/api/auth/register/recruiter", json={
        "email": "hr@nexustech.com",
        "password": "Password123",
        "company_name": "NexusTech",
        "hr_name": "Fiona"
    })
    rec_id = rec_res.json()["user_id"]
    client.post(f"/api/admin/recruiters/{rec_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})

    login_res = client.post("/api/auth/login", json={
        "email": "hr@nexustech.com",
        "password": "Password123",
        "role": "RECRUITER"
    })
    rec_token = login_res.json()["access_token"]

    # Create & approve job
    job_res = client.post(
        "/api/recruiter/jobs",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "title": "Cloud DevOps Engineer",
            "description": "AWS, Docker, and Kubernetes deployment.",
            "min_cgpa": 6.5,
            "allowed_branches": ["CSE", "ECE", "IT"],
            "allowed_graduation_years": [2026]
        }
    )
    job_id = job_res.json()["id"]
    client.post(f"/api/recruiter/jobs/{job_id}/submit", headers={"Authorization": f"Bearer {rec_token}"})
    client.post(f"/api/admin/jobs/{job_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})

    # Register student and apply
    stu_res = client.post("/api/auth/register/student", json={
        "email": "devops_student@campus.edu",
        "password": "Password123",
        "full_name": "George King",
        "roll_number": "IT2026_015",
        "cgpa": 8.1,
        "branch": "IT",
        "graduation_year": 2026,
        "resume_url": "https://example.com/resumes/george.pdf"
    })
    stu_token = stu_res.json()["access_token"]
    apply_res = client.post(f"/api/student/jobs/{job_id}/apply", headers={"Authorization": f"Bearer {stu_token}"})
    assert apply_res.status_code == 201

    # Recruiter soft deletes job -> triggers BackgroundTasks
    del_res = client.delete(f"/api/recruiter/jobs/{job_id}", headers={"Authorization": f"Bearer {rec_token}"})
    assert del_res.status_code == 200

    # Student inspects notifications
    notif_res = client.get("/api/student/notifications", headers={"Authorization": f"Bearer {stu_token}"})
    assert notif_res.status_code == 200
    notifs = notif_res.json()
    assert len(notifs) >= 1
    assert "Cloud DevOps Engineer" in notifs[0]["title"] or "Archived" in notifs[0]["title"]
    assert "NexusTech" in notifs[0]["message"]
