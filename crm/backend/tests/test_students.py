from app.models.user import UserRole
from app.models.student import StudentProfile
from tests.conftest import make_user, auth_headers


def _student_payload(username="talaba1", email="talaba1@test.uz"):
    return {
        "username": username,
        "email": email,
        "password": "parol12345",
        "first_name": "Kamila",
        "last_name": "Yusupova",
    }


def test_admin_can_create_student(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, permissions=None)
    resp = client.post("/api/students", json=_student_payload(), headers=auth_headers(admin))
    assert resp.status_code == 201
    assert resp.json()["first_name"] == "Kamila"


def test_teacher_without_module_permission_blocked(client, db_session):
    teacher = make_user(db_session, role=UserRole.teacher)
    admin_scoped = make_user(
        db_session, role=UserRole.admin, username="admin_scoped",
        email="scoped@test.uz", permissions=["payments"],  # 'students' modulida ruxsati yo'q
    )
    resp = client.post("/api/students", json=_student_payload(), headers=auth_headers(admin_scoped))
    assert resp.status_code == 403


def test_student_can_view_only_own_profile(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, permissions=None)
    r1 = client.post("/api/students", json=_student_payload("t1", "t1@test.uz"), headers=auth_headers(admin))
    r2 = client.post("/api/students", json=_student_payload("t2", "t2@test.uz"), headers=auth_headers(admin))
    profile1 = db_session.query(StudentProfile).filter(StudentProfile.id == r1.json()["id"]).first()
    profile2_id = r2.json()["id"]

    from app.models.user import User
    user1 = db_session.query(User).filter(User.id == profile1.user_id).first()

    # o'z profiliga kirish — ruxsat berilishi kerak
    resp_own = client.get(f"/api/students/{profile1.id}", headers=auth_headers(user1))
    assert resp_own.status_code == 200

    # boshqa talabaning profiliga kirishga urinish — taqiqlanishi kerak
    resp_other = client.get(f"/api/students/{profile2_id}", headers=auth_headers(user1))
    assert resp_other.status_code == 403


def test_list_students_requires_auth(client):
    resp = client.get("/api/students")
    assert resp.status_code in (401, 403)


def test_duplicate_email_rejected(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, permissions=None)
    client.post("/api/students", json=_student_payload(), headers=auth_headers(admin))
    resp = client.post(
        "/api/students",
        json=_student_payload(username="boshqa_login"),
        headers=auth_headers(admin),
    )
    assert resp.status_code == 400
