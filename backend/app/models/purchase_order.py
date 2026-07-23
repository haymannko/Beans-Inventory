import enum
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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class PurchaseOrderStatus(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    ORDERED = "ordered"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'approved', 'ordered', 'received', 'cancelled')",
            name="ck_purchase_orders_status",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    po_number: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    supplier_name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(
        String(10), nullable=False, default=PurchaseOrderStatus.DRAFT.value, index=True
    )
    order_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    expected_delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationship to items
    items: Mapped[list["PurchaseOrderItem"]] = relationship(
        back_populates="purchase_order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    __table_args__ = (
        CheckConstraint("quantity_bags > 0", name="ck_po_items_quantity_bags_positive"),
        CheckConstraint("unit_price >= 0", name="ck_po_items_unit_price_non_negative"),
        CheckConstraint("total_price >= 0", name="ck_po_items_total_price_non_negative"),
        CheckConstraint(
            "received_quantity_bags >= 0",
            name="ck_po_items_received_quantity_bags_non_negative",
        ),
        CheckConstraint(
            "received_quantity_bags <= quantity_bags",
            name="ck_po_items_received_quantity_bags_not_exceed",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    purchase_order_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bean_type_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bean_types.id"), nullable=False, index=True
    )
    quantity_bags: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    received_quantity_bags: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    purchase_order: Mapped["PurchaseOrder"] = relationship(back_populates="items")
