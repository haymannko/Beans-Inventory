import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, admin_user):
    response = await client.post("/api/auth/login", json={"username": "testadmin", "password": "testpass123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    response = await client.post("/api/auth/login", json={"username": "wrong", "password": "wrong"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient, admin_token):
    response = await client.get("/api/auth/me", headers=auth_header(admin_token))
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testadmin"
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_unauthorized_access(client: AsyncClient):
    response = await client.get("/api/auth/me")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient, admin_token):
    response = await client.post(
        "/api/auth/change-password",
        json={"current_password": "testpass123", "new_password": "newpass123"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Password changed successfully"
