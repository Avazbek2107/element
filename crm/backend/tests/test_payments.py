from app.models.user import UserRole
from tests.conftest import make_user, auth_headers


def _create_student(client, admin_headers, username="stud_pay"):
    resp = client.post("/api/students", json={
        "username": username,
        "email": f"{username}@test.uz",
        "password": "parol12345",
        "first_name": "To'lov",
        "last_name": "Sinov",
    }, headers=admin_headers)
    return resp.json()["id"]


def test_create_payment_and_summary(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, permissions=None)
    headers = auth_headers(admin)
    student_id = _create_student(client, headers)

    resp = client.post("/api/payments", json={
        "student_id": student_id, "amount": 500000, "month": 5, "year": 2026,
    }, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"

    summary = client.get("/api/payments/summary", params={"month": 5, "year": 2026}, headers=headers)
    assert summary.status_code == 200
    body = summary.json()
    assert body["total_students"] == 1
    assert body["total_amount"] == 500000
    assert body["collected"] == 0


def test_duplicate_month_payment_rejected(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, permissions=None)
    headers = auth_headers(admin)
    student_id = _create_student(client, headers, "stud_dup")

    client.post("/api/payments", json={
        "student_id": student_id, "amount": 300000, "month": 6, "year": 2026,
    }, headers=headers)
    resp = client.post("/api/payments", json={
        "student_id": student_id, "amount": 300000, "month": 6, "year": 2026,
    }, headers=headers)
    assert resp.status_code == 400


def test_partial_then_full_payment_updates_status(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, permissions=None)
    headers = auth_headers(admin)
    student_id = _create_student(client, headers, "stud_partial")

    created = client.post("/api/payments", json={
        "student_id": student_id, "amount": 400000, "month": 7, "year": 2026,
    }, headers=headers).json()

    partial = client.put(f"/api/payments/{created['id']}", json={"paid_amount": 100000}, headers=headers)
    assert partial.json()["status"] == "partial"

    full = client.put(f"/api/payments/{created['id']}", json={"paid_amount": 400000}, headers=headers)
    assert full.json()["status"] == "paid"


def test_payments_require_auth(client):
    resp = client.get("/api/payments", params={"month": 1, "year": 2026})
    assert resp.status_code in (401, 403)


def test_student_role_cannot_access_payments(client, db_session):
    student = make_user(db_session, role=UserRole.student)
    resp = client.get("/api/payments", params={"month": 1, "year": 2026}, headers=auth_headers(student))
    assert resp.status_code == 403
