import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Arrival(Base):
    __tablename__ = "arrivals"
    __table_args__ = (
        CheckConstraint("quantity_bags >= 0", name="ck_arrivals_quantity_bags_non_negative"),
        CheckConstraint("weight_kg >= 0", name="ck_arrivals_weight_kg_non_negative"),
        CheckConstraint("purchase_price >= 0", name="ck_arrivals_purchase_price_non_negative"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    bean_type_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bean_types.id"), nullable=False, index=True
    )
    quantity_bags: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    supplier_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    purchase_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    arrival_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
