import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


@pytest.fixture
async def bean_type_id(client: AsyncClient, admin_token) -> str:
    """Create a bean type for testing."""
    resp = await client.post(
        "/api/bean-types",
        json={"name": "Test Bean for PO"},
        headers=auth_header(admin_token),
    )
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_create_purchase_order(client: AsyncClient, admin_token, bean_type_id):
    """Create a draft purchase order with items."""
    response = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Test Supplier",
            "order_date": "2026-07-22",
            "items": [
                {
                    "bean_type_id": bean_type_id,
                    "quantity_bags": 100,
                    "unit_price": 5000.0,
                }
            ],
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["supplier_name"] == "Test Supplier"
    assert data["status"] == "draft"
    assert data["po_number"].startswith("PO-")
    assert len(data["items"]) == 1
    assert data["items"][0]["quantity_bags"] == 100
    assert data["items"][0]["unit_price"] == 5000.0
    assert data["items"][0]["total_price"] == 500000.0  # 100 * 5000


@pytest.mark.asyncio
async def test_create_purchase_order_no_items(client: AsyncClient, admin_token):
    """Creating a PO without items should fail."""
    response = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Test",
            "order_date": "2026-07-22",
            "items": [],
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_list_purchase_orders(client: AsyncClient, admin_token, bean_type_id):
    """List all purchase orders."""
    # Create one first
    await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Supplier A",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )

    response = await client.get("/api/purchase-orders", headers=auth_header(admin_token))
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_filter_purchase_orders_by_status(client: AsyncClient, admin_token, bean_type_id):
    """Filter purchase orders by status."""
    await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Filter Test",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 5, "unit_price": 200}],
        },
        headers=auth_header(admin_token),
    )

    response = await client.get(
        "/api/purchase-orders?status=draft",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert all(po["status"] == "draft" for po in response.json())


@pytest.mark.asyncio
async def test_get_single_purchase_order(client: AsyncClient, admin_token, bean_type_id):
    """Get a single purchase order by ID."""
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Single PO Test",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 50, "unit_price": 1000}],
        },
        headers=auth_header(admin_token),
    )
    po_id = create_resp.json()["id"]

    response = await client.get(f"/api/purchase-orders/{po_id}", headers=auth_header(admin_token))
    assert response.status_code == 200
    assert response.json()["id"] == po_id
    assert response.json()["supplier_name"] == "Single PO Test"


@pytest.mark.asyncio
async def test_get_purchase_order_not_found(client: AsyncClient, admin_token):
    """Getting a non-existent PO should 404."""
    response = await client.get(
        "/api/purchase-orders/00000000-0000-0000-0000-000000000000",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_purchase_order(client: AsyncClient, admin_token, bean_type_id):
    """Update a draft purchase order."""
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Old Supplier",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )
    po_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/purchase-orders/{po_id}",
        json={
            "supplier_name": "Updated Supplier",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 20, "unit_price": 200}],
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["supplier_name"] == "Updated Supplier"
    assert len(data["items"]) == 1
    assert data["items"][0]["quantity_bags"] == 20


@pytest.mark.asyncio
async def test_delete_draft_purchase_order(client: AsyncClient, admin_token, bean_type_id):
    """Delete a draft purchase order."""
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "To Delete",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )
    po_id = create_resp.json()["id"]

    response = await client.delete(f"/api/purchase-orders/{po_id}", headers=auth_header(admin_token))
    assert response.status_code == 200

    # Verify it's gone
    get_resp = await client.get(f"/api/purchase-orders/{po_id}", headers=auth_header(admin_token))
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_non_draft_fails(client: AsyncClient, admin_token, bean_type_id):
    """Deleting a non-draft PO should fail."""
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Cannot Delete",
            "order_date": "2026-07-22",
            "status": "approved",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )
    po_id = create_resp.json()["id"]

    response = await client.delete(f"/api/purchase-orders/{po_id}", headers=auth_header(admin_token))
    assert response.status_code == 400
    assert "draft" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_status_transition_draft_to_approved(client: AsyncClient, admin_token, bean_type_id):
    """Valid transition: draft -> approved."""
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Status Test",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )
    po_id = create_resp.json()["id"]

    response = await client.patch(
        f"/api/purchase-orders/{po_id}/status",
        json={"status": "approved"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "approved"


@pytest.mark.asyncio
async def test_status_transition_draft_to_cancelled(client: AsyncClient, admin_token, bean_type_id):
    """Valid transition: draft -> cancelled."""
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Cancel Test",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )
    po_id = create_resp.json()["id"]

    response = await client.patch(
        f"/api/purchase-orders/{po_id}/status",
        json={"status": "cancelled"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_status_transition_invalid(client: AsyncClient, admin_token, bean_type_id):
    """Invalid transition: draft -> received should fail."""
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Invalid Test",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )
    po_id = create_resp.json()["id"]

    response = await client.patch(
        f"/api/purchase-orders/{po_id}/status",
        json={"status": "received"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_full_workflow_draft_to_received(client: AsyncClient, admin_token, bean_type_id):
    """Full workflow: draft -> approved -> ordered -> received with stock update."""
    # Create draft
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Full Workflow",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 30, "unit_price": 2000}],
        },
        headers=auth_header(admin_token),
    )
    po_id = create_resp.json()["id"]
    assert create_resp.json()["status"] == "draft"

    # Approve
    resp = await client.patch(
        f"/api/purchase-orders/{po_id}/status",
        json={"status": "approved"},
        headers=auth_header(admin_token),
    )
    assert resp.json()["status"] == "approved"

    # Order
    resp = await client.patch(
        f"/api/purchase-orders/{po_id}/status",
        json={"status": "ordered"},
        headers=auth_header(admin_token),
    )
    assert resp.json()["status"] == "ordered"

    # Receive
    resp = await client.patch(
        f"/api/purchase-orders/{po_id}/status",
        json={"status": "received"},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "received"

    # Verify stock was updated (arrival created)
    arrivals_resp = await client.get(
        "/api/arrivals",
        headers=auth_header(admin_token),
    )
    arrivals = arrivals_resp.json()
    po_arrivals = [a for a in arrivals if "From PO" in (a.get("remarks") or "")]
    assert len(po_arrivals) >= 1


@pytest.mark.asyncio
async def test_partial_receive_items(client: AsyncClient, admin_token, bean_type_id):
    """Receive items partially via the receive endpoint."""
    # Create and transition to ordered
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Partial Receive",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 50, "unit_price": 1000}],
        },
        headers=auth_header(admin_token),
    )
    po_id = create_resp.json()["id"]
    item_id = create_resp.json()["items"][0]["id"]

    await client.patch(
        f"/api/purchase-orders/{po_id}/status",
        json={"status": "approved"},
        headers=auth_header(admin_token),
    )
    await client.patch(
        f"/api/purchase-orders/{po_id}/status",
        json={"status": "ordered"},
        headers=auth_header(admin_token),
    )

    # Partial receive: 20 of 50 bags
    resp = await client.post(
        f"/api/purchase-orders/{po_id}/receive",
        json={"items": [{"item_id": item_id, "received_quantity_bags": 20}]},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ordered"  # Still ordered (not fully received)
    assert resp.json()["items"][0]["received_quantity_bags"] == 20

    # Receive remaining 30 bags
    resp = await client.post(
        f"/api/purchase-orders/{po_id}/receive",
        json={"items": [{"item_id": item_id, "received_quantity_bags": 30}]},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "received"  # Auto-transitioned
    assert resp.json()["items"][0]["received_quantity_bags"] == 50


@pytest.mark.asyncio
async def test_receive_exceeds_ordered_quantity(client: AsyncClient, admin_token, bean_type_id):
    """Receiving more than ordered should fail."""
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Exceed Test",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )
    po_id = create_resp.json()["id"]
    item_id = create_resp.json()["items"][0]["id"]

    await client.patch(
        f"/api/purchase-orders/{po_id}/status",
        json={"status": "approved"},
        headers=auth_header(admin_token),
    )
    await client.patch(
        f"/api/purchase-orders/{po_id}/status",
        json={"status": "ordered"},
        headers=auth_header(admin_token),
    )

    resp = await client.post(
        f"/api/purchase-orders/{po_id}/receive",
        json={"items": [{"item_id": item_id, "received_quantity_bags": 20}]},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_receive_non_ordered_fails(client: AsyncClient, admin_token, bean_type_id):
    """Receiving items on a non-ordered PO should fail."""
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Not Ordered",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )
    po_id = create_resp.json()["id"]

    resp = await client.post(
        f"/api/purchase-orders/{po_id}/receive",
        json={"items": [{"item_id": create_resp.json()["items"][0]["id"], "received_quantity_bags": 5}]},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_cancelled_po_no_transitions(client: AsyncClient, admin_token, bean_type_id):
    """A cancelled PO cannot transition to any status."""
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Cancelled",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )
    po_id = create_resp.json()["id"]

    await client.patch(
        f"/api/purchase-orders/{po_id}/status",
        json={"status": "cancelled"},
        headers=auth_header(admin_token),
    )

    # Try to approve a cancelled PO — should fail
    resp = await client.patch(
        f"/api/purchase-orders/{po_id}/status",
        json={"status": "approved"},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_update_non_draft_fails(client: AsyncClient, admin_token, bean_type_id):
    """Updating a non-draft/non-approved PO should fail."""
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Locked PO",
            "order_date": "2026-07-22",
            "status": "approved",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )
    po_id = create_resp.json()["id"]

    # Transition to ordered
    await client.patch(
        f"/api/purchase-orders/{po_id}/status",
        json={"status": "ordered"},
        headers=auth_header(admin_token),
    )

    # Try to update
    resp = await client.put(
        f"/api/purchase-orders/{po_id}",
        json={"supplier_name": "Hacker"},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_received_po_no_further_transitions(client: AsyncClient, admin_token, bean_type_id):
    """A received PO should not allow any further transitions."""
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Done",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )
    po_id = create_resp.json()["id"]

    await client.patch(f"/api/purchase-orders/{po_id}/status", json={"status": "approved"}, headers=auth_header(admin_token))
    await client.patch(f"/api/purchase-orders/{po_id}/status", json={"status": "ordered"}, headers=auth_header(admin_token))
    await client.patch(f"/api/purchase-orders/{po_id}/status", json={"status": "received"}, headers=auth_header(admin_token))

    resp = await client.patch(
        f"/api/purchase-orders/{po_id}/status",
        json={"status": "cancelled"},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_staff_can_create_and_list(client: AsyncClient, staff_token, bean_type_id):
    """Staff users should be able to create and list POs."""
    create_resp = await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "Staff PO",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(staff_token),
    )
    assert create_resp.status_code == 201

    list_resp = await client.get("/api/purchase-orders", headers=auth_header(staff_token))
    assert list_resp.status_code == 200


@pytest.mark.asyncio
async def test_po_number_sequential(client: AsyncClient, admin_token, bean_type_id):
    """PO numbers should be sequential."""
    po1 = await client.post(
        "/api/purchase-orders",
        json={"supplier_name": "Seq1", "order_date": "2026-07-22", "items": [{"bean_type_id": bean_type_id, "quantity_bags": 1, "unit_price": 1}]},
        headers=auth_header(admin_token),
    )
    po2 = await client.post(
        "/api/purchase-orders",
        json={"supplier_name": "Seq2", "order_date": "2026-07-22", "items": [{"bean_type_id": bean_type_id, "quantity_bags": 1, "unit_price": 1}]},
        headers=auth_header(admin_token),
    )
    num1 = int(po1.json()["po_number"].split("-")[-1])
    num2 = int(po2.json()["po_number"].split("-")[-1])
    assert num2 == num1 + 1


@pytest.mark.asyncio
async def test_search_purchase_orders(client: AsyncClient, admin_token, bean_type_id):
    """Search purchase orders by supplier name."""
    await client.post(
        "/api/purchase-orders",
        json={
            "supplier_name": "UniqueSupplierXYZ",
            "order_date": "2026-07-22",
            "items": [{"bean_type_id": bean_type_id, "quantity_bags": 10, "unit_price": 100}],
        },
        headers=auth_header(admin_token),
    )

    response = await client.get(
        "/api/purchase-orders?search=UniqueSupplierXYZ",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert len(response.json()) >= 1
    assert response.json()[0]["supplier_name"] == "UniqueSupplierXYZ"


@pytest.mark.asyncio
async def test_unauthorized_access(client: AsyncClient):
    """Access without token should 401."""
    response = await client.get("/api/purchase-orders")
    assert response.status_code == 401
