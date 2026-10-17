"""
Test conftest — shared fixtures for the entire test suite.

Uses StaticPool so all async SQLAlchemy connections share the same
in-memory SQLite database. Overrides the get_db dependency in FastAPI
so every request hits the test database.
"""

import os

# Override env BEFORE any app imports touch settings
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["ENVIRONMENT"] = "test"          # avoids the lifespan auto-create
os.environ["SECRET_KEY"] = "test_secret_key_for_testing_only_32chars!"
os.environ["RUNNER_API_KEY"] = "test_runner_key"
os.environ["FRONTEND_ORIGIN"] = "*"

import pytest_asyncio  # noqa: E402
from httpx import AsyncClient, ASGITransport  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

# Import app components after env is set
from app.db.session import Base, get_db  # noqa: E402
import app.db.models  # noqa: F401, E402 — ensures all models are registered
from app.main import app  # noqa: E402

# ── Test engine: single shared in-memory SQLite ────────────────────────────
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,   # All connections share one SQLite in-memory DB
    echo=False,
)

_TestSession = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


async def _override_get_db():
    async with _TestSession() as session:
        yield session


# Replace every route's DB dependency with the test session
app.dependency_overrides[get_db] = _override_get_db


# ── Session-scoped fixtures ────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables once for the session; dispose engine at the end."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await test_engine.dispose()


@pytest_asyncio.fixture(scope="session")
async def client(setup_database):
    """Shared async HTTP client that talks to the test FastAPI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest_asyncio.fixture(scope="session")
async def teacher_tokens(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "t_auth@test.example",
            "full_name": "Test Teacher",
            "password": "TeacherPass1",
            "role": "teacher",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest_asyncio.fixture(scope="session")
async def student_tokens(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "s_auth@test.example",
            "full_name": "Test Student",
            "password": "StudentPass1",
            "role": "student",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()
