# Ch-3 Report: Beans Inventory Management System

**Author:** haymannko
**Project:** Beans Inventory Management
**Repository:** https://github.com/haymannko/Beans-Inventory
**Date:** 2026-06-25

---

## 1. Gist

Beans Inventory Management System is a web application designed for Myanmar bean warehouse owners and staff to track inventory accurately. The system manages bean arrivals, sales, storage locations, stock adjustments, and generates reports with full Myanmar language support.

---

## 2. Story

### User Story

> As a **bean warehouse owner**, I want to **track my inventory digitally** so that **I can know exactly how many bags of each bean type I have at any time, reduce errors, and make better business decisions**.

### Scenario

1. **Morning:** Staff logs incoming bean shipments (arrivals) — bean type, quantity, price
2. **During Day:** Staff records sales as customers purchase beans
3. **End of Day:** Owner views dashboard to see today's transactions and current stock
4. **Weekly:** Owner generates PDF/Excel reports for business analysis
5. **As Needed:** Staff adjusts stock when physical count differs from system (damage, spoilage)

---

## 3. Why This Solution

### Problems with Current Approach
- **Paper records** get lost, damaged, or are hard to search
- **Excel spreadsheets** require manual formulas and are error-prone
- **No real-time visibility** — owner must wait for manual counts
- **Myanmar bean names** (ပဲတီစိမ်း, မြေထောက်ပဲ, etc.) are hard to handle in generic software

### Why Digital Solution
- ✅ Real-time stock tracking — always know current inventory
- ✅ Automatic calculations — no manual errors
- ✅ Myanmar language support — bean names display correctly in UI, Excel, and PDF
- ✅ Audit trail — track who changed what and when
- ✅ One-click reports — better business decisions

---

## 4. Why Not Other Approaches

| Alternative | Why Rejected |
|-------------|--------------|
| **Generic ERP (SAP, Oracle)** | Too expensive, too complex for small bean warehouses |
| **Excel-only solution** | No real-time updates, manual errors, no multi-user support |
| **Mobile app only** | Warehouse staff prefer desktop for data entry; mobile for quick checks |
| **Existing inventory SaaS** | No Myanmar language support, not tailored for bean industry |

### Our Approach
- **Web app** (works on any device with browser)
- **Custom-built** for Myanmar bean warehouse workflow
- **Myanmar font support** throughout (UI, Excel, PDF)
- **Simple & fast** — React + FastAPI stack

---

## 5. Tech Spec

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend   │────▶│   Backend   │────▶│  Database   │
│  React+Vite  │◀────│   FastAPI   │◀────│   SQLite    │
└─────────────┘     └─────────────┘     └─────────────┘
     :5173               :8000
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy (async) |
| **Database** | SQLite (dev), PostgreSQL (production) |
| **Auth** | JWT tokens, bcrypt password hashing |
| **Reports** | WeasyPrint (PDF), OpenPyXL (Excel) |
| **Deployment** | Docker, Docker Compose, Nginx |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/bean-types` | GET/POST | Manage bean types |
| `/api/arrivals` | GET/POST | Record arrivals |
| `/api/sales` | GET/POST | Record sales |
| `/api/storages` | GET/POST | Manage storage locations |
| `/api/adjustments` | GET/POST | Stock adjustments |
| `/api/reports/export/pdf` | GET | Export PDF report |
| `/api/reports/export/excel` | GET | Export Excel report |
| `/api/dashboard` | GET | Dashboard statistics |

### Database Models

- **User** — id, username, password_hash, role (admin/staff)
- **BeanType** — id, name (Myanmar), description (English)
- **Storage** — id, name, location, capacity
- **Arrival** — id, bean_type_id, storage_id, quantity_bags, purchase_price, date
- **Sale** — id, bean_type_id, storage_id, quantity_bags, sale_price, date
- **StockAdjustment** — id, bean_type_id, storage_id, quantity, adjustment_type, date

---

## 6. Definition of Done

### Functional Requirements

- [x] User can login with username/password
- [x] Admin can manage bean types (CRUD)
- [x] Staff can record arrivals with bean type, quantity, price
- [x] Staff can record sales with bean type, quantity, price
- [x] Staff can manage storage locations
- [x] Staff can make stock adjustments (increase/decrease)
- [x] Dashboard shows current stock levels and recent activity
- [x] Reports can be exported to PDF with Myanmar font support
- [x] Reports can be exported to Excel with Myanmar bean names
- [x] Myanmar bean names display correctly throughout the system

### Non-Functional Requirements

- [x] Page load time < 2 seconds
- [x] API response time < 500ms
- [x] Works on Chrome, Firefox, Safari
- [x] Responsive design for desktop and tablet
- [x] Secure authentication with JWT
- [x] Docker deployment ready

### Deliverables

- [x] Working web application (frontend + backend)
- [x] Source code in GitHub repository
- [x] README with setup instructions
- [x] Docker configuration for deployment
- [x] PechaKucha presentation (6 slides)

---

## Summary

The Beans Inventory Management System successfully digitizes the bean warehouse workflow for Myanmar businesses. It provides real-time inventory tracking, accurate record-keeping, and professional reporting — all with full Myanmar language support. The system is ready for deployment and can be customized for specific warehouse needs.

---

*Generated: 2026-06-25*
