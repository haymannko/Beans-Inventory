import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


@pytest.fixture
async def bean_type_id(client: AsyncClient, admin_token) -> str:
    resp = await client.post(
        "/api/bean-types",
        json={"name": "Warehouse Test Bean"},
        headers=auth_header(admin_token),
    )
    return resp.json()["id"]


@pytest.fixture
async def warehouse_a(client: AsyncClient, admin_token) -> dict:
    resp = await client.post(
        "/api/warehouses",
        json={"name": "Main Warehouse", "location": "Yangon", "contact_person": "U Aung"},
        headers=auth_header(admin_token),
    )
    return resp.json()


@pytest.fixture
async def warehouse_b(client: AsyncClient, admin_token) -> dict:
    resp = await client.post(
        "/api/warehouses",
        json={"name": "Secondary Warehouse", "location": "Mandalay", "phone": "09-123456"},
        headers=auth_header(admin_token),
    )
    return resp.json()


# ─── Warehouse CRUD ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_warehouse_minimal(client: AsyncClient, admin_token):
    resp = await client.post(
        "/api/warehouses",
        json={"name": "Test Warehouse"},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Warehouse"
    assert data["is_active"] is True
    assert data["storage_count"] == 0


@pytest.mark.asyncio
async def test_create_warehouse_full(client: AsyncClient, admin_token):
    resp = await client.post(
        "/api/warehouses",
        json={
            "name": "Full Warehouse",
            "location": "Naypyitaw",
            "contact_person": "Daw Hla",
            "phone": "09-987654",
            "notes": "Main storage facility",
        },
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 201
    assert resp.json()["location"] == "Naypyitaw"
    assert resp.json()["contact_person"] == "Daw Hla"
    assert resp.json()["phone"] == "09-987654"


@pytest.mark.asyncio
async def test_create_warehouse_duplicate_name(client: AsyncClient, admin_token):
    await client.post("/api/warehouses", json={"name": "Unique WH"}, headers=auth_header(admin_token))
    resp = await client.post("/api/warehouses", json={"name": "Unique WH"}, headers=auth_header(admin_token))
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_create_warehouse_empty_name(client: AsyncClient, admin_token):
    resp = await client.post("/api/warehouses", json={"name": ""}, headers=auth_header(admin_token))
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_warehouses(client: AsyncClient, admin_token, warehouse_a, warehouse_b):
    resp = await client.get("/api/warehouses", headers=auth_header(admin_token))
    assert resp.status_code == 200
    names = [w["name"] for w in resp.json()]
    assert "Main Warehouse" in names
    assert "Secondary Warehouse" in names


@pytest.mark.asyncio
async def test_search_warehouses(client: AsyncClient, admin_token):
    await client.post("/api/warehouses", json={"name": "Searchable WH", "location": "Bago"},
                      headers=auth_header(admin_token))

    resp = await client.get("/api/warehouses?search=searchable", headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = await client.get("/api/warehouses?search=Bago", headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_get_warehouse(client: AsyncClient, admin_token, warehouse_a):
    resp = await client.get(f"/api/warehouses/{warehouse_a['id']}", headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.json()["name"] == "Main Warehouse"


@pytest.mark.asyncio
async def test_get_warehouse_not_found(client: AsyncClient, admin_token):
    resp = await client.get(
        "/api/warehouses/00000000-0000-0000-0000-000000000000",
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_warehouse(client: AsyncClient, admin_token, warehouse_a):
    wid = warehouse_a["id"]
    resp = await client.put(
        f"/api/warehouses/{wid}",
        json={"name": "Updated WH", "location": "New Location"},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated WH"
    assert resp.json()["location"] == "New Location"


@pytest.mark.asyncio
async def test_update_warehouse_duplicate_name(client: AsyncClient, admin_token, warehouse_a, warehouse_b):
    wid = warehouse_a["id"]
    resp = await client.put(
        f"/api/warehouses/{wid}",
        json={"name": warehouse_b["name"]},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_delete_warehouse_without_storage(client: AsyncClient, admin_token):
    create = await client.post("/api/warehouses", json={"name": "Delete WH"}, headers=auth_header(admin_token))
    wid = create.json()["id"]

    resp = await client.delete(f"/api/warehouses/{wid}", headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.json()["soft_delete"] is False

    get = await client.get(f"/api/warehouses/{wid}", headers=auth_header(admin_token))
    assert get.status_code == 404


@pytest.mark.asyncio
async def test_delete_warehouse_with_storage_soft_delete(
    client: AsyncClient, admin_token, warehouse_a, bean_type_id
):
    wid = warehouse_a["id"]

    # Add storage record linked to this warehouse
    await client.post(
        "/api/storages",
        json={
            "bean_type_id": bean_type_id,
            "quantity_bags": 50,
            "quantity": 500.0,
            "warehouse_id": wid,
            "storage_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )

    resp = await client.delete(f"/api/warehouses/{wid}", headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.json()["soft_delete"] is True

    get = await client.get(f"/api/warehouses/{wid}", headers=auth_header(admin_token))
    assert get.status_code == 200
    assert get.json()["is_active"] is False


@pytest.mark.asyncio
async def test_reactivate_warehouse(
    client: AsyncClient, admin_token, warehouse_a, bean_type_id
):
    wid = warehouse_a["id"]

    # Add storage so delete triggers soft-delete
    await client.post(
        "/api/storages",
        json={
            "bean_type_id": bean_type_id,
            "quantity_bags": 10, "quantity": 100.0,
            "warehouse_id": wid, "storage_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )
    await client.delete(f"/api/warehouses/{wid}", headers=auth_header(admin_token))

    resp = await client.put(
        f"/api/warehouses/{wid}", json={"is_active": True}, headers=auth_header(admin_token)
    )
    assert resp.status_code == 200
    assert resp.json()["is_active"] is True


@pytest.mark.asyncio
async def test_warehouse_pagination(client: AsyncClient, admin_token):
    for i in range(3):
        await client.post(
            "/api/warehouses", json={"name": f"Page WH {i}"}, headers=auth_header(admin_token)
        )

    resp = await client.get("/api/warehouses?skip=0&limit=2", headers=auth_header(admin_token))
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_warehouse_inventory(
    client: AsyncClient, admin_token, warehouse_a, bean_type_id
):
    wid = warehouse_a["id"]

    # Add storage
    await client.post(
        "/api/storages",
        json={
            "bean_type_id": bean_type_id,
            "quantity_bags": 100,
            "quantity": 1000.0,
            "warehouse_id": wid,
            "storage_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )

    resp = await client.get(f"/api/warehouses/{wid}/inventory", headers=auth_header(admin_token))
    assert resp.status_code == 200
    inventory = resp.json()
    assert len(inventory) >= 1
    item = next(i for i in inventory if i["bean_type_id"] == bean_type_id)
    assert item["quantity_bags"] == 100
    assert item["quantity"] == 1000.0


@pytest.mark.asyncio
async def test_unauthorized_access(client: AsyncClient):
    resp = await client.get("/api/warehouses")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_staff_can_manage(client: AsyncClient, staff_token):
    create = await client.post(
        "/api/warehouses", json={"name": "Staff WH"}, headers=auth_header(staff_token)
    )
    assert create.status_code == 201

    lst = await client.get("/api/warehouses", headers=auth_header(staff_token))
    assert lst.status_code == 200


# ─── Warehouse Transfers ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_transfer(
    client: AsyncClient, admin_token, warehouse_a, warehouse_b, bean_type_id
):
    # Add storage to warehouse_a
    await client.post(
        "/api/storages",
        json={
            "bean_type_id": bean_type_id,
            "quantity_bags": 50,
            "quantity": 500.0,
            "warehouse_id": warehouse_a["id"],
            "storage_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )

    resp = await client.post(
        "/api/transfers",
        json={
            "from_warehouse_id": warehouse_a["id"],
            "to_warehouse_id": warehouse_b["id"],
            "bean_type_id": bean_type_id,
            "quantity_bags": 20,
            "quantity": 200.0,
            "transfer_date": "2026-07-23",
            "notes": "Test transfer",
        },
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["from_warehouse_name"] == "Main Warehouse"
    assert data["to_warehouse_name"] == "Secondary Warehouse"
    assert data["quantity_bags"] == 20
    assert data["bean_type_name"] == "Warehouse Test Bean"


@pytest.mark.asyncio
async def test_create_transfer_insufficient_stock(
    client: AsyncClient, admin_token, warehouse_a, warehouse_b, bean_type_id
):
    resp = await client.post(
        "/api/transfers",
        json={
            "from_warehouse_id": warehouse_a["id"],
            "to_warehouse_id": warehouse_b["id"],
            "bean_type_id": bean_type_id,
            "quantity_bags": 9999,
            "quantity": 99999.0,
            "transfer_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 400
    assert "Insufficient" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_create_transfer_same_warehouse(
    client: AsyncClient, admin_token, warehouse_a, bean_type_id
):
    resp = await client.post(
        "/api/transfers",
        json={
            "from_warehouse_id": warehouse_a["id"],
            "to_warehouse_id": warehouse_a["id"],
            "bean_type_id": bean_type_id,
            "quantity_bags": 10,
            "quantity": 100.0,
            "transfer_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_transfers(
    client: AsyncClient, admin_token, warehouse_a, warehouse_b, bean_type_id
):
    await client.post(
        "/api/storages",
        json={
            "bean_type_id": bean_type_id,
            "quantity_bags": 30,
            "quantity": 300.0,
            "warehouse_id": warehouse_a["id"],
            "storage_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )

    await client.post(
        "/api/transfers",
        json={
            "from_warehouse_id": warehouse_a["id"],
            "to_warehouse_id": warehouse_b["id"],
            "bean_type_id": bean_type_id,
            "quantity_bags": 10,
            "quantity": 100.0,
            "transfer_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )

    resp = await client.get("/api/transfers", headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_get_transfer(
    client: AsyncClient, admin_token, warehouse_a, warehouse_b, bean_type_id
):
    await client.post(
        "/api/storages",
        json={
            "bean_type_id": bean_type_id,
            "quantity_bags": 30,
            "quantity": 300.0,
            "warehouse_id": warehouse_a["id"],
            "storage_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )

    create = await client.post(
        "/api/transfers",
        json={
            "from_warehouse_id": warehouse_a["id"],
            "to_warehouse_id": warehouse_b["id"],
            "bean_type_id": bean_type_id,
            "quantity_bags": 5,
            "quantity": 50.0,
            "transfer_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )
    tid = create.json()["id"]

    resp = await client.get(f"/api/transfers/{tid}", headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.json()["quantity_bags"] == 5


@pytest.mark.asyncio
async def test_get_transfer_not_found(client: AsyncClient, admin_token):
    resp = await client.get(
        "/api/transfers/00000000-0000-0000-0000-000000000000",
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_warehouse_transfer_history_endpoint(
    client: AsyncClient, admin_token, warehouse_a, warehouse_b, bean_type_id
):
    await client.post(
        "/api/storages",
        json={
            "bean_type_id": bean_type_id, "quantity_bags": 40, "quantity": 400.0,
            "warehouse_id": warehouse_a["id"], "storage_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )

    await client.post(
        "/api/transfers",
        json={
            "from_warehouse_id": warehouse_a["id"],
            "to_warehouse_id": warehouse_b["id"],
            "bean_type_id": bean_type_id, "quantity_bags": 15, "quantity": 150.0,
            "transfer_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )

    # Check transfer history for source warehouse
    resp = await client.get(
        f"/api/warehouses/{warehouse_a['id']}/transfers",
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_inactive_warehouse_cannot_transfer(
    client: AsyncClient, admin_token, warehouse_a, warehouse_b, bean_type_id
):
    # Deactivate warehouse_a
    await client.put(
        f"/api/warehouses/{warehouse_a['id']}",
        json={"is_active": False},
        headers=auth_header(admin_token),
    )

    resp = await client.post(
        "/api/transfers",
        json={
            "from_warehouse_id": warehouse_a["id"],
            "to_warehouse_id": warehouse_b["id"],
            "bean_type_id": bean_type_id,
            "quantity_bags": 10, "quantity": 100.0,
            "transfer_date": "2026-07-23",
        },
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 400
