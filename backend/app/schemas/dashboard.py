from pydantic import BaseModel


class StockByBeanType(BaseModel):
    bean_type_id: str
    bean_type_name: str
    total_stock: float
    total_stock_bags: int = 0
    storage_bags: int = 0


class StorageByWarehouse(BaseModel):
    warehouse_name: str
    quantity_bags: int


class DashboardResponse(BaseModel):
    total_bean_types: int
    total_current_stock: float
    total_current_stock_bags: int = 0
    total_storage_bags: int = 0
    storage_by_warehouse: list[StorageByWarehouse] = []
    today_arrivals: float
    today_arrivals_bags: int = 0
    today_sales: float
    today_sales_bags: int = 0
    low_stock_alerts: list[StockByBeanType]
    recent_transactions: list[dict]
    stock_by_type: list[StockByBeanType]
    monthly_sales: list[dict]
    monthly_arrivals: list[dict]
