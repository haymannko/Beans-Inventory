"""Financial Ledger router — Chart of Accounts, Journal Entries, Cash Book, Trial Balance, Reports."""

import logging
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db.session import get_db
from app.deps import get_current_user
from app.models.account import Account, AccountType
from app.models.cash_book import CashBookEntry
from app.models.journal_entry import JournalEntry, JournalEntryLine
from app.models.user import User
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate
from app.schemas.cash_book import (
    CashBookBalance,
    CashBookCreate,
    CashBookResponse,
    CashBookUpdate,
)
from app.schemas.financial import (
    BalanceSheetResponse,
    BalanceSheetRow,
    IncomeStatementResponse,
    IncomeStatementRow,
    TrialBalanceResponse,
    TrialBalanceRow,
)
from app.schemas.journal_entry import (
    JournalEntryCreate,
    JournalEntryLineResponse,
    JournalEntryResponse,
    JournalEntryUpdate,
)
from app.services.audit_service import create_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/financial", tags=["Financial Ledger"])


# ════════════════════════════════════════════════════════════════════
#  Helpers
# ════════════════════════════════════════════════════════════════════

ACCOUNT_TYPE_ORDER = {
    AccountType.ASSET: 1,
    AccountType.LIABILITY: 2,
    AccountType.EQUITY: 3,
    AccountType.REVENUE: 4,
    AccountType.EXPENSE: 5,
}


async def _get_account_or_404(db: AsyncSession, account_id: str) -> Account:
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


async def _get_journal_entry_or_404(db: AsyncSession, je_id: str) -> JournalEntry:
    result = await db.execute(
        select(JournalEntry)
        .options(joinedload(JournalEntry.lines))
        .where(JournalEntry.id == je_id)
    )
    je = result.unique().scalar_one_or_none()
    if je is None:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return je


async def _get_cash_entry_or_404(db: AsyncSession, entry_id: str) -> CashBookEntry:
    result = await db.execute(
        select(CashBookEntry).where(CashBookEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Cash book entry not found")
    return entry


async def _enrich_lines(
    db: AsyncSession, lines: list[JournalEntryLine]
) -> list[dict]:
    """Attach account_code and account_name to each line."""
    enriched = []
    for line in lines:
        acct = await db.get(Account, line.account_id)
        enriched.append({
            "id": line.id,
            "journal_entry_id": line.journal_entry_id,
            "account_id": line.account_id,
            "account_code": acct.code if acct else None,
            "account_name": acct.name if acct else None,
            "debit": float(line.debit),
            "credit": float(line.credit),
            "description": line.description,
        })
    return enriched


async def _build_je_response(
    db: AsyncSession, je: JournalEntry
) -> dict:
    enriched = await _enrich_lines(db, je.lines)
    return {
        "id": je.id,
        "entry_number": je.entry_number,
        "entry_date": je.entry_date,
        "description": je.description,
        "entry_type": je.entry_type,
        "reference_type": je.reference_type,
        "reference_id": je.reference_id,
        "is_posted": je.is_posted,
        "created_by": je.created_by,
        "created_at": je.created_at,
        "updated_at": je.updated_at,
        "lines": enriched,
    }


async def _generate_entry_number(db: AsyncSession) -> str:
    """Generate the next JE number: JE-{year}-{sequential:04d}."""
    year = date.today().year
    prefix = f"JE-{year}-"
    result = await db.execute(
        select(func.max(JournalEntry.entry_number)).where(
            JournalEntry.entry_number.like(f"{prefix}%")
        )
    )
    max_no = result.scalar_one_or_none()
    if max_no:
        seq = int(max_no.split("-")[-1]) + 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"


async def _generate_cash_entry_number(db: AsyncSession) -> str:
    """Generate the next cash book entry number: CB-{year}-{sequential:04d}."""
    year = date.today().year
    prefix = f"CB-{year}-"
    result = await db.execute(
        select(func.max(CashBookEntry.entry_number)).where(
            CashBookEntry.entry_number.like(f"{prefix}%")
        )
    )
    max_no = result.scalar_one_or_none()
    if max_no:
        seq = int(max_no.split("-")[-1]) + 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"


async def _get_account_balance(
    db: AsyncSession, account_id: str, as_of_date: date | None = None
) -> float:
    """Calculate the net balance for a single account."""
    query = select(
        func.coalesce(func.sum(JournalEntryLine.debit), 0),
        func.coalesce(func.sum(JournalEntryLine.credit), 0),
    ).join(
        JournalEntry,
        JournalEntryLine.journal_entry_id == JournalEntry.id,
    ).where(
        JournalEntryLine.account_id == account_id,
        JournalEntry.is_posted == True,
    )
    if as_of_date:
        query = query.where(JournalEntry.entry_date <= as_of_date)

    result = await db.execute(query)
    row = result.one()
    total_debit = float(row[0] or 0)
    total_credit = float(row[1] or 0)
    return round(total_debit - total_credit, 2)


async def _get_account_balance_range(
    db: AsyncSession, account_id: str, start_date: date, end_date: date
) -> float:
    """Calculate net change for an account between two dates."""
    query = select(
        func.coalesce(func.sum(JournalEntryLine.debit), 0),
        func.coalesce(func.sum(JournalEntryLine.credit), 0),
    ).join(
        JournalEntry,
        JournalEntryLine.journal_entry_id == JournalEntry.id,
    ).where(
        JournalEntryLine.account_id == account_id,
        JournalEntry.is_posted == True,
        JournalEntry.entry_date >= start_date,
        JournalEntry.entry_date <= end_date,
    )
    result = await db.execute(query)
    row = result.one()
    total_debit = float(row[0] or 0)
    total_credit = float(row[1] or 0)
    return round(total_debit - total_credit, 2)


# ════════════════════════════════════════════════════════════════════
#  Chart of Accounts
# ════════════════════════════════════════════════════════════════════


@router.get("/accounts", response_model=list[AccountResponse])
async def list_accounts(
    account_type: str | None = Query(None),
    search: str | None = Query(None),
    active_only: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List chart of accounts with optional filters."""
    query = select(Account).order_by(Account.code.asc())

    if account_type:
        try:
            at = AccountType(account_type)
            query = query.where(Account.type == at)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid account type: {account_type}")

    if active_only:
        query = query.where(Account.is_active == True)

    if search:
        term = f"%{search}%"
        query = query.where(
            Account.name.ilike(term)
            | Account.code.ilike(term)
        )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    accounts = result.scalars().all()

    response = []
    for acct in accounts:
        balance = await _get_account_balance(db, acct.id)
        response.append(AccountResponse(
            id=acct.id,
            code=acct.code,
            name=acct.name,
            type=acct.type,
            description=acct.description,
            is_active=acct.is_active,
            parent_code=acct.parent_code,
            created_at=acct.created_at,
            updated_at=acct.updated_at,
            balance=balance,
        ))
    return response


@router.get("/accounts/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    account = await _get_account_or_404(db, account_id)
    balance = await _get_account_balance(db, account.id)
    return AccountResponse(
        id=account.id,
        code=account.code,
        name=account.name,
        type=account.type,
        description=account.description,
        is_active=account.is_active,
        parent_code=account.parent_code,
        created_at=account.created_at,
        updated_at=account.updated_at,
        balance=balance,
    )


@router.post("/accounts", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    request: AccountCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(Account).where(Account.code == request.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Account with code '{request.code}' already exists",
        )

    account = Account(
        code=request.code,
        name=request.name,
        type=request.type,
        description=request.description,
        parent_code=request.parent_code,
    )
    db.add(account)
    await db.flush()
    await db.refresh(account)

    await create_audit_log(
        db, str(user.id), "CREATE", "accounts", account.id,
        {"code": account.code, "name": account.name},
    )

    return AccountResponse(
        id=account.id,
        code=account.code,
        name=account.name,
        type=account.type,
        description=account.description,
        is_active=account.is_active,
        parent_code=account.parent_code,
        created_at=account.created_at,
        updated_at=account.updated_at,
        balance=0,
    )


@router.put("/accounts/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    request: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = await _get_account_or_404(db, account_id)

    if request.name is not None:
        account.name = request.name
    if request.type is not None:
        account.type = request.type
    if request.description is not None:
        account.description = request.description
    if request.is_active is not None:
        account.is_active = request.is_active
    if request.parent_code is not None:
        account.parent_code = request.parent_code

    db.add(account)
    await db.flush()
    await db.refresh(account)

    await create_audit_log(
        db, str(user.id), "UPDATE", "accounts", account.id,
        {"code": account.code, "name": account.name},
    )

    balance = await _get_account_balance(db, account.id)
    return AccountResponse(
        id=account.id,
        code=account.code,
        name=account.name,
        type=account.type,
        description=account.description,
        is_active=account.is_active,
        parent_code=account.parent_code,
        created_at=account.created_at,
        updated_at=account.updated_at,
        balance=balance,
    )


@router.delete("/accounts/{account_id}")
async def delete_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = await _get_account_or_404(db, account_id)

    # Check if account has journal entry lines
    line_count = await db.scalar(
        select(func.count(JournalEntryLine.id)).where(
            JournalEntryLine.account_id == account_id
        )
    )
    if line_count and line_count > 0:
        account.is_active = False
        db.add(account)
        await db.flush()
        await create_audit_log(
            db, str(user.id), "DEACTIVATE", "accounts", account.id,
            {"reason": f"Has {line_count} journal entry line(s)"},
        )
        return {"message": f"Account '{account.code} - {account.name}' deactivated (has transactions)", "soft_delete": True}

    await db.delete(account)
    await create_audit_log(
        db, str(user.id), "DELETE", "accounts", account.id,
        {"code": account.code, "name": account.name},
    )
    return {"message": "Account deleted successfully", "soft_delete": False}


# ════════════════════════════════════════════════════════════════════
#  Journal Entries
# ════════════════════════════════════════════════════════════════════


@router.get("/journal-entries", response_model=list[JournalEntryResponse])
async def list_journal_entries(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    entry_type: str | None = Query(None),
    account_id: str | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List journal entries with filters."""
    query = (
        select(JournalEntry)
        .options(joinedload(JournalEntry.lines))
        .order_by(JournalEntry.entry_date.desc(), JournalEntry.created_at.desc())
    )

    if start_date:
        query = query.where(JournalEntry.entry_date >= start_date)
    if end_date:
        query = query.where(JournalEntry.entry_date <= end_date)
    if entry_type:
        query = query.where(JournalEntry.entry_type == entry_type)
    if search:
        term = f"%{search}%"
        query = query.where(
            JournalEntry.description.ilike(term)
            | JournalEntry.entry_number.ilike(term)
        )
    if account_id:
        # Filter by entries that contain a line for this account
        query = query.where(
            JournalEntry.id.in_(
                select(JournalEntryLine.journal_entry_id).where(
                    JournalEntryLine.account_id == account_id
                )
            )
        )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    entries = result.unique().scalars().all()

    return [await _build_je_response(db, je) for je in entries]


@router.get("/journal-entries/{je_id}", response_model=JournalEntryResponse)
async def get_journal_entry(
    je_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    je = await _get_journal_entry_or_404(db, je_id)
    return await _build_je_response(db, je)


@router.post("/journal-entries", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_journal_entry(
    request: JournalEntryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new journal entry with line items (debits must equal credits)."""
    # Validate all accounts exist
    for line in request.lines:
        acct = await db.get(Account, line.account_id)
        if acct is None:
            raise HTTPException(
                status_code=404,
                detail=f"Account '{line.account_id}' not found",
            )

    entry_number = await _generate_entry_number(db)

    je = JournalEntry(
        entry_number=entry_number,
        entry_date=request.entry_date,
        description=request.description,
        entry_type=request.entry_type or "manual",
        reference_type=request.reference_type,
        reference_id=request.reference_id,
        created_by=str(user.id),
    )
    db.add(je)
    await db.flush()

    for line_data in request.lines:
        line = JournalEntryLine(
            journal_entry_id=je.id,
            account_id=line_data.account_id,
            debit=round(line_data.debit, 2),
            credit=round(line_data.credit, 2),
            description=line_data.description,
        )
        db.add(line)

    await db.flush()
    await db.refresh(je)

    await create_audit_log(
        db, str(user.id), "CREATE", "journal_entries", je.id,
        {
            "entry_number": je.entry_number,
            "description": je.description,
            "line_count": len(request.lines),
        },
    )

    return await _build_je_response(db, je)


@router.put("/journal-entries/{je_id}", response_model=JournalEntryResponse)
async def update_journal_entry(
    je_id: str,
    request: JournalEntryUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a journal entry (replaces all lines if provided)."""
    je = await _get_journal_entry_or_404(db, je_id)

    if request.entry_date is not None:
        je.entry_date = request.entry_date
    if request.description is not None:
        je.description = request.description

    if request.lines is not None:
        # Validate that debits = credits
        total_debit = sum(round(l.debit or 0, 2) for l in request.lines)
        total_credit = sum(round(l.credit or 0, 2) for l in request.lines)
        if abs(total_debit - total_credit) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Total debits ({total_debit}) must equal total credits ({total_credit})",
            )

        # Validate accounts exist
        for line_data in request.lines:
            if line_data.account_id:
                acct = await db.get(Account, line_data.account_id)
                if acct is None:
                    raise HTTPException(status_code=404, detail=f"Account '{line_data.account_id}' not found")

        # Delete existing lines
        existing_lines = await db.execute(
            select(JournalEntryLine).where(
                JournalEntryLine.journal_entry_id == je.id
            )
        )
        for old_line in existing_lines.scalars().all():
            await db.delete(old_line)
        await db.flush()

        # Create new lines
        for line_data in request.lines:
            line = JournalEntryLine(
                journal_entry_id=je.id,
                account_id=line_data.account_id,
                debit=round(line_data.debit or 0, 2),
                credit=round(line_data.credit or 0, 2),
                description=line_data.description,
            )
            db.add(line)

    db.add(je)
    await db.flush()
    await db.refresh(je)

    await create_audit_log(
        db, str(user.id), "UPDATE", "journal_entries", je.id,
        {"entry_number": je.entry_number},
    )

    return await _build_je_response(db, je)


@router.delete("/journal-entries/{je_id}")
async def delete_journal_entry(
    je_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    je = await _get_journal_entry_or_404(db, je_id)
    entry_number = je.entry_number
    await db.delete(je)
    await create_audit_log(
        db, str(user.id), "DELETE", "journal_entries", je_id,
        {"entry_number": entry_number},
    )
    return {"message": f"Journal entry '{entry_number}' deleted successfully"}


# ════════════════════════════════════════════════════════════════════
#  Cash Book
# ════════════════════════════════════════════════════════════════════


@router.get("/cash-book", response_model=list[CashBookResponse])
async def list_cash_book_entries(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    transaction_type: str | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List cash book entries with filters."""
    query = select(CashBookEntry).order_by(
        CashBookEntry.transaction_date.desc(),
        CashBookEntry.created_at.desc(),
    )

    if start_date:
        query = query.where(CashBookEntry.transaction_date >= start_date)
    if end_date:
        query = query.where(CashBookEntry.transaction_date <= end_date)
    if transaction_type:
        query = query.where(CashBookEntry.transaction_type == transaction_type)
    if search:
        term = f"%{search}%"
        query = query.where(
            CashBookEntry.description.ilike(term)
            | CashBookEntry.counterparty.ilike(term)
            | CashBookEntry.entry_number.ilike(term)
        )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    entries = result.scalars().all()

    return [
        CashBookResponse(
            id=e.id,
            entry_number=e.entry_number,
            transaction_date=e.transaction_date,
            transaction_type=e.transaction_type,
            amount=float(e.amount),
            description=e.description,
            counterparty=e.counterparty,
            payment_method=e.payment_method,
            reference_type=e.reference_type,
            reference_id=e.reference_id,
            notes=e.notes,
            created_by=e.created_by,
            created_at=e.created_at,
        )
        for e in entries
    ]


@router.get("/cash-book/balance", response_model=CashBookBalance)
async def get_cash_book_balance(
    as_of_date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get cash book opening/closing balance."""
    target_date = as_of_date or date.today()

    receipts_result = await db.execute(
        select(func.coalesce(func.sum(CashBookEntry.amount), 0)).where(
            CashBookEntry.transaction_type == "receipt",
            CashBookEntry.transaction_date <= target_date,
        )
    )
    total_receipts = float(receipts_result.scalar() or 0)

    payments_result = await db.execute(
        select(func.coalesce(func.sum(CashBookEntry.amount), 0)).where(
            CashBookEntry.transaction_type == "payment",
            CashBookEntry.transaction_date <= target_date,
        )
    )
    total_payments = float(payments_result.scalar() or 0)

    closing = round(total_receipts - total_payments, 2)
    return CashBookBalance(
        opening_balance=0,
        total_receipts=total_receipts,
        total_payments=total_payments,
        closing_balance=closing,
    )


@router.get("/cash-book/{entry_id}", response_model=CashBookResponse)
async def get_cash_book_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    entry = await _get_cash_entry_or_404(db, entry_id)
    return CashBookResponse(
        id=entry.id,
        entry_number=entry.entry_number,
        transaction_date=entry.transaction_date,
        transaction_type=entry.transaction_type,
        amount=float(entry.amount),
        description=entry.description,
        counterparty=entry.counterparty,
        payment_method=entry.payment_method,
        reference_type=entry.reference_type,
        reference_id=entry.reference_id,
        notes=entry.notes,
        created_by=entry.created_by,
        created_at=entry.created_at,
    )


@router.post("/cash-book", response_model=CashBookResponse, status_code=status.HTTP_201_CREATED)
async def create_cash_book_entry(
    request: CashBookCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry_number = await _generate_cash_entry_number(db)

    entry = CashBookEntry(
        entry_number=entry_number,
        transaction_date=request.transaction_date,
        transaction_type=request.transaction_type,
        amount=round(request.amount, 2),
        description=request.description,
        counterparty=request.counterparty,
        payment_method=request.payment_method,
        reference_type=request.reference_type,
        reference_id=request.reference_id,
        notes=request.notes,
        created_by=str(user.id),
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)

    await create_audit_log(
        db, str(user.id), "CREATE", "cash_book_entries", entry.id,
        {
            "entry_number": entry.entry_number,
            "type": entry.transaction_type,
            "amount": float(entry.amount),
        },
    )

    return CashBookResponse(
        id=entry.id,
        entry_number=entry.entry_number,
        transaction_date=entry.transaction_date,
        transaction_type=entry.transaction_type,
        amount=float(entry.amount),
        description=entry.description,
        counterparty=entry.counterparty,
        payment_method=entry.payment_method,
        reference_type=entry.reference_type,
        reference_id=entry.reference_id,
        notes=entry.notes,
        created_by=entry.created_by,
        created_at=entry.created_at,
    )


@router.put("/cash-book/{entry_id}", response_model=CashBookResponse)
async def update_cash_book_entry(
    entry_id: str,
    request: CashBookUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = await _get_cash_entry_or_404(db, entry_id)

    if request.transaction_date is not None:
        entry.transaction_date = request.transaction_date
    if request.transaction_type is not None:
        entry.transaction_type = request.transaction_type
    if request.amount is not None:
        entry.amount = round(request.amount, 2)
    if request.description is not None:
        entry.description = request.description
    if request.counterparty is not None:
        entry.counterparty = request.counterparty
    if request.payment_method is not None:
        entry.payment_method = request.payment_method
    if request.notes is not None:
        entry.notes = request.notes

    db.add(entry)
    await db.flush()
    await db.refresh(entry)

    await create_audit_log(
        db, str(user.id), "UPDATE", "cash_book_entries", entry.id,
        {"entry_number": entry.entry_number},
    )

    return CashBookResponse(
        id=entry.id,
        entry_number=entry.entry_number,
        transaction_date=entry.transaction_date,
        transaction_type=entry.transaction_type,
        amount=float(entry.amount),
        description=entry.description,
        counterparty=entry.counterparty,
        payment_method=entry.payment_method,
        reference_type=entry.reference_type,
        reference_id=entry.reference_id,
        notes=entry.notes,
        created_by=entry.created_by,
        created_at=entry.created_at,
    )


@router.delete("/cash-book/{entry_id}")
async def delete_cash_book_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = await _get_cash_entry_or_404(db, entry_id)
    entry_number = entry.entry_number
    await db.delete(entry)
    await create_audit_log(
        db, str(user.id), "DELETE", "cash_book_entries", entry_id,
        {"entry_number": entry_number},
    )
    return {"message": f"Cash book entry '{entry_number}' deleted successfully"}


# ════════════════════════════════════════════════════════════════════
#  Trial Balance
# ════════════════════════════════════════════════════════════════════


@router.get("/trial-balance", response_model=TrialBalanceResponse)
async def get_trial_balance(
    as_of_date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Generate trial balance as of a given date (default: today)."""
    target_date = as_of_date or date.today()

    accounts_result = await db.execute(
        select(Account).where(Account.is_active == True).order_by(Account.code)
    )
    accounts = accounts_result.scalars().all()

    rows = []
    total_debit = 0
    total_credit = 0

    for acct in accounts:
        bal = await _get_account_balance(db, acct.id, target_date)
        if bal >= 0:
            dr = bal
            cr = 0
        else:
            dr = 0
            cr = abs(bal)

        total_debit = round(total_debit + dr, 2)
        total_credit = round(total_credit + cr, 2)

        rows.append(TrialBalanceRow(
            account_id=acct.id,
            account_code=acct.code,
            account_name=acct.name,
            account_type=acct.type.value,
            total_debit=dr,
            total_credit=cr,
            balance=bal,
        ))

    return TrialBalanceResponse(
        as_of_date=target_date,
        rows=rows,
        total_debit=total_debit,
        total_credit=total_credit,
    )


# ════════════════════════════════════════════════════════════════════
#  Financial Reports
# ════════════════════════════════════════════════════════════════════


@router.get("/reports/income-statement", response_model=IncomeStatementResponse)
async def get_income_statement(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Generate Profit & Loss statement for a date range."""
    accounts_result = await db.execute(
        select(Account).where(
            Account.is_active == True,
            Account.type.in_([AccountType.REVENUE, AccountType.EXPENSE]),
        ).order_by(Account.type, Account.code)
    )
    accounts = accounts_result.scalars().all()

    revenues = []
    expenses = []
    total_revenue = 0
    total_expense = 0

    for acct in accounts:
        change = await _get_account_balance_range(db, acct.id, start_date, end_date)

        # Revenue accounts normally have credit balance (positive change = credit)
        # In the range query: debit - credit. For revenue, credit > debit, so change is negative.
        # We take absolute for display.
        if acct.type == AccountType.REVENUE:
            # Revenue: credit balance is positive revenue
            balance = abs(change) if change < 0 else change
            if balance != 0:
                revenues.append(IncomeStatementRow(
                    account_id=acct.id,
                    account_code=acct.code,
                    account_name=acct.name,
                    balance=balance,
                ))
            total_revenue = round(total_revenue + balance, 2)
        else:
            # Expense: debit balance is positive expense
            balance = abs(change) if change > 0 else abs(change)
            if balance != 0:
                expenses.append(IncomeStatementRow(
                    account_id=acct.id,
                    account_code=acct.code,
                    account_name=acct.name,
                    balance=balance,
                ))
            total_expense = round(total_expense + balance, 2)

    return IncomeStatementResponse(
        start_date=start_date,
        end_date=end_date,
        revenues=revenues,
        total_revenue=round(total_revenue, 2),
        expenses=expenses,
        total_expense=round(total_expense, 2),
        net_income=round(total_revenue - total_expense, 2),
    )


@router.get("/reports/balance-sheet", response_model=BalanceSheetResponse)
async def get_balance_sheet(
    as_of_date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Generate Balance Sheet as of a given date."""
    target_date = as_of_date or date.today()

    accounts_result = await db.execute(
        select(Account).where(
            Account.is_active == True,
            Account.type.in_([AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY]),
        ).order_by(Account.type, Account.code)
    )
    accounts = accounts_result.scalars().all()

    assets = []
    liabilities = []
    equity = []
    total_assets = 0
    total_liabilities = 0
    total_equity = 0

    for acct in accounts:
        bal = await _get_account_balance(db, acct.id, target_date)

        if acct.type == AccountType.ASSET:
            # Assets: debit balance positive
            balance = abs(bal) if bal >= 0 else 0
            if balance != 0:
                assets.append(BalanceSheetRow(
                    account_id=acct.id,
                    account_code=acct.code,
                    account_name=acct.name,
                    balance=balance,
                ))
            total_assets = round(total_assets + balance, 2)
        elif acct.type == AccountType.LIABILITY:
            # Liabilities: credit balance positive
            balance = abs(bal) if bal <= 0 else 0
            if balance != 0:
                liabilities.append(BalanceSheetRow(
                    account_id=acct.id,
                    account_code=acct.code,
                    account_name=acct.name,
                    balance=balance,
                ))
            total_liabilities = round(total_liabilities + balance, 2)
        else:
            # Equity: credit balance positive
            balance = abs(bal) if bal <= 0 else 0
            if balance != 0:
                equity.append(BalanceSheetRow(
                    account_id=acct.id,
                    account_code=acct.code,
                    account_name=acct.name,
                    balance=balance,
                ))
            total_equity = round(total_equity + balance, 2)

    # Add net income (from revenue - expense) to retained earnings
    # Get revenue and expense accounts for period up to target_date
    pnl_start = date(target_date.year, 1, 1)
    rev_result = await db.execute(
        select(func.coalesce(func.sum(JournalEntryLine.credit), 0) - func.coalesce(func.sum(JournalEntryLine.debit), 0))
        .join(JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id)
        .join(Account, JournalEntryLine.account_id == Account.id)
        .where(
            Account.type == AccountType.REVENUE,
            JournalEntry.is_posted == True,
            JournalEntry.entry_date >= pnl_start,
            JournalEntry.entry_date <= target_date,
        )
    )
    total_revenue = float(rev_result.scalar() or 0)

    exp_result = await db.execute(
        select(func.coalesce(func.sum(JournalEntryLine.debit), 0) - func.coalesce(func.sum(JournalEntryLine.credit), 0))
        .join(JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id)
        .join(Account, JournalEntryLine.account_id == Account.id)
        .where(
            Account.type == AccountType.EXPENSE,
            JournalEntry.is_posted == True,
            JournalEntry.entry_date >= pnl_start,
            JournalEntry.entry_date <= target_date,
        )
    )
    total_expense = float(exp_result.scalar() or 0)
    net_income = round(total_revenue - total_expense, 2)

    if net_income != 0:
        equity.append(BalanceSheetRow(
            account_id="",
            account_code="",
            account_name="Retained Earnings (Current Period)",
            balance=net_income,
        ))
        total_equity = round(total_equity + net_income, 2)

    return BalanceSheetResponse(
        as_of_date=target_date,
        assets=assets,
        total_assets=total_assets,
        liabilities=liabilities,
        total_liabilities=total_liabilities,
        equity=equity,
        total_equity=total_equity,
    )


# ════════════════════════════════════════════════════════════════════
#  Accounts Receivable / Payable Summaries
# ════════════════════════════════════════════════════════════════════


@router.get("/receivables", response_model=list[dict])
async def get_accounts_receivable(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get accounts receivable summary from AR account journal lines."""
    ar_accounts = await db.execute(
        select(Account).where(
            Account.is_active == True,
            Account.code.like("12%"),  # 1200+ = Receivables
        )
    )
    results = []
    for acct in ar_accounts.scalars().all():
        bal = await _get_account_balance(db, acct.id)
        if abs(bal) > 0:
            # Get counterparty details from journal entries
            entries_subq = (
                select(JournalEntryLine.journal_entry_id)
                .where(JournalEntryLine.account_id == acct.id)
                .scalar_subquery()
            )
            entry_result = await db.execute(
                select(JournalEntry)
                .where(JournalEntry.id.in_(entries_subq))
                .order_by(JournalEntry.entry_date.desc())
                .limit(10)
            )
            entries = entry_result.scalars().all()

            results.append({
                "account_id": acct.id,
                "account_code": acct.code,
                "account_name": acct.name,
                "outstanding_balance": abs(bal),
                "recent_transactions": [
                    {"id": e.id, "entry_number": e.entry_number, "entry_date": str(e.entry_date), "description": e.description}
                    for e in entries
                ],
            })

    return results


@router.get("/payables", response_model=list[dict])
async def get_accounts_payable(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get accounts payable summary from AP account journal lines."""
    ap_accounts = await db.execute(
        select(Account).where(
            Account.is_active == True,
            Account.code.like("22%"),  # 2200+ = Payables
        )
    )
    results = []
    for acct in ap_accounts.scalars().all():
        bal = await _get_account_balance(db, acct.id)
        if abs(bal) > 0:
            entries_subq = (
                select(JournalEntryLine.journal_entry_id)
                .where(JournalEntryLine.account_id == acct.id)
                .scalar_subquery()
            )
            entry_result = await db.execute(
                select(JournalEntry)
                .where(JournalEntry.id.in_(entries_subq))
                .order_by(JournalEntry.entry_date.desc())
                .limit(10)
            )
            entries = entry_result.scalars().all()

            results.append({
                "account_id": acct.id,
                "account_code": acct.code,
                "account_name": acct.name,
                "outstanding_balance": abs(bal),
                "recent_transactions": [
                    {"id": e.id, "entry_number": e.entry_number, "entry_date": str(e.entry_date), "description": e.description}
                    for e in entries
                ],
            })

    return results
