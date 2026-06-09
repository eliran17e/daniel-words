"""Tests for the email/password auth flow and JWT verification."""

from datetime import datetime, timedelta, timezone

from jose import jwt

from app.config import JWT_ALGORITHM, JWT_SECRET


# ─── Registration ─────────────────────────────────────────────────────────────


def test_register_returns_token_and_user(client):
    resp = client.post(
        "/api/auth/register",
        json={"email": "a@b.com", "password": "secret1"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "a@b.com"
    assert body["user"]["id"] > 0
    assert "created_at" in body["user"]


def test_register_normalizes_email_case(client):
    client.post("/api/auth/register", json={"email": "MiXeD@case.COM", "password": "pw1234"})
    # Logging in with a different case should still work because the backend
    # lowercases on both register and login.
    resp = client.post(
        "/api/auth/login",
        json={"email": "mixed@case.com", "password": "pw1234"},
    )
    assert resp.status_code == 200


def test_register_stores_hashed_password_not_plaintext(client, db_session):
    """Direct DB check: we must never store the plaintext password."""
    from app.models import User

    client.post("/api/auth/register", json={"email": "x@y.com", "password": "totally-secret"})
    user = db_session.query(User).filter(User.email == "x@y.com").one()
    assert user.hashed_password is not None
    assert user.hashed_password != "totally-secret"
    # bcrypt hashes always start with one of these prefixes
    assert user.hashed_password.startswith(("$2a$", "$2b$", "$2y$"))


def test_register_duplicate_email_returns_409(client, alice):
    resp = client.post(
        "/api/auth/register",
        json={"email": "alice@test.com", "password": "different"},
    )
    assert resp.status_code == 409
    assert "already" in resp.json()["detail"].lower()


def test_register_short_password_rejected(client):
    """Pydantic min_length=4 should reject 3-char passwords with 422."""
    resp = client.post(
        "/api/auth/register",
        json={"email": "short@test.com", "password": "x"},
    )
    assert resp.status_code == 422


def test_register_invalid_email_rejected(client):
    resp = client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "pw1234"},
    )
    assert resp.status_code == 422


# ─── Login ────────────────────────────────────────────────────────────────────


def test_login_with_correct_password(client, alice):
    resp = client.post(
        "/api/auth/login",
        json={"email": "alice@test.com", "password": "alicepass"},
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["email"] == "alice@test.com"


def test_login_with_wrong_password(client, alice):
    resp = client.post(
        "/api/auth/login",
        json={"email": "alice@test.com", "password": "WRONG"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "invalid email or password"


def test_login_unknown_email_returns_same_error(client):
    """Same error as wrong-password so attackers can't enumerate emails."""
    resp = client.post(
        "/api/auth/login",
        json={"email": "nobody@test.com", "password": "anything"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "invalid email or password"


# ─── /me ──────────────────────────────────────────────────────────────────────


def test_me_with_valid_token(client, alice, alice_headers):
    resp = client.get("/api/auth/me", headers=alice_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "alice@test.com"
    assert body["id"] == alice["user"]["id"]


def test_me_without_token_returns_401(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_with_garbage_token_returns_401(client):
    resp = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer not-a-real-jwt"},
    )
    assert resp.status_code == 401


def test_me_with_tampered_signature_returns_401(client, alice):
    """If the signature doesn't match the payload, the token is rejected.
    This is the core security property of HMAC-signed JWTs."""
    token = alice["access_token"]
    # Flip a character in the signature
    parts = token.split(".")
    parts[2] = "x" + parts[2][1:]
    tampered = ".".join(parts)
    resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {tampered}"},
    )
    assert resp.status_code == 401


def test_me_with_expired_token_returns_401(client, alice):
    """Manually issue a JWT with a past expiration and verify rejection."""
    expired_payload = {
        "sub": str(alice["user"]["id"]),
        "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        "iat": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    expired = jwt.encode(expired_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {expired}"},
    )
    assert resp.status_code == 401


def test_me_with_wrong_secret_returns_401(client, alice):
    """A token signed with the wrong secret must be rejected. Confirms the
    server validates the signature, not just the structure."""
    fake_payload = {
        "sub": str(alice["user"]["id"]),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
    }
    fake_token = jwt.encode(fake_payload, "the-wrong-secret", algorithm=JWT_ALGORITHM)
    resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {fake_token}"},
    )
    assert resp.status_code == 401


def test_token_for_deleted_user_returns_401(client, alice, alice_headers, db_session):
    """If the user is deleted between issuance and use, /me returns 401."""
    from app.models import User

    db_session.query(User).filter(User.email == "alice@test.com").delete()
    db_session.commit()

    resp = client.get("/api/auth/me", headers=alice_headers)
    assert resp.status_code == 401
