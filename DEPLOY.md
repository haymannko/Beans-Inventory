# Deployment Guide — Beans Inventory

Production deployment pipeline with automated CI/CD, health checks, and rollback.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Actions Pipeline                     │
│                                                                 │
│  CI ──────────────────┐                                         │
│  ├── 🧪 Test Backend  │                                         │
│  └── 🧪 Test Frontend │                                         │
│                        ▼                                         │
│             🐳 Docker Build                                     │
│                   │                                              │
│         ┌─────────┴─────────┐                                   │
│         ▼                   ▼                                   │
│  🌐 Deploy Frontend   🚀 Deploy Backend                        │
│  (Vercel)             (Render)                                  │
│         │                   │                                   │
│         └─────────┬─────────┘                                   │
│                   ▼                                              │
│          🏥 Health Check                                         │
│                   │                                              │
│         ┌─────────┴─────────┐                                   │
│         ▼                   ▼                                   │
│  🔄 Rollback          🧹 Cleanup                                │
│  (if failed)          (old images)                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Production Services                        │
│                                                                 │
│  ┌──────────────┐          ┌──────────────────────┐            │
│  │   Vercel     │          │   Render              │            │
│  │              │          │                       │            │
│  │  React SPA   │◄────────│  FastAPI Backend       │            │
│  │  (port 80)   │  /api/*  │  (port 8000)          │            │
│  │              │  proxy   │                       │            │
│  │  beans-app-  │          │  beans-inventory-api  │            │
│  │  iota.vercel │          │  .onrender.com        │            │
│  │  .app        │          │                       │            │
│  └──────────────┘          └──────────┬───────────┘            │
│                                        │                        │
│                              ┌─────────▼─────────┐             │
│                              │  PostgreSQL (Render)│             │
│                              │  beans-inventory-db │             │
│                              │  (free tier)        │             │
│                              └───────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment Split

| Service   | Platform   | Workflow            | Notes                         |
|-----------|------------|---------------------|-------------------------------|
| Frontend  | Vercel     | `pipeline.yml`     | Deployed via Vercel CLI       |
| Backend   | Render     | `pipeline.yml`     | Docker image from GHCR        |
| Database  | Render     | Managed             | PostgreSQL 15, free tier      |
| Security  | —          | `security.yml`     | Separate scan workflow        |

---

## Files

### `.github/workflows/pipeline.yml` — Unified CI/CD Pipeline

Single workflow that renders as a professional job graph in GitHub Actions UI.

| Job               | Stage    | Purpose                                    |
|-------------------|----------|--------------------------------------------|
| `test-backend`    | CI       | Run pytest with coverage                   |
| `test-frontend`   | CI       | Type check, lint, build React app          |
| `docker-build`    | Build    | Build Docker image → push to GHCR          |
| `deploy-frontend` | Deploy   | Deploy to Vercel via CLI                   |
| `deploy-backend`  | Deploy   | Trigger Render deploy via API              |
| `health-check`    | Verify   | Poll `/health` until healthy               |
| `rollback`        | Recovery | Revert if health check fails               |
| `cleanup`         | Maintain | Delete old GHCR images (keep last 5)       |

### `.github/workflows/security.yml` — Security Scans (unchanged)

Separate workflow for gitleaks + semgrep. Runs on push/PR.

| Job            | Purpose                                        | Dependencies       |
|----------------|------------------------------------------------|--------------------|
| `test-backend` | Run pytest with coverage                      | —                  |
| `test-frontend`| Build React app (verifies no TS errors)       | —                  |
| `build`        | Build Docker image → push to GHCR             | tests pass         |
| `deploy`       | Trigger Render deploy via API                 | image built        |
| `health-check` | Poll `/health` endpoint until healthy          | deploy started     |
| `rollback`     | Revert to previous deploy if health fails     | health-check fails |
| `cleanup`      | Delete old GHCR images (keep last 5)          | health-check passes|

### `backend/Dockerfile` (MODIFIED)

Production-hardened:
- **Multi-stage build** — smaller final image
- **Non-root user** — runs as `appuser` (UID 1000)
- **Health check** — `HEALTHCHECK` instruction
- **Port 8000** — consistent with local dev
- **curl installed** — for health checks

### `frontend/Dockerfile` (MODIFIED)

- **Pinned nginx version** — `nginx:1.25-alpine`
- **Health check** — `HEALTHCHECK` instruction
- **npm ci --ignore-scripts** — safer installs

### `frontend/nginx.conf` (MODIFIED)

- **Security headers** — X-Frame-Options, X-Content-Type-Options, etc.
- **Gzip compression** — reduces payload sizes
- **Static asset caching** — 1-year cache for JS/CSS/images

### `docker-compose.prod.yml` (NEW)

Production override for local Docker Compose deployments:
- **No exposed ports** on DB or backend
- **Secrets from environment** — all required
- **Health checks** on all services
- **Resource limits** — backend capped at 512MB / 1 CPU

---

## Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions** in your repo.

| Secret              | Description                                     | How to get                              |
|---------------------|------------------------------------------------|-----------------------------------------|
| `RENDER_API_KEY`    | Render API authentication key                   | https://dashboard.render.com/settings#api-keys |
| `RENDER_SERVICE_ID` | The backend service ID                          | From Render dashboard URL: `svc_xxxxx` |
| `DATABASE_URL`      | PostgreSQL connection string                    | Render dashboard → Database → Connection Info |
| `SECRET_KEY`        | JWT signing key (min 32 chars)                  | Run: `openssl rand -hex 32`             |
| `VERCEL_TOKEN`      | Vercel deploy token                             | https://vercel.com/account/tokens       |
| `VERCEL_ORG_ID`     | Vercel organization ID                          | From `.vercel/project.json`             |
| `VERCEL_PROJECT_ID` | Vercel project ID                               | From `.vercel/project.json`             |

> **⚠️ Never commit secrets to the repo.** GitHub Actions reads them from encrypted storage at runtime.

---

## First-Time Setup

### 1. Create Render Services

```bash
# If you haven't already:
# 1. Connect your GitHub repo to Render
# 2. Create a PostgreSQL database (free tier)
# 3. Create a Python web service (point to backend/Dockerfile)
# 4. Link the database to the backend service
```

### 2. Set GitHub Secrets

```bash
# Via GitHub CLI:
gh secret set RENDER_API_KEY --body "rnd_xxxxxxxxxxxxx"
gh secret set RENDER_SERVICE_ID --body "svc_xxxxxxxxxxxxx"
gh secret set DATABASE_URL --body "postgresql://postgres:xxx@xxx.render.com:5432/beans_inventory"
gh secret set SECRET_KEY --body "$(openssl rand -hex 32)"
```

### 3. Push to Deploy

```bash
git add .
git commit -m "feat: add production deployment pipeline"
git push origin main
# Pipeline runs automatically!
```

---

## Rollback Procedure

### Automatic Rollback

If the health check fails, the pipeline automatically:
1. Detects the failure
2. Triggers a redeploy of the previous successful version
3. Logs the failure

### Manual Rollback

```bash
# Via Render Dashboard:
# 1. Go to https://dashboard.render.com
# 2. Select your backend service
# 3. Go to "Deploys" tab
# 4. Find the last successful deploy
# 5. Click "Rollback to this deploy"

# Via Render API:
curl -X POST "https://api.render.com/v1/services/svc_xxxxx/deploys" \
  -H "Authorization: Bearer rnd_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"deploy": "dpl_xxxxx"}'
```

### Emergency: Skip Tests

For urgent hotfixes:
1. Go to Actions → Deploy → "Run workflow"
2. Check "Skip tests (emergency deploy)"
3. Click "Run workflow"

---

## Local Development

### Docker Compose (Development)

```bash
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

### Docker Compose (Production Preview)

```bash
export POSTGRES_PASSWORD=your-secure-password
export SECRET_KEY=$(openssl rand -hex 32)
export DATABASE_URL="postgresql+asyncpg://postgres:${POSTGRES_PASSWORD}@db:5432/beans_inventory"

docker compose -f docker-compose.prod.yml up --build
# Access: http://localhost
```

---

## Health Check Endpoints

| Endpoint         | Service  | Expected Response                     |
|------------------|----------|---------------------------------------|
| `GET /health`    | Backend  | `{"status": "ok", "version": "1.0.1", "db": "ok, N users"}` |
| `GET /`          | Frontend | 200 OK (SPA HTML)                     |

---

## Monitoring

```bash
# Check deploy status
gh run list --workflow=deploy.yml --limit=5

# Check Render deploys
curl "https://api.render.com/v1/services/svc_xxxxx/deploys?limit=3" \
  -H "Authorization: Bearer rnd_xxxxx" | jq '.[].status'
```

---

## Troubleshooting

| Issue                          | Solution                                              |
|--------------------------------|-------------------------------------------------------|
| Deploy fails at build          | Check Dockerfile syntax, verify requirements.txt      |
| Health check fails after deploy| Check Render logs, verify DATABASE_URL is correct     |
| CORS errors from frontend      | Update CORS_ORIGINS in Render env vars                |
| Database connection refused    | Ensure Render PostgreSQL is linked to backend service |
| GHCR auth failure              | Check GITHUB_TOKEN has `packages:write` permission    |

---

## Cost Estimate

| Service         | Tier     | Monthly Cost |
|-----------------|----------|--------------|
| Render Backend  | Free     | $0           |
| Render DB       | Free     | $0           |
| Vercel          | Hobby    | $0           |
| GitHub Actions  | Free     | $0           |
| **Total**       |          | **$0/mo**    |

---

*Last updated: 2026-07-10*
