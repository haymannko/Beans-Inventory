"""Cash Book model — records cash payment and receipt transactions."""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CashBookEntry(Base):
    """A single cash book entry (payment or receipt)."""
    __tablename__ = "cash_book_entries"
    __table_args__ = (
        CheckConstraint(
            "transaction_type IN ('receipt', 'payment')",
            name="ck_cash_book_transaction_type",
        ),
        CheckConstraint(
            "amount > 0",
            name="ck_cash_book_amount_positive",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    entry_number: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    transaction_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True
    )
    transaction_type: Mapped[str] = mapped_column(
        String(10), nullable=False, index=True
    )
    amount: Mapped[float] = mapped_column(
        Numeric(14, 2), nullable=False
    )
    description: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    counterparty: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    payment_method: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    reference_type: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )
    reference_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
