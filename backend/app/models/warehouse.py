from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Warehouse(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "warehouses"

    name: Mapped[str] = mapped_column(
        String(200), unique=True, nullable=False, index=True
    )
    location: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    contact_person: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    phone: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, index=True
    )

    # Relationships
    outgoing_transfers: Mapped[list["WarehouseTransfer"]] = relationship(
        back_populates="from_warehouse",
        foreign_keys="WarehouseTransfer.from_warehouse_id",
        lazy="selectin",
    )
    incoming_transfers: Mapped[list["WarehouseTransfer"]] = relationship(
        back_populates="to_warehouse",
        foreign_keys="WarehouseTransfer.to_warehouse_id",
        lazy="selectin",
    )
    storages: Mapped[list["Storage"]] = relationship(
        back_populates="warehouse",
        lazy="selectin",
    )
