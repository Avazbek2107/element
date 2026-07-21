from app.models.user import UserRole
from tests.conftest import make_user, auth_headers


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


def test_login_success(client, db_session):
    make_user(db_session, role=UserRole.teacher, username="ustoz1")
    resp = client.post("/api/auth/login", json={"username": "ustoz1", "password": "test12345"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data and "refresh_token" in data


def test_login_wrong_password_rejected(client, db_session):
    make_user(db_session, role=UserRole.teacher, username="ustoz2")
    resp = client.post("/api/auth/login", json={"username": "ustoz2", "password": "notogri"})
    assert resp.status_code == 401


def test_me_requires_token(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code in (401, 403)


def test_me_returns_current_user(client, db_session):
    user = make_user(db_session, role=UserRole.admin, username="admin_x")
    resp = client.get("/api/auth/me", headers=auth_headers(user))
    assert resp.status_code == 200
    assert resp.json()["username"] == "admin_x"


def test_refresh_token_flow(client, db_session):
    user = make_user(db_session, role=UserRole.teacher, username="ustoz3")
    login_resp = client.post("/api/auth/login", json={"username": "ustoz3", "password": "test12345"})
    refresh_token = login_resp.json()["refresh_token"]
    resp = client.post("/api/auth/refresh-token", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_access_token_cannot_be_used_as_refresh(client, db_session):
    user = make_user(db_session, role=UserRole.teacher, username="ustoz4")
    login_resp = client.post("/api/auth/login", json={"username": "ustoz4", "password": "test12345"})
    access_token = login_resp.json()["access_token"]
    resp = client.post("/api/auth/refresh-token", json={"refresh_token": access_token})
    assert resp.status_code == 400
