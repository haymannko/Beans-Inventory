---
marp: true
paginate: true
auto-advance: 20
---

## Slide 1: Tech Stack

**Title:** How Beans Inventory Is Built

- **Backend:** Python 3.11+ / FastAPI / SQLAlchemy 2.0 (async) / PostgreSQL
- **Frontend:** React 18 / TypeScript / Vite / Tailwind CSS
- **Data Layer:** React Query (TanStack) / Axios with JWT interceptor
- **Auth:** JWT-based login, role-based access (admin / staff)
- **Deploy:** Vercel (frontend) + Render (backend) + Docker Compose
- **DB:** SQLite (dev) → PostgreSQL (prod), auto-seeded on startup

> **Speaker Notes:**
> Full-stack architecture. FastAPI handles async API with Pydantic validation. React SPA communicates via Axios with automatic 401 redirect. Deployed to Vercel for frontend static hosting and Render for backend with PostgreSQL.

---

## Slide 2: Agents

**Title:** AI Agents Used

- **Frontend Agent** — builds React UI components, forms, pages
- **Backend Agent** — designs FastAPI routes, services, business logic
- **Database Agent** — manages SQLAlchemy models, migrations, seed data
- **DevOps Agent** — Docker, CI/CD, deployment config
- **QA Agent** — writes and runs pytest tests

> **Speaker Notes:**
> Each agent is a specialized subagent stored in `.claude/agents/`. They handle domain-specific tasks — the frontend agent builds UI, the backend agent writes API logic, and so on. This keeps work modular and focused.

---

## Slide 3: Skills

**Title:** Skills Used

- **react-typescript-expert** — expert guidance for React + TypeScript patterns, hooks, forms, context, and testing
- **fastapi-expert** — FastAPI endpoint design, Pydantic schemas, dependency injection
- **postgresql-dba** — database optimization, indexing, query tuning
- **erp-validator** — validates ERP features (PO tracking, supplier management, financial ledger) for data integrity

> **Speaker Notes:**
> Skills are reusable knowledge files in `.claude/skills/`. When Claude Code works on this project, it loads these skills to follow consistent patterns — proper TypeScript typing, FastAPI best practices, database optimization, and ERP validation. Trigger: `@erp-validator validate [feature]` runs the validation checklist on PO, supplier, or ledger modules.

---

## Slide 4: Methodology

**Title:** How We Work

- **Vibe Coding** — AI-assisted development with human oversight
- **Iterative refinement** — build → test → deploy → get feedback → improve
- **Issue-driven** — user feedback becomes GitHub issues, fixed in next chapter
- **Real user validation** — deployed to Vercel, tested by actual warehouse staff
- **Audit trail** — every stock movement logged, every transaction traceable

> **Speaker Notes:**
> We use a vibe coding approach — Claude Code generates code, we review and refine. Changes go through: local dev → git push → auto-deploy to Vercel → user tests → feedback → issues → fix cycle.

---

## Slide 5: Trigger & Commands

**Title:** How to Run

- **Dev server:** `cd frontend && npm run dev` (port 5173)
- **Backend:** `cd backend && uvicorn app.main:app --reload --port 8000`
- **Docker:** `docker-compose up --build` (full stack)
- **Deploy:** `vercel deploy --prod` from frontend directory
- **Tests:** `cd backend && pytest --cov=app tests/`
- **Lint:** `cd frontend && npm run lint`

> **Speaker Notes:**
> One command to start local dev. Docker for full-stack testing. Vercel CLI for production deploys. Tests run with coverage. Everything is automated through GitHub Actions CI.
