from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class StockThreshold(Base):
    __tablename__ = "stock_thresholds"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(__import__("uuid").uuid4())
    )
    bean_type_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bean_types.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    min_stock_bags: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    min_stock_weight: Mapped[float] = mapped_column(Float, default=500.0, nullable=False)
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    alert_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationship
    bean_type = relationship("BeanType", backref="stock_threshold", lazy="joined")
