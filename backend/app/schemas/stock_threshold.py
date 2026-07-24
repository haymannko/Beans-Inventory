from datetime import datetime

from pydantic import BaseModel, Field


class StockThresholdCreate(BaseModel):
    min_stock_bags: int = Field(10, ge=0, description="Minimum stock level in bags")
    min_stock_weight: float = Field(500.0, ge=0, description="Minimum stock level in weight (kg)")
    email_enabled: bool = False
    alert_email: str | None = None


class StockThresholdUpdate(BaseModel):
    min_stock_bags: int | None = Field(None, ge=0)
    min_stock_weight: float | None = Field(None, ge=0)
    email_enabled: bool | None = None
    alert_email: str | None = None


class StockThresholdResponse(BaseModel):
    id: str
    bean_type_id: str
    bean_type_name: str | None = None
    min_stock_bags: int
    min_stock_weight: float
    email_enabled: bool
    alert_email: str | None
    current_stock_bags: int = 0
    current_stock_weight: float = 0
    is_low_stock: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LowStockAlert(BaseModel):
    bean_type_id: str
    bean_type_name: str
    current_stock_bags: int
    current_stock_weight: float
    min_stock_bags: int
    min_stock_weight: float
    shortfall_bags: int = 0
    shortfall_weight: float = 0
    severity: str = "info"  # "info", "warning", "critical"


class StockAlertSummary(BaseModel):
    total_thresholds: int
    low_stock_count: int
    critical_count: int
    alerts: list[LowStockAlert]
