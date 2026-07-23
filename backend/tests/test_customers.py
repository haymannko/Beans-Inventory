import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


@pytest.fixture
async def bean_type_id(client: AsyncClient, admin_token) -> str:
    resp = await client.post(
        "/api/bean-types",
        json={"name": "Test Bean for Customer"},
        headers=auth_header(admin_token),
    )
    return resp.json()["id"]


@pytest.fixture
async def stock(client: AsyncClient, admin_token, bean_type_id) -> str:
    await client.post(
        "/api/arrivals",
        json={"bean_type_id": bean_type_id, "quantity_bags": 100, "weight_kg": 5000.0, "arrival_date": "2026-07-01"},
        headers=auth_header(admin_token),
    )
    return bean_type_id


@pytest.mark.asyncio
async def test_create_customer_minimal(client: AsyncClient, admin_token):
    resp = await client.post(
        "/api/customers",
        json={"name": "Test Customer"},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Customer"
    assert data["is_active"] is True
    assert data["sale_count"] == 0
    assert data["total_purchases"] == 0


@pytest.mark.asyncio
async def test_create_customer_full(client: AsyncClient, admin_token):
    resp = await client.post(
        "/api/customers",
        json={
            "name": "Full Customer Ltd",
            "phone": "09-987654321",
            "email": "customer@example.com",
            "address": "456 Oak St, Yangon",
            "notes": "Regular customer",
        },
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 201
    assert resp.json()["phone"] == "09-987654321"
    assert resp.json()["email"] == "customer@example.com"
    assert resp.json()["address"] == "456 Oak St, Yangon"


@pytest.mark.asyncio
async def test_list_customers(client: AsyncClient, admin_token):
    await client.post("/api/customers", json={"name": "Alpha"}, headers=auth_header(admin_token))
    await client.post("/api/customers", json={"name": "Beta"}, headers=auth_header(admin_token))

    resp = await client.get("/api/customers", headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


@pytest.mark.asyncio
async def test_search_customers(client: AsyncClient, admin_token):
    await client.post(
        "/api/customers", json={"name": "Searchable Co", "phone": "09-111"},
        headers=auth_header(admin_token),
    )

    resp = await client.get("/api/customers?search=searchable", headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_get_customer(client: AsyncClient, admin_token):
    create = await client.post("/api/customers", json={"name": "Get Me"}, headers=auth_header(admin_token))
    cid = create.json()["id"]

    resp = await client.get(f"/api/customers/{cid}", headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.json()["name"] == "Get Me"


@pytest.mark.asyncio
async def test_get_customer_not_found(client: AsyncClient, admin_token):
    resp = await client.get("/api/customers/00000000-0000-0000-0000-000000000000", headers=auth_header(admin_token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_customer(client: AsyncClient, admin_token):
    create = await client.post("/api/customers", json={"name": "Old Name"}, headers=auth_header(admin_token))
    cid = create.json()["id"]

    resp = await client.put(
        f"/api/customers/{cid}",
        json={"name": "New Name", "phone": "09-999"},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"
    assert resp.json()["phone"] == "09-999"


@pytest.mark.asyncio
async def test_update_customer_balance(client: AsyncClient, admin_token):
    create = await client.post("/api/customers", json={"name": "Balance Test"}, headers=auth_header(admin_token))
    cid = create.json()["id"]

    resp = await client.put(
        f"/api/customers/{cid}",
        json={"outstanding_balance": 150000},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 200
    assert float(resp.json()["outstanding_balance"]) == 150000


@pytest.mark.asyncio
async def test_delete_customer_no_sales(client: AsyncClient, admin_token):
    create = await client.post("/api/customers", json={"name": "Delete Me"}, headers=auth_header(admin_token))
    cid = create.json()["id"]

    resp = await client.delete(f"/api/customers/{cid}", headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.json()["soft_delete"] is False

    get = await client.get(f"/api/customers/{cid}", headers=auth_header(admin_token))
    assert get.status_code == 404


@pytest.mark.asyncio
async def test_delete_customer_with_sales_soft_delete(client: AsyncClient, admin_token, stock):
    create = await client.post("/api/customers", json={"name": "Has Sales"}, headers=auth_header(admin_token))
    cid = create.json()["id"]

    await client.post(
        "/api/sales",
        json={
            "bean_type_id": stock,
            "quantity": 50,
            "sale_price": 1000,
            "customer_id": cid,
            "customer_name": "Has Sales",
            "sale_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )

    resp = await client.delete(f"/api/customers/{cid}", headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.json()["soft_delete"] is True

    get = await client.get(f"/api/customers/{cid}", headers=auth_header(admin_token))
    assert get.status_code == 200
    assert get.json()["is_active"] is False


@pytest.mark.asyncio
async def test_reactivate_customer(client: AsyncClient, admin_token, stock):
    create = await client.post("/api/customers", json={"name": "Reactivate"}, headers=auth_header(admin_token))
    cid = create.json()["id"]

    await client.post(
        "/api/sales",
        json={
            "bean_type_id": stock, "quantity": 10, "sale_price": 500,
            "customer_id": cid, "customer_name": "Reactivate", "sale_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )
    await client.delete(f"/api/customers/{cid}", headers=auth_header(admin_token))

    resp = await client.put(f"/api/customers/{cid}", json={"is_active": True}, headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.json()["is_active"] is True


@pytest.mark.asyncio
async def test_customer_sale_history(client: AsyncClient, admin_token, stock):
    create = await client.post("/api/customers", json={"name": "History"}, headers=auth_header(admin_token))
    cid = create.json()["id"]

    await client.post(
        "/api/sales",
        json={
            "bean_type_id": stock, "quantity": 100, "sale_price": 2000,
            "customer_id": cid, "customer_name": "History", "sale_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )

    resp = await client.get(f"/api/customers/{cid}", headers=auth_header(admin_token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["sale_count"] >= 1
    assert data["total_purchases"] >= 2000
    assert len(data["recent_sales"]) >= 1


@pytest.mark.asyncio
async def test_customer_pagination(client: AsyncClient, admin_token):
    for i in range(3):
        await client.post("/api/customers", json={"name": f"Page Customer {i}"}, headers=auth_header(admin_token))

    resp = await client.get("/api/customers?skip=0&limit=2", headers=auth_header(admin_token))
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_unauthorized_access(client: AsyncClient):
    resp = await client.get("/api/customers")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_staff_can_manage(client: AsyncClient, staff_token):
    create = await client.post("/api/customers", json={"name": "Staff Cust"}, headers=auth_header(staff_token))
    assert create.status_code == 201

    list_r = await client.get("/api/customers", headers=auth_header(staff_token))
    assert list_r.status_code == 200


@pytest.mark.asyncio
async def test_create_sale_with_customer_id(client: AsyncClient, admin_token, stock):
    cust = await client.post("/api/customers", json={"name": "Sale Cust"}, headers=auth_header(admin_token))
    cid = cust.json()["id"]

    sale = await client.post(
        "/api/sales",
        json={
            "bean_type_id": stock, "quantity": 10, "sale_price": 500,
            "customer_id": cid, "customer_name": "dummy", "sale_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )
    assert sale.status_code == 201
    assert sale.json()["customer_id"] == cid
    assert sale.json()["customer_name"] == "Sale Cust"
