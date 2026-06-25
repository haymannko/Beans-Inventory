import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_create_sale_with_stock(client: AsyncClient, admin_token):
    # Create bean type
    bt_resp = await client.post(
        "/api/bean-types",
        json={"name": "ပဲတီစိမ်း"},
        headers=auth_header(admin_token),
    )
    bean_type_id = bt_resp.json()["id"]

    # Create arrival first to have stock
    await client.post(
        "/api/arrivals",
        json={
            "bean_type_id": bean_type_id,
            "quantity_bags": 10,
            "weight_kg": 500.0,
            "arrival_date": "2026-06-24",
        },
        headers=auth_header(admin_token),
    )

    # Now create sale
    response = await client.post(
        "/api/sales",
        json={
            "bean_type_id": bean_type_id,
            "quantity": 100.0,
            "customer_name": "Customer A",
            "sale_price": 3000.0,
            "sale_date": "2026-06-24",
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    assert response.json()["quantity"] == 100.0


@pytest.mark.asyncio
async def test_sale_exceeds_stock(client: AsyncClient, admin_token):
    # Create bean type
    bt_resp = await client.post(
        "/api/bean-types",
        json={"name": "ပဲကြီး"},
        headers=auth_header(admin_token),
    )
    bean_type_id = bt_resp.json()["id"]

    # Try to sell without stock
    response = await client.post(
        "/api/sales",
        json={
            "bean_type_id": bean_type_id,
            "quantity": 100.0,
            "sale_date": "2026-06-24",
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 400
    assert "Insufficient stock" in response.json()["detail"]
