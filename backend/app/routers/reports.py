import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.report import ReportResponse
from app.services.report_service import generate_report

import io
import os
from openpyxl import Workbook
from weasyprint import HTML

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("", response_model=ReportResponse)
async def get_report(
    report_type: str = Query("daily", pattern="^(daily|weekly|monthly|custom)$"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    bean_type_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Generate a report based on type and date range."""
    try:
        data = await generate_report(db, report_type, start_date, end_date, bean_type_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return ReportResponse(
        report_type=data["report_type"],
        start_date=date.fromisoformat(data["start_date"]),
        end_date=date.fromisoformat(data["end_date"]),
        data=data,
    )


@router.get("/export/excel")
async def export_report_excel(
    report_type: str = Query("daily", pattern="^(daily|weekly|monthly|custom)$"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    bean_type_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Export report as Excel file."""
    try:
        data = await generate_report(db, report_type, start_date, end_date, bean_type_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    wb = Workbook()
    ws = wb.active
    ws.title = "Report"

    # Header
    ws.append(["Beans Inventory Report"])
    ws.append([f"Type: {data['report_type']}"])
    ws.append([f"Period: {data['start_date']} to {data['end_date']}"])
    ws.append([])

    # Arrivals
    ws.append(["Arrivals Summary"])
    ws.append(["Count", "Bean Type", "Bags", "Total Cost"])
    for item in data["arrivals"]["bags_by_type"]:
        ws.append(["", item["bean_type_name"], item["quantity_bags"], ""])
    ws.append([data["arrivals"]["count"], "", "", data["arrivals"]["total_cost"]])
    ws.append([])

    # Sales
    ws.append(["Sales Summary"])
    ws.append(["Count", "Bean Type", "Bags", "Total Revenue"])
    for item in data["sales"]["bags_by_type"]:
        ws.append(["", item["bean_type_name"], item["quantity_bags"], ""])
    ws.append([data["sales"]["count"], "", "", data["sales"]["total_revenue"]])
    ws.append([])

    # Adjustments
    ws.append(["Adjustments Summary"])
    ws.append(["Count", "Bean Type", "Type", "Quantity (Viss)"])
    for item in data["adjustments"]["details"]:
        sign = "+" if item["adjustment_type"] == "increase" else "-"
        ws.append(["", item["bean_type_name"], sign, item["quantity_viss"]])
    ws.append([data["adjustments"]["count"], "", "", data["adjustments"]["total_quantity_viss"]])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=report_{report_type}.xlsx"},
    )


@router.get("/export/pdf")
async def export_report_pdf(
    report_type: str = Query("daily", pattern="^(daily|weekly|monthly|custom)$"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    bean_type_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Export report as PDF file."""
    try:
        data = await generate_report(db, report_type, start_date, end_date, bean_type_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    font_path = os.path.join(os.path.dirname(__file__), "..", "..", "fonts", "NotoSansMyanmar-Regular.ttf")

    # Build arrivals rows
    arrivals_rows = ""
    for item in data["arrivals"]["bags_by_type"]:
        name = item['bean_type_name']
        arrivals_rows += f"<tr><td>{name}</td><td>{item['quantity_bags']} bags</td></tr>\n"

    # Build sales rows
    sales_rows = ""
    for item in data["sales"]["bags_by_type"]:
        name = item['bean_type_name']
        sales_rows += f"<tr><td>{name}</td><td>{item['quantity_bags']} bags</td></tr>\n"

    # Build adjustments rows
    adjustments_rows = ""
    for item in data["adjustments"]["details"]:
        sign = "+" if item["adjustment_type"] == "increase" else "-"
        name = item['bean_type_name']
        adjustments_rows += f"<tr><td>{name}</td><td>{sign}{item['quantity_viss']} Viss</td></tr>\n"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <style>
        @font-face {{
            font-family: 'Myanmar';
            src: url('file://{os.path.abspath(font_path)}');
        }}
        body {{
            font-family: 'Myanmar', sans-serif;
            padding: 20px;
            font-size: 12px;
        }}
        h1 {{
            font-family: Helvetica, Arial, sans-serif;
            text-align: center;
            font-size: 24px;
            margin-bottom: 5px;
        }}
        .subtitle {{
            font-family: Helvetica, Arial, sans-serif;
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-bottom: 20px;
        }}
        h2 {{
            font-family: Helvetica, Arial, sans-serif;
            font-size: 16px;
            margin-top: 20px;
            margin-bottom: 10px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }}
        .summary {{
            font-family: Helvetica, Arial, sans-serif;
            margin-bottom: 10px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }}
        td {{
            padding: 5px 10px;
            border-bottom: 1px solid #eee;
        }}
        td:last-child {{
            text-align: right;
        }}
        .total {{
            font-weight: bold;
            border-top: 2px solid #333;
        }}
    </style>
    </head>
    <body>
        <h1>Beans Inventory Report</h1>
        <div class="subtitle">Type: {data['report_type']} | Period: {data['start_date']} to {data['end_date']}</div>

        <h2>Arrivals Summary</h2>
        <div class="summary">Count: {data['arrivals']['count']}</div>
        <table>
            {arrivals_rows}
            <tr class="total"><td>Total Cost</td><td>{data['arrivals']['total_cost']:,.0f}</td></tr>
        </table>

        <h2>Sales Summary</h2>
        <div class="summary">Count: {data['sales']['count']}</div>
        <table>
            {sales_rows}
            <tr class="total"><td>Total Revenue</td><td>{data['sales']['total_revenue']:,.0f}</td></tr>
        </table>

        <h2>Adjustments Summary</h2>
        <div class="summary">Count: {data['adjustments']['count']}</div>
        <table>
            {adjustments_rows}
            <tr class="total"><td>Total</td><td>{data['adjustments']['total_quantity_viss']} Viss</td></tr>
        </table>
    </body>
    </html>
    """

    output = io.BytesIO()
    HTML(string=html_content, base_url=os.path.dirname(font_path)).write_pdf(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{report_type}.pdf"},
    )
