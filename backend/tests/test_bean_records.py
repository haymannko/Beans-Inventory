import uuid
from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.weight_master import WeightMaster
from tests.conftest import auth_header


@pytest.fixture
async def weight_master_entry(db_session: AsyncSession) -> WeightMaster:
    """Create a weight master entry for testing."""
    wm = WeightMaster(
        id=str(uuid.uuid4()),
        bean_name="ဂျုံ",
        weight=60.0,
    )
    db_session.add(wm)
    await db_session.commit()
    return wm


@pytest.mark.asyncio
async def test_create_bean_record(
    client: AsyncClient,
    admin_token: str,
    weight_master_entry: WeightMaster,
):
    """Test creating a new bean record."""
    response = await client.post(
        "/api/bean-records",
        json={
            "bean_type_id": weight_master_entry.id,
            "date": "2024-01-15",
            "customer_name": "Test Customer",
            "bags": 10,
            "viss": 50.0,
            "price": 1000.0,
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["customer_name"] == "Test Customer"
    assert data["bags"] == 10
    assert data["viss"] == 50.0
    assert data["price"] == 1000.0
    assert data["bean_type_id"] == weight_master_entry.id
    # Verify value calculation: ((60/2) * 10 + 50) * 1000 / 60 = (300 + 50) * 1000 / 60 = 5833.33
    assert abs(data["value"] - 5833.33) < 0.01


@pytest.mark.asyncio
async def test_create_bean_record_validation_negative_bags(
    client: AsyncClient,
    admin_token: str,
    weight_master_entry: WeightMaster,
):
    """Test that negative bags are rejected."""
    response = await client.post(
        "/api/bean-records",
        json={
            "bean_type_id": weight_master_entry.id,
            "date": "2024-01-15",
            "customer_name": "Test Customer",
            "bags": -1,
            "viss": 50.0,
            "price": 1000.0,
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_bean_record_validation_negative_price(
    client: AsyncClient,
    admin_token: str,
    weight_master_entry: WeightMaster,
):
    """Test that zero or negative price is rejected."""
    response = await client.post(
        "/api/bean-records",
        json={
            "bean_type_id": weight_master_entry.id,
            "date": "2024-01-15",
            "customer_name": "Test Customer",
            "bags": 10,
            "viss": 50.0,
            "price": 0,
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_list_bean_records(
    client: AsyncClient,
    admin_token: str,
    weight_master_entry: WeightMaster,
):
    """Test listing bean records."""
    # Create a record first
    await client.post(
        "/api/bean-records",
        json={
            "bean_type_id": weight_master_entry.id,
            "date": "2024-01-15",
            "customer_name": "Test Customer",
            "bags": 10,
            "viss": 50.0,
            "price": 1000.0,
        },
        headers=auth_header(admin_token),
    )

    # List records
    response = await client.get(
        "/api/bean-records",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["customer_name"] == "Test Customer"


@pytest.mark.asyncio
async def test_list_bean_records_filter_by_bean_type(
    client: AsyncClient,
    admin_token: str,
    weight_master_entry: WeightMaster,
):
    """Test filtering bean records by bean type."""
    # Create a record
    await client.post(
        "/api/bean-records",
        json={
            "bean_type_id": weight_master_entry.id,
            "date": "2024-01-15",
            "customer_name": "Test Customer",
            "bags": 10,
            "viss": 50.0,
            "price": 1000.0,
        },
        headers=auth_header(admin_token),
    )

    # Filter by bean type
    response = await client.get(
        f"/api/bean-records?bean_type_id={weight_master_entry.id}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

    # Filter by non-existent bean type
    response = await client.get(
        f"/api/bean-records?bean_type_id={uuid.uuid4()}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


@pytest.mark.asyncio
async def test_get_bean_record(
    client: AsyncClient,
    admin_token: str,
    weight_master_entry: WeightMaster,
):
    """Test getting a single bean record."""
    # Create a record
    create_response = await client.post(
        "/api/bean-records",
        json={
            "bean_type_id": weight_master_entry.id,
            "date": "2024-01-15",
            "customer_name": "Test Customer",
            "bags": 10,
            "viss": 50.0,
            "price": 1000.0,
        },
        headers=auth_header(admin_token),
    )
    record_id = create_response.json()["id"]

    # Get the record
    response = await client.get(
        f"/api/bean-records/{record_id}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == record_id
    assert data["customer_name"] == "Test Customer"


@pytest.mark.asyncio
async def test_get_bean_record_not_found(
    client: AsyncClient,
    admin_token: str,
):
    """Test getting a non-existent bean record."""
    response = await client.get(
        f"/api/bean-records/{uuid.uuid4()}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_bean_record(
    client: AsyncClient,
    admin_token: str,
    weight_master_entry: WeightMaster,
):
    """Test updating a bean record."""
    # Create a record
    create_response = await client.post(
        "/api/bean-records",
        json={
            "bean_type_id": weight_master_entry.id,
            "date": "2024-01-15",
            "customer_name": "Test Customer",
            "bags": 10,
            "viss": 50.0,
            "price": 1000.0,
        },
        headers=auth_header(admin_token),
    )
    record_id = create_response.json()["id"]

    # Update the record
    response = await client.put(
        f"/api/bean-records/{record_id}",
        json={
            "customer_name": "Updated Customer",
            "bags": 20,
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["customer_name"] == "Updated Customer"
    assert data["bags"] == 20
    # Verify value recalculation: ((60/2) * 20 + 50) * 1000 / 60 = (600 + 50) * 1000 / 60 = 10833.33
    assert abs(data["value"] - 10833.33) < 0.01


@pytest.mark.asyncio
async def test_delete_bean_record(
    client: AsyncClient,
    admin_token: str,
    weight_master_entry: WeightMaster,
):
    """Test deleting a bean record."""
    # Create a record
    create_response = await client.post(
        "/api/bean-records",
        json={
            "bean_type_id": weight_master_entry.id,
            "date": "2024-01-15",
            "customer_name": "Test Customer",
            "bags": 10,
            "viss": 50.0,
            "price": 1000.0,
        },
        headers=auth_header(admin_token),
    )
    record_id = create_response.json()["id"]

    # Delete the record
    response = await client.delete(
        f"/api/bean-records/{record_id}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200

    # Verify it's gone
    response = await client.get(
        f"/api/bean-records/{record_id}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_bean_record_not_found(
    client: AsyncClient,
    admin_token: str,
):
    """Test deleting a non-existent bean record."""
    response = await client.delete(
        f"/api/bean-records/{uuid.uuid4()}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_bean_record_value_formula(
    client: AsyncClient,
    admin_token: str,
    weight_master_entry: WeightMaster,
):
    """Test the value formula with various inputs."""
    # Test case 1: bags=10, viss=50, price=1000, bean_weight=60
    # Formula: ((60/2) * 10 + 50) * 1000 / 60 = (300 + 50) * 1000 / 60 = 5833.33
    response = await client.post(
        "/api/bean-records",
        json={
            "bean_type_id": weight_master_entry.id,
            "date": "2024-01-15",
            "customer_name": "Test Customer 1",
            "bags": 10,
            "viss": 50.0,
            "price": 1000.0,
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    assert abs(response.json()["value"] - 5833.33) < 0.01

    # Test case 2: bags=0, viss=100, price=2000, bean_weight=60
    # Formula: ((60/2) * 0 + 100) * 2000 / 60 = 100 * 2000 / 60 = 3333.33
    response = await client.post(
        "/api/bean-records",
        json={
            "bean_type_id": weight_master_entry.id,
            "date": "2024-01-15",
            "customer_name": "Test Customer 2",
            "bags": 0,
            "viss": 100.0,
            "price": 2000.0,
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    assert abs(response.json()["value"] - 3333.33) < 0.01

    # Test case 3: bags=5, viss=0, price=500, bean_weight=60
    # Formula: ((60/2) * 5 + 0) * 500 / 60 = 150 * 500 / 60 = 1250
    response = await client.post(
        "/api/bean-records",
        json={
            "bean_type_id": weight_master_entry.id,
            "date": "2024-01-15",
            "customer_name": "Test Customer 3",
            "bags": 5,
            "viss": 0,
            "price": 500.0,
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    assert abs(response.json()["value"] - 1250) < 0.01


@pytest.mark.asyncio
async def test_bean_record_requires_auth(
    client: AsyncClient,
    weight_master_entry: WeightMaster,
):
    """Test that bean records require authentication."""
    response = await client.post(
        "/api/bean-records",
        json={
            "bean_type_id": weight_master_entry.id,
            "date": "2024-01-15",
            "customer_name": "Test Customer",
            "bags": 10,
            "viss": 50.0,
            "price": 1000.0,
        },
    )
    assert response.status_code in [401, 403]
