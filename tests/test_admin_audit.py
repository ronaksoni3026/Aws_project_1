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
