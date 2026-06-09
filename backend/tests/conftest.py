"""Shared pytest fixtures.

Key choices:
- Each test gets a fresh in-memory SQLite database (fast, no cleanup).
- We override FastAPI's `get_db` dependency so the app uses our test DB.
- We *don't* use TestClient as a context manager because that would trigger
  the lifespan, which tries to load the Whisper model. Skip the lifespan;
  manually create tables.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture
def db_engine():
    """A fresh in-memory SQLite engine per test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        # StaticPool ensures the same connection (and same in-memory DB)
        # is reused for the whole test
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture
def TestSession(db_engine):
    return sessionmaker(bind=db_engine, autoflush=False, autocommit=False)


@pytest.fixture
def db_session(TestSession):
    """A session for tests that want direct DB access (e.g. seeding the
    master template before triggering a register)."""
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(TestSession):
    """A FastAPI TestClient with the DB dependency overridden to use our
    in-memory SQLite engine."""

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


# --- Helpers ---


def _register(client, email, password, name=None):
    resp = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "display_name": name},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture
def alice(client):
    """Pre-registered Alice. Returns dict with token + user."""
    return _register(client, "alice@test.com", "alicepass")


@pytest.fixture
def alice_headers(alice):
    return {"Authorization": f"Bearer {alice['access_token']}"}


@pytest.fixture
def bob(client, alice):
    """Pre-registered Bob (Alice already registered, both share the DB)."""
    return _register(client, "bob@test.com", "bobpass")


@pytest.fixture
def bob_headers(bob):
    return {"Authorization": f"Bearer {bob['access_token']}"}


@pytest.fixture
def master_seed(db_session):
    """Populate a small master template (user_id IS NULL) so tests can verify
    that registration clones it."""
    from app.models import Word

    db_session.add_all([
        Word(word="apple", language="en", emoji="🍎", category="food", user_id=None),
        Word(word="dog", language="en", emoji="🐶", category="animal", user_id=None),
        Word(word="תפוח", language="he", emoji="🍎", category="food", user_id=None),
    ])
    db_session.commit()
