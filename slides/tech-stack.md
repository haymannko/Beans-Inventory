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
- **Security Agent** — reviews code for vulnerabilities, secrets, and CVEs

> **Speaker Notes:**
> Each agent is a specialized subagent stored in `.claude/agents/`. They handle domain-specific tasks — the frontend agent builds UI, the backend agent writes API logic, the security agent reviews every change for vulnerabilities. This keeps work modular and focused.

---

## Slide 3: Skills

**Title:** Skills Used

- **react-typescript-expert** — expert guidance for React + TypeScript patterns, hooks, forms, context, and testing
- **fastapi-expert** — FastAPI endpoint design, Pydantic schemas, dependency injection
- **postgresql-dba** — database optimization, indexing, query tuning
- **erp-validator** — validates ERP features (PO tracking, supplier management, financial ledger) for data integrity
- **security-scan** — SAST + secret scanning + dependency verification before every commit

> **Speaker Notes:**
> Skills are reusable knowledge files in `.claude/skills/`. When Claude Code works on this project, it loads these skills to follow consistent patterns — proper TypeScript typing, FastAPI best practices, database optimization, ERP validation, and security scanning. Trigger: `@security-scan scan [backend|frontend|all]` runs the full security pipeline.

---

## Slide 4: Methodology

**Title:** How We Work

- **Vibe Coding** — AI-assisted development with human oversight
- **Iterative refinement** — build → test → deploy → get feedback → improve
- **Issue-driven** — user feedback becomes GitHub issues, fixed in next chapter
- **Real user validation** — deployed to Vercel, tested by actual warehouse staff
- **Audit trail** — every stock movement logged, every transaction traceable
- **Secure workflow** — plan → build → agent review → SAST + secret scan → dep verify → human review → commit

> **Speaker Notes:**
> We use a vibe coding approach — Claude Code generates code, we review and refine. Changes go through: local dev → git push → auto-deploy to Vercel → user tests → feedback → issues → fix cycle. Security is built into the workflow — every commit goes through SAST, secret scanning, and dependency verification.

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

---

## Slide 6: Security Workflow

**Title:** Secure by Default

- **plan → build → agent review → SAST + secret scan → dep verify → human review → commit**
- **SAST:** Bandit (Python) scans for injection, XSS, insecure configs
- **Secret scan:** grep patterns block hardcoded passwords, API keys, tokens
- **Dep verify:** pip-audit + npm audit check for known CVEs
- **Agent review:** Security Agent reviews auth, CORS, input validation
- **Sandbox + least-privilege:** agents run with minimal permissions

> **Speaker Notes:**
> Security is not an afterthought — it's a workflow stage. Every change goes through: plan the feature, build it, agent reviews for vulnerabilities, automated SAST + secret scanning runs, dependencies are verified against CVE databases, then a human reviews before committing. This runs as a pre-commit hook and in CI/CD.
