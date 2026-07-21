import pyotp
from app.models.user import UserRole
from tests.conftest import make_user, auth_cookies


def _enable_2fa(client, cookies, db_session, user):
    """Yordamchi: 2FA'ni to'liq yoqib, secret va backup kodlarni qaytaradi."""
    setup_resp = client.post("/api/2fa/setup", cookies=cookies)
    assert setup_resp.status_code == 200
    secret = setup_resp.json()["secret"]

    code = pyotp.TOTP(secret).now()
    confirm_resp = client.post("/api/2fa/confirm", json={"code": code}, cookies=cookies)
    assert confirm_resp.status_code == 200
    backup_codes = confirm_resp.json()["backup_codes"]

    db_session.refresh(user)
    return secret, backup_codes


def test_setup_returns_qr_and_does_not_enable_yet(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, permissions=None)
    resp = client.post("/api/2fa/setup", cookies=auth_cookies(admin))
    assert resp.status_code == 200
    body = resp.json()
    assert "secret" in body and body["qr_code"].startswith("data:image/png;base64,")

    db_session.refresh(admin)
    assert admin.totp_enabled is False


def test_confirm_with_wrong_code_rejected(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, permissions=None)
    cookies = auth_cookies(admin)
    client.post("/api/2fa/setup", cookies=cookies)
    resp = client.post("/api/2fa/confirm", json={"code": "000000"}, cookies=cookies)
    assert resp.status_code == 400


def test_confirm_with_correct_code_enables_and_returns_backup_codes(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, permissions=None)
    cookies = auth_cookies(admin)
    secret, backup_codes = _enable_2fa(client, cookies, db_session, admin)
    assert len(backup_codes) == 8
    assert admin.totp_enabled is True


def test_login_with_2fa_enabled_requires_second_step(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, username="admin_2fa", permissions=None)
    cookies = auth_cookies(admin)
    _enable_2fa(client, cookies, db_session, admin)

    resp = client.post("/api/auth/login", json={"username": "admin_2fa", "password": "test12345"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["requires_2fa"] is True
    assert "temp_token" in body
    assert "access_token" not in resp.cookies


def test_login_2fa_verify_with_valid_totp_code(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, username="admin_2fa2", permissions=None)
    cookies = auth_cookies(admin)
    secret, _ = _enable_2fa(client, cookies, db_session, admin)

    login_resp = client.post("/api/auth/login", json={"username": "admin_2fa2", "password": "test12345"})
    temp_token = login_resp.json()["temp_token"]

    code = pyotp.TOTP(secret).now()
    verify_resp = client.post("/api/auth/login/2fa-verify", json={"temp_token": temp_token, "code": code})
    assert verify_resp.status_code == 200
    assert verify_resp.json()["username"] == "admin_2fa2"
    assert "access_token" in verify_resp.cookies


def test_login_2fa_verify_with_backup_code_is_single_use(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, username="admin_2fa3", permissions=None)
    cookies = auth_cookies(admin)
    _, backup_codes = _enable_2fa(client, cookies, db_session, admin)
    one_code = backup_codes[0]

    login_resp = client.post("/api/auth/login", json={"username": "admin_2fa3", "password": "test12345"})
    temp_token1 = login_resp.json()["temp_token"]
    ok = client.post("/api/auth/login/2fa-verify", json={"temp_token": temp_token1, "code": one_code})
    assert ok.status_code == 200

    # xuddi shu backup kod ikkinchi marta ishlamasligi kerak
    login_resp2 = client.post("/api/auth/login", json={"username": "admin_2fa3", "password": "test12345"})
    temp_token2 = login_resp2.json()["temp_token"]
    reused = client.post("/api/auth/login/2fa-verify", json={"temp_token": temp_token2, "code": one_code})
    assert reused.status_code == 401


def test_login_2fa_verify_wrong_code_rejected(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, username="admin_2fa4", permissions=None)
    cookies = auth_cookies(admin)
    _enable_2fa(client, cookies, db_session, admin)

    login_resp = client.post("/api/auth/login", json={"username": "admin_2fa4", "password": "test12345"})
    temp_token = login_resp.json()["temp_token"]
    resp = client.post("/api/auth/login/2fa-verify", json={"temp_token": temp_token, "code": "000000"})
    assert resp.status_code == 401


def test_disable_requires_valid_code_or_password(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, username="admin_2fa5", permissions=None)
    cookies = auth_cookies(admin)
    _enable_2fa(client, cookies, db_session, admin)

    bad = client.post("/api/2fa/disable", json={"code": "notogri"}, cookies=cookies)
    assert bad.status_code == 400

    good = client.post("/api/2fa/disable", json={"code": "test12345"}, cookies=cookies)  # parol orqali
    assert good.status_code == 200
    db_session.refresh(admin)
    assert admin.totp_enabled is False


def test_superadmin_can_reset_others_2fa(client, db_session):
    admin = make_user(db_session, role=UserRole.admin, username="admin_2fa6", permissions=None)
    admin_cookies = auth_cookies(admin)
    _enable_2fa(client, admin_cookies, db_session, admin)

    super_admin = make_user(db_session, role=UserRole.super_admin)
    resp = client.post(f"/api/2fa/reset/{admin.id}", cookies=auth_cookies(super_admin))
    assert resp.status_code == 200
    db_session.refresh(admin)
    assert admin.totp_enabled is False


def test_regular_admin_cannot_reset_others_2fa(client, db_session):
    admin1 = make_user(db_session, role=UserRole.admin, username="admin_2fa7",
                        email="admin_2fa7@test.uz", permissions=None)
    admin2 = make_user(db_session, role=UserRole.admin, username="admin_2fa8",
                        email="admin_2fa8@test.uz", permissions=None)
    resp = client.post(f"/api/2fa/reset/{admin2.id}", cookies=auth_cookies(admin1))
    assert resp.status_code == 403


def test_student_cannot_access_2fa_endpoints(client, db_session):
    student = make_user(db_session, role=UserRole.student)
    resp = client.post("/api/2fa/setup", cookies=auth_cookies(student))
    assert resp.status_code == 403
