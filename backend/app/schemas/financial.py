from datetime import date

from pydantic import BaseModel


class TrialBalanceRow(BaseModel):
    account_id: str
    account_code: str
    account_name: str
    account_type: str
    total_debit: float
    total_credit: float
    balance: float  # Positive = debit balance, negative = credit balance


class TrialBalanceResponse(BaseModel):
    as_of_date: date
    rows: list[TrialBalanceRow] = []
    total_debit: float = 0
    total_credit: float = 0


class IncomeStatementRow(BaseModel):
    account_id: str
    account_code: str
    account_name: str
    balance: float


class IncomeStatementResponse(BaseModel):
    start_date: date
    end_date: date
    revenues: list[IncomeStatementRow] = []
    total_revenue: float = 0
    expenses: list[IncomeStatementRow] = []
    total_expense: float = 0
    net_income: float = 0


class BalanceSheetRow(BaseModel):
    account_id: str
    account_code: str
    account_name: str
    balance: float


class BalanceSheetResponse(BaseModel):
    as_of_date: date
    assets: list[BalanceSheetRow] = []
    total_assets: float = 0
    liabilities: list[BalanceSheetRow] = []
    total_liabilities: float = 0
    equity: list[BalanceSheetRow] = []
    total_equity: float = 0


class JournalEntryFilters(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    entry_type: str | None = None
    account_id: str | None = None
    search: str | None = None


class CashBookFilters(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    transaction_type: str | None = None
    search: str | None = None
