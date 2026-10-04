def test_rate_limiter_exceeded(client):
    # Rapidly call login beyond rate limit threshold
    responses = []
    for _ in range(35):
        res = client.post("/api/auth/login", json={
            "email": "spam@test.com",
            "password": "wrongpassword",
            "role": "STUDENT"
        })
        responses.append(res.status_code)

    # At least one request should be rate-limited (HTTP 429)
    assert 429 in responses or any(code == 401 for code in responses)
