import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_create_arrival(client: AsyncClient, admin_token):
    # Create bean type first
    bt_resp = await client.post(
        "/api/bean-types",
        json={"name": "ပဲတီစိမ်း"},
        headers=auth_header(admin_token),
    )
    bean_type_id = bt_resp.json()["id"]

    response = await client.post(
        "/api/arrivals",
        json={
            "bean_type_id": bean_type_id,
            "quantity_bags": 10,
            "weight_kg": 500.0,
            "supplier_name": "Supplier A",
            "purchase_price": 2000.0,
            "arrival_date": "2026-06-24",
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["quantity_bags"] == 10
    assert data["weight_kg"] == 500.0


@pytest.mark.asyncio
async def test_list_arrivals(client: AsyncClient, admin_token):
    response = await client.get("/api/arrivals", headers=auth_header(admin_token))
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_arrival_invalid_bean_type(client: AsyncClient, admin_token):
    response = await client.post(
        "/api/arrivals",
        json={
            "bean_type_id": "00000000-0000-0000-0000-000000000000",
            "quantity_bags": 10,
            "weight_kg": 500.0,
            "arrival_date": "2026-06-24",
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 404
