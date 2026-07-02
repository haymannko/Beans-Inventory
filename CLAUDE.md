# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beans Inventory is a full-stack inventory management system for Myanmar bean trading businesses. It tracks arrivals, sales, storage, stock adjustments, and current inventory balances with JWT auth and role-based access (admin/staff).

## Commands

### Backend (Python/FastAPI)
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # Dev server (auto-creates SQLite DB + seeds)
python scripts/seed.py                        # Standalone seed/reset
pytest --cov=app tests/                       # Run tests with coverage
pytest tests/test_auth.py                     # Run single test file
pytest -k "test_login"                        # Run single test by name
```

### Frontend (React/TypeScript/Vite)
```bash
cd frontend
npm install
npm run dev       # Dev server at http://localhost:5173 (proxies /api to :8000)
npm run build     # Production build → dist/
npm run lint      # ESLint
```

### Docker (full stack)
```bash
docker-compose up --build
# Frontend: http://localhost (nginx) | Backend: http://localhost:8000 | Docs: http://localhost:8000/docs
```

### CI
GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `main`: pytest backend, npm build frontend.

## Architecture

### Request Flow
```
Browser → nginx (Docker, port 80) or Vite dev proxy
  ├─ /api/* → FastAPI backend (port 8000)
  │    Routers → Services → SQLAlchemy async ORM → PostgreSQL (prod) / SQLite (dev)
  │    JWT middleware: deps.py (get_current_user, get_current_admin_user)
  └─ /* → React SPA
       AuthContext (JWT in localStorage) → React Query hooks → Axios (auth interceptor + 401 redirect)
```

### Backend Structure (`backend/app/`)
- `models/` — SQLAlchemy async models (7 tables: users, bean_types, arrivals, sales, storages, stock_adjustments, audit_logs)
- `schemas/` — Pydantic request/response schemas
- `routers/` — FastAPI route handlers (auth, users, bean_types, arrivals, sales, storages, adjustments, dashboard, reports, audit_logs)
- `services/` — Business logic (auth_service, inventory_service, report_service, seed)
- `db/` — Async engine & session factory
- `config.py` — pydantic-settings config (DATABASE_URL, SECRET_KEY, CORS_ORIGINS, JWT expiry). Auto-normalizes DB URLs for async drivers.
- `deps.py` — Dependency injection (auth guards)

### Frontend Structure (`frontend/src/`)
- `api/` — Axios client with auth interceptors
- `contexts/` — AuthContext (JWT token management, auto-refresh on load)
- `hooks/` — React Query hooks per domain (useBeanTypes, useArrivals, useSales, useStorages, useAdjustments, useDashboard, useReports)
- `components/` — Reusable UI components (Layout, Sidebar, Modal, Table, etc.)
- `pages/` — Route pages (Login, Dashboard, BeanTypes, Arrivals, Sales, Storage, Adjustments, Reports, Users, Settings)
- `types/` — TypeScript interfaces

### Key Business Logic
**Stock formula:** `Current Stock = Arrivals(weight_kg) + Storage(quantity) + Adjustments(increase) - Sales(quantity) - Adjustments(decrease)`

Validation: cannot sell more than available stock; cannot decrease stock below zero. All movements recorded in audit_logs.

### Database Auto-Seeding
On startup, `backend/app/main.py` creates all tables and seeds 8 Myanmar bean types + 2 default users (admin/admin123, staff/staff123) if the database is empty. The standalone `scripts/seed.py` does the same independently.

### Deployment
- **Vercel** (frontend): static build. `api/index.py` wraps FastAPI as a Vercel serverless function for `/api/*` rewrites.
- **Render** (backend): `render.yaml` blueprint provisions PostgreSQL + Python web service.
- **Docker**: `docker-compose.yml` runs 4 services (postgres, backend, frontend+nginx, nginx proxy).

## Environment Variables
See `.env.example`. Key vars: `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`, `DEBUG`. Backend config lives in `backend/app/config.py` (pydantic-settings).

## Default Credentials
admin/admin123 (Admin), staff/staff123 (Staff).
