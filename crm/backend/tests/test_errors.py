def test_validation_error_detail_is_a_string(client):
    # 'password' maydoni yo'q — Pydantic 422 qaytaradi
    resp = client.post("/api/auth/register", json={
        "username": "x", "email": "x@test.uz",
        "first_name": "A", "last_name": "B",
    })
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert isinstance(detail, str)
    assert "password" in detail


def test_http_exception_detail_is_also_a_string(client):
    resp = client.post("/api/auth/login", json={"username": "yoq", "password": "yoq"})
    assert resp.status_code == 401
    assert isinstance(resp.json()["detail"], str)
