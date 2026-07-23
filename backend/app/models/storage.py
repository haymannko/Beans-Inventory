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

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Storage(Base):
    __tablename__ = "storages"
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="ck_storages_quantity_non_negative"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    bean_type_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bean_types.id"), nullable=False, index=True
    )
    quantity_bags: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    warehouse_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    warehouse_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("warehouses.id"), nullable=True, index=True
    )
    storage_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    warehouse: Mapped["Warehouse | None"] = relationship(
        back_populates="storages", lazy="selectin"
    )
