import enum
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


class AdjustmentType(str, enum.Enum):
    INCREASE = "increase"
    DECREASE = "decrease"


class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_adjustments_quantity_positive"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    bean_type_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bean_types.id"), nullable=False, index=True
    )
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    adjustment_type: Mapped[str] = mapped_column(
        String(10), nullable=False
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    adjustment_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
