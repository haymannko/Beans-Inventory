# Deployment Guide

## Overview

This project has two parts:
- **Frontend** (React + Vite) → Deploy to **Vercel**
- **Backend** (FastAPI + Python) → Deploy to **Render** or **Railway**

---

## Step 1: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **New** → **Web Service**
3. Connect your GitHub repo: `haymannko/Beans-Inventory`
4. Configure:
   - **Name:** `beans-inventory-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   - `SECRET_KEY` = (generate a random secret)
   - `DATABASE_URL` = `sqlite:///./beans_inventory.db`
6. Click **Create Web Service**
7. Wait for deployment → Copy the URL (e.g., `https://beans-inventory-api.onrender.com`)

---

## Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **Add New** → **Project**
3. Import your GitHub repo: `haymannko/Beans-Inventory`
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add Environment Variable:
   - `VITE_API_URL` = `https://beans-inventory-api.onrender.com/api`
   - (Replace with your actual Render backend URL)
6. Click **Deploy**
7. Wait for deployment → You'll get a URL like `https://beans-inventory.vercel.app`

---

## Step 3: Seed the Database

After backend is deployed, run the seed script:

```bash
# SSH into Render or use Render Shell
cd backend
python scripts/seed.py
```

This creates default users:
- **Admin:** `admin` / `admin123`
- **Staff:** `staff` / `staff123`

---

## Step 4: Update CORS (if needed)

If you get CORS errors, update `backend/app/config.py`:

```python
CORS_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://your-frontend-url.vercel.app",  # Add your Vercel URL
]
```

---

## Alternative: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub**
3. Select `haymannko/Beans-Inventory`
4. Set **Root Directory** to `backend`
5. Add environment variables
6. Railway will auto-detect Python and deploy

---

## Quick Links

| Service | URL |
|---------|-----|
| Frontend | `https://your-project.vercel.app` |
| Backend API | `https://your-project.onrender.com` |
| API Docs | `https://your-project.onrender.com/docs` |

---

## Troubleshooting

### CORS Error
- Make sure your Vercel URL is in `CORS_ORIGINS` in backend config

### API Not Found (404)
- Check `VITE_API_URL` environment variable in Vercel
- Make sure backend is running on Render/Railway

### Database Error
- Run `python scripts/seed.py` on the backend
- Check `DATABASE_URL` environment variable

---

*Last updated: 2026-06-25*
