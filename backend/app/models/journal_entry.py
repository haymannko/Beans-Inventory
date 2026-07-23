"""Journal Entry models — double-entry accounting."""

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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class JournalEntry(Base):
    """A double-entry journal entry. Total debits must equal total credits."""
    __tablename__ = "journal_entries"
    __table_args__ = (
        CheckConstraint(
            "entry_type IN ('manual', 'arrival', 'sale', 'purchase_order', 'adjustment', 'transfer')",
            name="ck_journal_entries_entry_type",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    entry_number: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    entry_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    entry_type: Mapped[str | None] = mapped_column(
        String(20), nullable=True, default="manual", index=True
    )
    reference_type: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )
    reference_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True
    )
    is_posted: Mapped[bool] = mapped_column(
        default=True, nullable=False
    )
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    lines: Mapped[list["JournalEntryLine"]] = relationship(
        back_populates="journal_entry",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class JournalEntryLine(Base):
    """A single line in a journal entry (one side of a double-entry)."""
    __tablename__ = "journal_entry_lines"
    __table_args__ = (
        CheckConstraint("debit >= 0", name="ck_jel_debit_non_negative"),
        CheckConstraint("credit >= 0", name="ck_jel_credit_non_negative"),
        CheckConstraint(
            "debit > 0 OR credit > 0",
            name="ck_jel_at_least_one_amount",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    journal_entry_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("journal_entries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("accounts.id"), nullable=False, index=True
    )
    debit: Mapped[float] = mapped_column(
        Numeric(14, 2), nullable=False, default=0
    )
    credit: Mapped[float] = mapped_column(
        Numeric(14, 2), nullable=False, default=0
    )
    description: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    # Relationships
    journal_entry: Mapped["JournalEntry"] = relationship(back_populates="lines")
