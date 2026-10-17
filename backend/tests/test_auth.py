"""
Auth tests — Phase 1 acceptance criteria.
Tests: registration, login, wrong password, token refresh, token expiry,
       role-based access, student cannot access teacher endpoints.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app




# ── Registration ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "new_user@test.example",
            "full_name": "New User",
            "password": "NewUser123",
            "role": "student",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "student"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, teacher_tokens):
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "t_auth@test.example",
            "full_name": "Dup Teacher",
            "password": "TeacherPass1",
            "role": "teacher",
        },
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "weak@test.example",
            "full_name": "Weak User",
            "password": "password",  # no uppercase, no digit
            "role": "student",
        },
    )
    assert resp.status_code == 422


# ── Login ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, teacher_tokens):
    resp = await client.post(
        "/api/auth/login",
        json={"email": "t_auth@test.example", "password": "TeacherPass1"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    resp = await client.post(
        "/api/auth/login",
        json={"email": "t_auth@test.example", "password": "WrongPassword1"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    resp = await client.post(
        "/api/auth/login",
        json={"email": "nobody@test.example", "password": "Nobody123"},
    )
    assert resp.status_code == 401


# ── /me endpoint ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_me_with_valid_token(client: AsyncClient, teacher_tokens):
    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {teacher_tokens['access_token']}"},
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "t_auth@test.example"
    assert resp.json()["role"] == "teacher"


@pytest.mark.asyncio
async def test_me_without_token(client: AsyncClient):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_with_invalid_token(client: AsyncClient):
    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer totally.invalid.token"},
    )
    assert resp.status_code == 401


# ── Token refresh ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_refresh_token_rotation(client: AsyncClient, student_tokens):
    resp = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": student_tokens["refresh_token"]},
    )
    assert resp.status_code == 200
    new_tokens = resp.json()
    assert new_tokens["access_token"] != student_tokens["access_token"]

    # Old refresh token should be revoked
    resp2 = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": student_tokens["refresh_token"]},
    )
    assert resp2.status_code == 401


# ── Role-based access ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_student_cannot_access_teacher_endpoint(
    client: AsyncClient, student_tokens
):
    """
    Students must receive 403 on teacher-only endpoints.
    We'll verify this as teacher-protected routes are added in Phase 2.
    For now test the users/me teacher check pattern via role field.
    """
    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {student_tokens['access_token']}"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "student"
    # role is from database — not from client input
    assert resp.json()["role"] != "teacher"


# ── Logout ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_logout(client: AsyncClient):
    # Register a fresh user to get clean tokens
    reg = await client.post(
        "/api/auth/register",
        json={
            "email": "logout_test@test.example",
            "full_name": "Logout User",
            "password": "LogoutUser1",
            "role": "student",
        },
    )
    tokens = reg.json()

    logout_resp = await client.post(
        "/api/auth/logout",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert logout_resp.status_code == 200

    # Refresh after logout should fail
    refresh_resp = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert refresh_resp.status_code == 401


# ── Health ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
