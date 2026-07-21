from app.models.user import UserRole
from tests.conftest import make_user, auth_headers


def test_superadmin_user_creation_is_logged(client, db_session):
    super_admin = make_user(db_session, role=UserRole.super_admin)
    headers = auth_headers(super_admin)

    resp = client.post("/api/superadmin/users", json={
        "first_name": "Yangi", "last_name": "Admin",
        "email": "yangi_admin@test.uz", "username": "yangi_admin",
        "password": "parol12345", "role": "admin",
    }, headers=headers)
    assert resp.status_code == 200

    logs = client.get("/api/audit-logs", headers=headers)
    assert logs.status_code == 200
    items = logs.json()["items"]
    assert any(
        item["action"] == "create" and item["module"] == "superadmin" and item["entity_label"] == "Yangi Admin"
        for item in items
    )


def test_audit_log_forbidden_for_non_super_admin(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, permissions=None)
    resp = client.get("/api/audit-logs", headers=auth_headers(admin))
    assert resp.status_code == 403


def test_permission_change_is_logged_with_details(client, db_session):
    super_admin = make_user(db_session, role=UserRole.super_admin)
    headers = auth_headers(super_admin)
    target_admin = make_user(db_session, role=UserRole.admin, username="scoped_target",
                              email="scoped_target@test.uz", permissions=None)

    resp = client.put(
        f"/api/superadmin/users/{target_admin.id}/permissions",
        json={"permissions": ["payments", "students"]},
        headers=headers,
    )
    assert resp.status_code == 200

    logs = client.get("/api/audit-logs", params={"action": "permission_change"}, headers=headers)
    items = logs.json()["items"]
    assert len(items) == 1
    assert items[0]["details"]["permissions"] == ["payments", "students"]
