from datetime import date

from pydantic import BaseModel


class ReportRequest(BaseModel):
    report_type: str = "daily"  # daily, weekly, monthly, custom
    start_date: date | None = None
    end_date: date | None = None
    bean_type_id: str | None = None


class ReportResponse(BaseModel):
    report_type: str
    start_date: date
    end_date: date
    data: dict
