from app.models.user import UserRole
from tests.conftest import make_user, auth_cookies


def test_register_creates_student(client):
    resp = client.post("/api/auth/register", json={
        "username": "yangi_talaba",
        "email": "yangi@test.uz",
        "password": "parol12345",
        "first_name": "Aziz",
        "last_name": "Aliyev",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["role"] == "student"
    assert body["username"] == "yangi_talaba"


def test_register_duplicate_email_rejected(client, db_session):
    make_user(db_session, role=UserRole.student, email="band@test.uz", username="band1")
    resp = client.post("/api/auth/register", json={
        "username": "band2",
        "email": "band@test.uz",
        "password": "parol12345",
        "first_name": "A",
        "last_name": "B",
    })
    assert resp.status_code == 400


def test_login_sets_httponly_cookies(client, db_session):
    make_user(db_session, role=UserRole.teacher, username="ustoz1")
    resp = client.post("/api/auth/login", json={"username": "ustoz1", "password": "test12345"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "ustoz1"
    assert "access_token" in resp.cookies
    assert "refresh_token" in resp.cookies


def test_login_wrong_password_rejected(client, db_session):
    make_user(db_session, role=UserRole.teacher, username="ustoz2")
    resp = client.post("/api/auth/login", json={"username": "ustoz2", "password": "notogri"})
    assert resp.status_code == 401


def test_me_requires_token(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code in (401, 403)


def test_me_returns_current_user(client, db_session):
    user = make_user(db_session, role=UserRole.admin, username="admin_x")
    resp = client.get("/api/auth/me", cookies=auth_cookies(user))
    assert resp.status_code == 200
    assert resp.json()["username"] == "admin_x"


def test_refresh_token_flow(client, db_session):
    make_user(db_session, role=UserRole.teacher, username="ustoz3")
    login_resp = client.post("/api/auth/login", json={"username": "ustoz3", "password": "test12345"})
    assert "refresh_token" in login_resp.cookies

    # client cookie jar'ida saqlanib qolgan refresh_token avtomatik yuboriladi
    resp = client.post("/api/auth/refresh-token")
    assert resp.status_code == 200
    assert resp.json()["username"] == "ustoz3"
    assert "access_token" in resp.cookies


def test_refresh_without_cookie_rejected(client):
    resp = client.post("/api/auth/refresh-token")
    assert resp.status_code == 401


def test_access_token_used_as_refresh_cookie_is_rejected(client, db_session):
    make_user(db_session, role=UserRole.teacher, username="ustoz4")
    login_resp = client.post("/api/auth/login", json={"username": "ustoz4", "password": "test12345"})
    access_token = login_resp.cookies["access_token"]
    resp = client.post("/api/auth/refresh-token", cookies={"refresh_token": access_token})
    assert resp.status_code == 400


def test_logout_clears_cookies(client, db_session):
    make_user(db_session, role=UserRole.teacher, username="ustoz5")
    client.post("/api/auth/login", json={"username": "ustoz5", "password": "test12345"})
    resp = client.post("/api/auth/logout")
    assert resp.status_code == 200
    me = client.get("/api/auth/me")
    assert me.status_code == 401


def test_login_rate_limited_after_too_many_attempts(client, db_session):
    make_user(db_session, role=UserRole.teacher, username="ustoz_rl")
    for _ in range(10):
        resp = client.post("/api/auth/login", json={"username": "ustoz_rl", "password": "notogri"})
        assert resp.status_code == 401
    blocked = client.post("/api/auth/login", json={"username": "ustoz_rl", "password": "notogri"})
    assert blocked.status_code == 429
