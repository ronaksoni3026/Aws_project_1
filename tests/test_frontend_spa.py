def test_spa_root_endpoint_delivery(client):
    res = client.get("/")
    assert res.status_code == 200
    assert "text/html" in res.headers.get("content-type", "")
    assert "Campus Placement Portal" in res.text
    assert "root" in res.text


def test_health_check_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "Role-Based Campus Placement Portal" in data["project"]
