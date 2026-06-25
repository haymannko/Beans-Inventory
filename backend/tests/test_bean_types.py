import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_create_bean_type(client: AsyncClient, admin_token):
    response = await client.post(
        "/api/bean-types",
        json={"name": "ပဲတီစိမ်း", "description": "Green gram"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "ပဲတီစိမ်း"
    assert data["description"] == "Green gram"


@pytest.mark.asyncio
async def test_list_bean_types(client: AsyncClient, admin_token):
    # Create a bean type first
    await client.post(
        "/api/bean-types",
        json={"name": "ပဲကြီး", "description": "Black gram"},
        headers=auth_header(admin_token),
    )

    response = await client.get("/api/bean-types", headers=auth_header(admin_token))
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_duplicate_bean_type_name(client: AsyncClient, admin_token):
    await client.post(
        "/api/bean-types",
        json={"name": "ပဲတီစိမ်း"},
        headers=auth_header(admin_token),
    )
    response = await client.post(
        "/api/bean-types",
        json={"name": "ပဲတီစိမ်း"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_update_bean_type(client: AsyncClient, admin_token):
    create_resp = await client.post(
        "/api/bean-types",
        json={"name": "ရှမ်းပဲပုတ်"},
        headers=auth_header(admin_token),
    )
    bean_type_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/bean-types/{bean_type_id}",
        json={"name": "ရှမ်းပဲပုတ် Updated"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert response.json()["name"] == "ရှမ်းပဲပုတ် Updated"


@pytest.mark.asyncio
async def test_delete_bean_type(client: AsyncClient, admin_token):
    create_resp = await client.post(
        "/api/bean-types",
        json={"name": "ပဲလွန်းဖြူ"},
        headers=auth_header(admin_token),
    )
    bean_type_id = create_resp.json()["id"]

    response = await client.delete(f"/api/bean-types/{bean_type_id}", headers=auth_header(admin_token))
    assert response.status_code == 200
