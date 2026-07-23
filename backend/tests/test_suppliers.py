import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


@pytest.fixture
async def bean_type_id(client: AsyncClient, admin_token) -> str:
    """Create a bean type for testing."""
    resp = await client.post(
        "/api/bean-types",
        json={"name": "Test Bean for Supplier"},
        headers=auth_header(admin_token),
    )
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_create_supplier_minimal(client: AsyncClient, admin_token):
    """Create a supplier with minimal required fields."""
    response = await client.post(
        "/api/suppliers",
        json={"company_name": "Test Supplier Co"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["company_name"] == "Test Supplier Co"
    assert data["is_active"] is True
    assert data["contact_person"] is None
    assert data["purchase_order_count"] == 0


@pytest.mark.asyncio
async def test_create_supplier_full(client: AsyncClient, admin_token):
    """Create a supplier with all fields."""
    response = await client.post(
        "/api/suppliers",
        json={
            "company_name": "Full Details Ltd",
            "contact_person": "John Doe",
            "phone": "09-123456789",
            "email": "john@example.com",
            "address": "123 Main St, Yangon",
            "notes": "Preferred supplier",
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["company_name"] == "Full Details Ltd"
    assert data["contact_person"] == "John Doe"
    assert data["phone"] == "09-123456789"
    assert data["email"] == "john@example.com"
    assert data["address"] == "123 Main St, Yangon"
    assert data["notes"] == "Preferred supplier"


@pytest.mark.asyncio
async def test_create_supplier_duplicate_name(client: AsyncClient, admin_token):
    """Creating a supplier with a duplicate company name should fail."""
    await client.post(
        "/api/suppliers",
        json={"company_name": "Unique Co"},
        headers=auth_header(admin_token),
    )
    response = await client.post(
        "/api/suppliers",
        json={"company_name": "Unique Co"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_list_suppliers(client: AsyncClient, admin_token):
    """List all suppliers."""
    await client.post(
        "/api/suppliers",
        json={"company_name": "Alpha Corp"},
        headers=auth_header(admin_token),
    )
    await client.post(
        "/api/suppliers",
        json={"company_name": "Beta Corp"},
        headers=auth_header(admin_token),
    )

    response = await client.get("/api/suppliers", headers=auth_header(admin_token))
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    # Should be sorted alphabetically
    names = [s["company_name"] for s in data if s["company_name"] in ("Alpha Corp", "Beta Corp")]
    assert names == sorted(names)


@pytest.mark.asyncio
async def test_search_suppliers(client: AsyncClient, admin_token):
    """Search suppliers by company_name."""
    await client.post(
        "/api/suppliers",
        json={"company_name": "Myanmar Bean Traders"},
        headers=auth_header(admin_token),
    )
    await client.post(
        "/api/suppliers",
        json={"company_name": "Yangon Supply Co"},
        headers=auth_header(admin_token),
    )

    response = await client.get(
        "/api/suppliers?search=myanmar",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert all("myanmar" in s["company_name"].lower() for s in data)


@pytest.mark.asyncio
async def test_search_suppliers_by_contact(client: AsyncClient, admin_token):
    """Search suppliers by contact_person."""
    await client.post(
        "/api/suppliers",
        json={"company_name": "Contact Inc", "contact_person": "Jane Smith"},
        headers=auth_header(admin_token),
    )

    response = await client.get(
        "/api/suppliers?search=jane",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["contact_person"] == "Jane Smith"


@pytest.mark.asyncio
async def test_suppliers_pagination(client: AsyncClient, admin_token):
    """Pagination should limit and offset results."""
    for i in range(5):
        await client.post(
            "/api/suppliers",
            json={"company_name": f"Pagination Supplier {i}"},
            headers=auth_header(admin_token),
        )

    response = await client.get(
        "/api/suppliers?skip=0&limit=2",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert len(response.json()) == 2


@pytest.mark.asyncio
async def test_get_supplier(client: AsyncClient, admin_token):
    """Get a single supplier by ID."""
    create_resp = await client.post(
        "/api/suppliers",
        json={"company_name": "Single Supplier"},
        headers=auth_header(admin_token),
    )
    supplier_id = create_resp.json()["id"]

    response = await client.get(f"/api/suppliers/{supplier_id}", headers=auth_header(admin_token))
    assert response.status_code == 200
    assert response.json()["company_name"] == "Single Supplier"


@pytest.mark.asyncio
async def test_get_supplier_not_found(client: AsyncClient, admin_token):
    """Getting a non-existent supplier should 404."""
    response = await client.get(
        "/api/suppliers/00000000-0000-0000-0000-000000000000",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_supplier(client: AsyncClient, admin_token):
    """Update a supplier's fields."""
    create_resp = await client.post(
        "/api/suppliers",
        json={"company_name": "Old Name Co"},
        headers=auth_header(admin_token),
    )
    supplier_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/suppliers/{supplier_id}",
        json={"company_name": "New Name Co", "contact_person": "Updated Person"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["company_name"] == "New Name Co"
    assert data["contact_person"] == "Updated Person"


@pytest.mark.asyncio
async def test_update_supplier_duplicate_name(client: AsyncClient, admin_token):
    """Updating to a duplicate company name should fail."""
    await client.post(
        "/api/suppliers",
        json={"company_name": "Existing Co"},
        headers=auth_header(admin_token),
    )
    create_resp = await client.post(
        "/api/suppliers",
        json={"company_name": "Change Me Co"},
        headers=auth_header(admin_token),
    )
    supplier_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/suppliers/{supplier_id}",
        json={"company_name": "Existing Co"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_delete_supplier_no_pos(client: AsyncClient, admin_token):
    """Delete a supplier with no purchase orders (hard delete)."""
    create_resp = await client.post(
        "/api/suppliers",
        json={"company_name": "Delete Me Co"},
        headers=auth_header(admin_token),
    )
    supplier_id = create_resp.json()["id"]

    response = await client.delete(f"/api/suppliers/{supplier_id}", headers=auth_header(admin_token))
    assert response.status_code == 200
    data = response.json()
    assert data["soft_delete"] is False

    # Verify it's gone
    get_resp = await client.get(f"/api/suppliers/{supplier_id}", headers=auth_header(admin_token))
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_supplier_with_pos_soft_delete(
    client: AsyncClient, admin_token, bean_type_id
):
    """Delete a supplier with POs — should soft-delete (deactivate)."""
    create_resp = await client.post(
        "/api/suppliers",
        json={"company_name": "Has Orders Co"},
        headers=auth_header(admin_token),
    )
    supplier_id = create_resp.json()["id"]

    # Create a PO linked to this supplier
    await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Has Orders Co",
            "supplier_id": supplier_id,
            "order_date": "2026-07-23",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )

    # Delete — should soft delete
    response = await client.delete(f"/api/suppliers/{supplier_id}", headers=auth_header(admin_token))
    assert response.status_code == 200
    data = response.json()
    assert data["soft_delete"] is True

    # Should still be findable but not active
    get_resp = await client.get(f"/api/suppliers/{supplier_id}", headers=auth_header(admin_token))
    assert get_resp.status_code == 200
    assert get_resp.json()["is_active"] is False


@pytest.mark.asyncio
async def test_reactivate_supplier(
    client: AsyncClient, admin_token, bean_type_id
):
    """Reactivate a soft-deleted supplier."""
    create_resp = await client.post(
        "/api/suppliers",
        json={"company_name": "Reactivate Me Co"},
        headers=auth_header(admin_token),
    )
    supplier_id = create_resp.json()["id"]

    # Create PO to make it soft-deletable
    await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Reactivate Me Co",
            "supplier_id": supplier_id,
            "order_date": "2026-07-23",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )

    # Soft delete
    await client.delete(f"/api/suppliers/{supplier_id}", headers=auth_header(admin_token))

    # Reactivate via update
    response = await client.put(
        f"/api/suppliers/{supplier_id}",
        json={"is_active": True},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is True


@pytest.mark.asyncio
async def test_supplier_active_only_filter(
    client: AsyncClient, admin_token, bean_type_id
):
    """The active_only filter should exclude soft-deleted suppliers by default."""
    create_resp = await client.post(
        "/api/suppliers",
        json={"company_name": "Inactive Supplier"},
        headers=auth_header(admin_token),
    )
    supplier_id = create_resp.json()["id"]

    # Create PO so it soft-deletes
    await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Inactive Supplier",
            "supplier_id": supplier_id,
            "order_date": "2026-07-23",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )
    await client.delete(f"/api/suppliers/{supplier_id}", headers=auth_header(admin_token))

    # Default list should not include it
    response = await client.get("/api/suppliers", headers=auth_header(admin_token))
    names = [s["company_name"] for s in response.json()]
    assert "Inactive Supplier" not in names


@pytest.mark.asyncio
async def test_supplier_purchase_order_history(
    client: AsyncClient, admin_token, bean_type_id
):
    """Supplier response should include purchase order count and recent POs."""
    create_resp = await client.post(
        "/api/suppliers",
        json={"company_name": "History Supplier"},
        headers=auth_header(admin_token),
    )
    supplier_id = create_resp.json()["id"]

    # Create a PO linked to this supplier
    await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "History Supplier",
            "supplier_id": supplier_id,
            "order_date": "2026-07-23",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )

    # Get supplier — should include PO history
    response = await client.get(f"/api/suppliers/{supplier_id}", headers=auth_header(admin_token))
    assert response.status_code == 200
    data = response.json()
    assert data["purchase_order_count"] >= 1
    assert len(data["recent_purchase_orders"]) >= 1
    assert data["recent_purchase_orders"][0]["po_number"].startswith("PO-")


@pytest.mark.asyncio
async def test_supplier_create_with_empty_name(client: AsyncClient, admin_token):
    """Creating a supplier with empty company_name should fail."""
    response = await client.post(
        "/api/suppliers",
        json={"company_name": ""},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_unauthorized_access(client: AsyncClient):
    """Access without token should 401."""
    response = await client.get("/api/suppliers")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_staff_can_manage_suppliers(client: AsyncClient, staff_token):
    """Staff users should be able to create and list suppliers."""
    create_resp = await client.post(
        "/api/suppliers",
        json={"company_name": "Staff Supplier"},
        headers=auth_header(staff_token),
    )
    assert create_resp.status_code == 201

    list_resp = await client.get("/api/suppliers", headers=auth_header(staff_token))
    assert list_resp.status_code == 200


@pytest.mark.asyncio
async def test_create_po_with_supplier_id(
    client: AsyncClient, admin_token, bean_type_id
):
    """Creating a PO with supplier_id should auto-populate supplier_name."""
    supplier_resp = await client.post(
        "/api/suppliers",
        json={"company_name": "PO Supplier Test"},
        headers=auth_header(admin_token),
    )
    supplier_id = supplier_resp.json()["id"]

    po_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "dummy",  # Will be overridden
            "supplier_id": supplier_id,
            "order_date": "2026-07-23",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )
    assert po_resp.status_code == 201
    data = po_resp.json()
    assert data["supplier_id"] == supplier_id
    assert data["supplier_name"] == "PO Supplier Test"


@pytest.mark.asyncio
async def test_create_po_with_invalid_supplier_id(
    client: AsyncClient, admin_token, bean_type_id
):
    """Creating a PO with an invalid supplier_id should fail."""
    response = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "dummy",
            "supplier_id": "00000000-0000-0000-0000-000000000000",
            "order_date": "2026-07-23",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 404
