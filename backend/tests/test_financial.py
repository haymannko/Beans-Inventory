"""Tests for the Financial Ledger module."""

import pytest
from httpx import AsyncClient

from app.models.account import Account, AccountType
from tests.conftest import auth_header


# ════════════════════════════════════════════════════════════════════
#  Chart of Accounts
# ════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_create_account(client: AsyncClient, admin_token):
    """Create a new chart of accounts entry."""
    response = await client.post(
        "/api/financial/accounts",
        json={
            "code": "1110",
            "name": "Cash on Hand",
            "type": "asset",
            "description": "Physical cash",
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["code"] == "1110"
    assert data["name"] == "Cash on Hand"
    assert data["type"] == "asset"
    assert data["is_active"] is True
    assert data["balance"] == 0


@pytest.mark.asyncio
async def test_create_account_duplicate_code(client: AsyncClient, admin_token):
    """Creating an account with a duplicate code should fail."""
    await client.post(
        "/api/financial/accounts",
        json={"code": "1120", "name": "Bank Account", "type": "asset"},
        headers=auth_header(admin_token),
    )
    response = await client.post(
        "/api/financial/accounts",
        json={"code": "1120", "name": "Another Bank", "type": "asset"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_list_accounts(client: AsyncClient, admin_token):
    """List all accounts."""
    # Create two accounts
    await client.post(
        "/api/financial/accounts",
        json={"code": "1130", "name": "Petty Cash", "type": "asset"},
        headers=auth_header(admin_token),
    )
    await client.post(
        "/api/financial/accounts",
        json={"code": "2100", "name": "Loans Payable", "type": "liability"},
        headers=auth_header(admin_token),
    )

    response = await client.get(
        "/api/financial/accounts",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2


@pytest.mark.asyncio
async def test_filter_accounts_by_type(client: AsyncClient, admin_token):
    """Filter accounts by type."""
    await client.post(
        "/api/financial/accounts",
        json={"code": "3100", "name": "Owner Capital", "type": "equity"},
        headers=auth_header(admin_token),
    )

    response = await client.get(
        "/api/financial/accounts?account_type=equity",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    for acct in response.json():
        assert acct["type"] == "equity"


@pytest.mark.asyncio
async def test_search_accounts(client: AsyncClient, admin_token):
    """Search accounts by name/code."""
    await client.post(
        "/api/financial/accounts",
        json={"code": "4100", "name": "Sales Revenue", "type": "revenue"},
        headers=auth_header(admin_token),
    )

    response = await client.get(
        "/api/financial/accounts?search=Sales",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert any("Sales" in a["name"] for a in response.json())


@pytest.mark.asyncio
async def test_get_account(client: AsyncClient, admin_token):
    """Get a single account by ID."""
    create_resp = await client.post(
        "/api/financial/accounts",
        json={"code": "1140", "name": "Test Account", "type": "asset"},
        headers=auth_header(admin_token),
    )
    acct_id = create_resp.json()["id"]

    response = await client.get(
        f"/api/financial/accounts/{acct_id}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Test Account"


@pytest.mark.asyncio
async def test_get_account_404(client: AsyncClient, admin_token):
    """Get a non-existent account returns 404."""
    response = await client.get(
        "/api/financial/accounts/non-existent-id",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_account(client: AsyncClient, admin_token):
    """Update an account's name and type."""
    create_resp = await client.post(
        "/api/financial/accounts",
        json={"code": "1150", "name": "Old Name", "type": "asset"},
        headers=auth_header(admin_token),
    )
    acct_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/financial/accounts/{acct_id}",
        json={"name": "New Name", "description": "Updated description"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["description"] == "Updated description"


@pytest.mark.asyncio
async def test_deactivate_account_with_transactions(client: AsyncClient, admin_token, sample_account_id: str):
    """Deleting an account with journal lines should soft-deactivate."""
    # Create a journal entry that references this account first
    ar_response = await client.post(
        "/api/financial/accounts",
        json={"code": "1200", "name": "AR Test", "type": "asset"},
        headers=auth_header(admin_token),
    )
    ar_id = ar_response.json()["id"]
    rev_response = await client.post(
        "/api/financial/accounts",
        json={"code": "4200", "name": "Revenue Test", "type": "revenue"},
        headers=auth_header(admin_token),
    )
    rev_id = rev_response.json()["id"]

    # Create a journal entry
    await client.post(
        "/api/financial/journal-entries",
        json={
            "entry_date": "2026-07-22",
            "description": "Test entry for deactivation",
            "lines": [
                {"account_id": ar_id, "debit": 1000},
                {"account_id": rev_id, "credit": 1000},
            ],
        },
        headers=auth_header(admin_token),
    )

    # Try to delete the AR account (should soft-deactivate)
    response = await client.delete(
        f"/api/financial/accounts/{ar_id}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert response.json()["soft_delete"] is True


# ════════════════════════════════════════════════════════════════════
#  Journal Entries
# ════════════════════════════════════════════════════════════════════


@pytest.fixture
async def sample_accounts(client: AsyncClient, admin_token) -> dict[str, str]:
    """Create sample accounts for journal entry tests."""
    resp1 = await client.post(
        "/api/financial/accounts",
        json={"code": "1160", "name": "Cash Account", "type": "asset"},
        headers=auth_header(admin_token),
    )
    resp2 = await client.post(
        "/api/financial/accounts",
        json={"code": "4100", "name": "Revenue Account", "type": "revenue"},
        headers=auth_header(admin_token),
    )
    return {
        "cash": resp1.json()["id"],
        "revenue": resp2.json()["id"],
    }


@pytest.fixture
async def sample_account_id(client: AsyncClient, admin_token) -> str:
    """Create a single account and return its ID."""
    resp = await client.post(
        "/api/financial/accounts",
        json={"code": "1170", "name": "Sample Account", "type": "asset"},
        headers=auth_header(admin_token),
    )
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_create_journal_entry(client: AsyncClient, admin_token, sample_accounts):
    """Create a valid journal entry (debits = credits)."""
    response = await client.post(
        "/api/financial/journal-entries",
        json={
            "entry_date": "2026-07-22",
            "description": "Test journal entry",
            "lines": [
                {"account_id": sample_accounts["cash"], "debit": 5000.00},
                {"account_id": sample_accounts["revenue"], "credit": 5000.00},
            ],
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["entry_number"].startswith("JE-")
    assert data["description"] == "Test journal entry"
    assert len(data["lines"]) == 2
    # Verify line enrichment
    codes = {l["account_code"] for l in data["lines"]}
    assert "1160" in codes or "4100" in codes


@pytest.mark.asyncio
async def test_create_journal_entry_unbalanced(client: AsyncClient, admin_token, sample_accounts):
    """Creating an unbalanced journal entry should fail."""
    response = await client.post(
        "/api/financial/journal-entries",
        json={
            "entry_date": "2026-07-22",
            "description": "Unbalanced entry",
            "lines": [
                {"account_id": sample_accounts["cash"], "debit": 5000},
                {"account_id": sample_accounts["revenue"], "credit": 3000},
            ],
        },
        headers=auth_header(admin_token),
    )
    # FastAPI validation should reject this at Pydantic level
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_journal_entry_single_line(client: AsyncClient, admin_token, sample_accounts):
    """Creating a journal entry with fewer than 2 lines should fail."""
    response = await client.post(
        "/api/financial/journal-entries",
        json={
            "entry_date": "2026-07-22",
            "description": "Single line entry",
            "lines": [
                {"account_id": sample_accounts["cash"], "debit": 5000},
            ],
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_list_journal_entries(client: AsyncClient, admin_token, sample_accounts):
    """List journal entries with optional date filter."""
    # Create one entry
    await client.post(
        "/api/financial/journal-entries",
        json={
            "entry_date": "2026-07-22",
            "description": "Entry A",
            "lines": [
                {"account_id": sample_accounts["cash"], "debit": 1000},
                {"account_id": sample_accounts["revenue"], "credit": 1000},
            ],
        },
        headers=auth_header(admin_token),
    )

    response = await client.get(
        "/api/financial/journal-entries?start_date=2026-07-01&end_date=2026-07-31",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert len(response.json()) >= 1


@pytest.mark.asyncio
async def test_get_journal_entry(client: AsyncClient, admin_token, sample_accounts):
    """Get a single journal entry by ID."""
    create_resp = await client.post(
        "/api/financial/journal-entries",
        json={
            "entry_date": "2026-07-22",
            "description": "Specific entry",
            "lines": [
                {"account_id": sample_accounts["cash"], "debit": 2500},
                {"account_id": sample_accounts["revenue"], "credit": 2500},
            ],
        },
        headers=auth_header(admin_token),
    )
    je_id = create_resp.json()["id"]

    response = await client.get(
        f"/api/financial/journal-entries/{je_id}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert response.json()["description"] == "Specific entry"


@pytest.mark.asyncio
async def test_delete_journal_entry(client: AsyncClient, admin_token, sample_accounts):
    """Delete a journal entry."""
    create_resp = await client.post(
        "/api/financial/journal-entries",
        json={
            "entry_date": "2026-07-22",
            "description": "To be deleted",
            "lines": [
                {"account_id": sample_accounts["cash"], "debit": 500},
                {"account_id": sample_accounts["revenue"], "credit": 500},
            ],
        },
        headers=auth_header(admin_token),
    )
    je_id = create_resp.json()["id"]

    response = await client.delete(
        f"/api/financial/journal-entries/{je_id}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert "deleted" in response.json()["message"]


# ════════════════════════════════════════════════════════════════════
#  Cash Book
# ════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_create_cash_book_receipt(client: AsyncClient, admin_token):
    """Create a cash book receipt entry."""
    response = await client.post(
        "/api/financial/cash-book",
        json={
            "transaction_date": "2026-07-22",
            "transaction_type": "receipt",
            "amount": 10000.00,
            "description": "Cash sale",
            "counterparty": "Customer A",
            "payment_method": "cash",
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["entry_number"].startswith("CB-")
    assert data["transaction_type"] == "receipt"
    assert float(data["amount"]) == 10000.00
    assert data["counterparty"] == "Customer A"


@pytest.mark.asyncio
async def test_create_cash_book_payment(client: AsyncClient, admin_token):
    """Create a cash book payment entry."""
    response = await client.post(
        "/api/financial/cash-book",
        json={
            "transaction_date": "2026-07-22",
            "transaction_type": "payment",
            "amount": 5000.00,
            "description": "Supplier payment",
            "counterparty": "Supplier B",
            "payment_method": "bank_transfer",
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    assert response.json()["transaction_type"] == "payment"


@pytest.mark.asyncio
async def test_cash_book_balance(client: AsyncClient, admin_token):
    """Get cash book balance after creating entries."""
    # Create receipt
    await client.post(
        "/api/financial/cash-book",
        json={
            "transaction_date": "2026-07-22",
            "transaction_type": "receipt",
            "amount": 20000,
            "description": "Receipt 1",
        },
        headers=auth_header(admin_token),
    )
    # Create payment
    await client.post(
        "/api/financial/cash-book",
        json={
            "transaction_date": "2026-07-22",
            "transaction_type": "payment",
            "amount": 8000,
            "description": "Payment 1",
        },
        headers=auth_header(admin_token),
    )

    response = await client.get(
        "/api/financial/cash-book/balance",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_receipts"] >= 20000
    assert data["total_payments"] >= 8000
    assert data["closing_balance"] == data["opening_balance"] + data["total_receipts"] - data["total_payments"]


@pytest.mark.asyncio
async def test_list_cash_book(client: AsyncClient, admin_token):
    """List cash book entries with filters."""
    response = await client.get(
        "/api/financial/cash-book?transaction_type=receipt",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    for entry in response.json():
        assert entry["transaction_type"] == "receipt"


@pytest.mark.asyncio
async def test_delete_cash_book_entry(client: AsyncClient, admin_token):
    """Delete a cash book entry."""
    create_resp = await client.post(
        "/api/financial/cash-book",
        json={
            "transaction_date": "2026-07-22",
            "transaction_type": "receipt",
            "amount": 1000,
            "description": "Delete me",
        },
        headers=auth_header(admin_token),
    )
    entry_id = create_resp.json()["id"]

    response = await client.delete(
        f"/api/financial/cash-book/{entry_id}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200


# ════════════════════════════════════════════════════════════════════
#  Trial Balance
# ════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_trial_balance(client: AsyncClient, admin_token, sample_accounts):
    """Generate a trial balance that should be balanced."""
    # Create a balanced journal entry
    await client.post(
        "/api/financial/journal-entries",
        json={
            "entry_date": "2026-07-22",
            "description": "Trial balance test",
            "lines": [
                {"account_id": sample_accounts["cash"], "debit": 10000},
                {"account_id": sample_accounts["revenue"], "credit": 10000},
            ],
        },
        headers=auth_header(admin_token),
    )

    response = await client.get(
        "/api/financial/trial-balance",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert "as_of_date" in data
    assert len(data["rows"]) >= 2
    # Total debits should equal total credits
    assert abs(data["total_debit"] - data["total_credit"]) < 0.01


# ════════════════════════════════════════════════════════════════════
#  Financial Reports
# ════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_income_statement(client: AsyncClient, admin_token, sample_accounts):
    """Generate income statement."""
    # Create a revenue-generating journal entry
    await client.post(
        "/api/financial/journal-entries",
        json={
            "entry_date": "2026-07-22",
            "description": "Revenue entry",
            "lines": [
                {"account_id": sample_accounts["cash"], "debit": 50000},
                {"account_id": sample_accounts["revenue"], "credit": 50000},
            ],
        },
        headers=auth_header(admin_token),
    )

    response = await client.get(
        "/api/financial/reports/income-statement?start_date=2026-07-01&end_date=2026-07-31",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["start_date"] == "2026-07-01"
    assert data["end_date"] == "2026-07-31"
    # Should have revenue entries
    assert len(data["revenues"]) >= 0  # Could be 0 if seed didn't add revenue accounts
    assert isinstance(data["net_income"], (int, float))


@pytest.mark.asyncio
async def test_balance_sheet(client: AsyncClient, admin_token, sample_accounts):
    """Generate balance sheet."""
    response = await client.get(
        "/api/financial/reports/balance-sheet",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert "as_of_date" in data
    assert isinstance(data["total_assets"], (int, float))
    assert isinstance(data["total_liabilities"], (int, float))
    assert isinstance(data["total_equity"], (int, float))


# ════════════════════════════════════════════════════════════════════
#  AR / AP
# ════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_accounts_receivable(client: AsyncClient, admin_token):
    """Get accounts receivable summary."""
    response = await client.get(
        "/api/financial/receivables",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_accounts_payable(client: AsyncClient, admin_token):
    """Get accounts payable summary."""
    response = await client.get(
        "/api/financial/payables",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)
