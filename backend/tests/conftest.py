"""
Sets DATABASE_URL to a dedicated test database BEFORE anything imports
`app.core.config` (settings are read once, at import time). Requires a real
Postgres with the pgvector extension enabled - these are integration tests,
not mocked unit tests, so `createdb capacity_connect_test` (with `CREATE
EXTENSION vector;`) must exist first. See backend/README section on testing.
"""

import os

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/capacity_connect_test")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app.models  # noqa: E402,F401 - populate Base.metadata
from app.core.database import Base, engine  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402
from app.seed.seed_admin import run as seed_admin  # noqa: E402
from app.seed.seed_courses import run as seed_courses  # noqa: E402


@pytest.fixture(scope="session")
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_admin()
    seed_courses()
    with TestClient(fastapi_app) as test_client:
        yield test_client
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session")
def admin_headers(client):
    r = client.post("/auth/login", json={"email": "adminsih@gmail.com", "password": "Adminsihimd2026"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
