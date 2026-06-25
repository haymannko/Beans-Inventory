import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_stock_calculation(client: AsyncClient, admin_token):
    # Create bean type
    bt_resp = await client.post(
        "/api/bean-types",
        json={"name": "ပဲတီစိမ်း"},
        headers=auth_header(admin_token),
    )
    bean_type_id = bt_resp.json()["id"]

    # Create arrival: +500 kg
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

    # Create sale: -100 kg
    await client.post(
        "/api/sales",
        json={
            "bean_type_id": bean_type_id,
            "quantity": 100.0,
            "sale_date": "2026-06-24",
        },
        headers=auth_header(admin_token),
    )

    # Create adjustment: +50 kg
    await client.post(
        "/api/adjustments",
        json={
            "bean_type_id": bean_type_id,
            "quantity": 50.0,
            "adjustment_type": "increase",
            "reason": "Found extra stock",
            "adjustment_date": "2026-06-24",
        },
        headers=auth_header(admin_token),
    )

    # Check dashboard
    response = await client.get("/api/dashboard", headers=auth_header(admin_token))
    assert response.status_code == 200
    data = response.json()
    assert data["total_bean_types"] >= 1


@pytest.mark.asyncio
async def test_dashboard_endpoint(client: AsyncClient, admin_token):
    response = await client.get("/api/dashboard", headers=auth_header(admin_token))
    assert response.status_code == 200
    data = response.json()
    assert "total_bean_types" in data
    assert "total_current_stock" in data
    assert "today_arrivals" in data
    assert "today_sales" in data


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
