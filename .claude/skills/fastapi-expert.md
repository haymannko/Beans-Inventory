# fastapi-expert

Expert guidance for building high-performance APIs with FastAPI.

## When to Use

Use this skill when working with FastAPI projects — building endpoints, defining schemas, handling dependencies, configuring middleware, writing tests, or optimizing performance.

## Core Principles

- **Type hints are mandatory.** Every endpoint parameter and response model must have Python type annotations. FastAPI uses them for validation, serialization, and docs.
- **Pydantic models for everything.** Define request/response schemas with `BaseModel`. Never accept raw dicts at the endpoint level.
- **Async by default.** Use `async def` for endpoints. Only use `def` when calling synchronous blocking code (e.g., synchronous DB drivers).
- **Dependency injection.** Use `Depends()` for shared logic — auth, DB sessions, feature flags. Nest dependencies freely.

## Project Structure

```
app/
├── main.py              # FastAPI app instance, lifespan, middleware
├── config.py            # Settings via pydantic-settings BaseSettings
├── dependencies.py      # Shared dependencies (get_db, get_current_user)
├── models/              # SQLAlchemy / ORM models
│   └── user.py
├── schemas/             # Pydantic request/response models
│   └── user.py
├── routers/             # APIRouter groups
│   ├── __init__.py
│   └── users.py
├── services/            # Business logic (thin routers, fat services)
│   └── user_service.py
├── core/                # Security, exceptions, middleware
│   ├── security.py
│   └── exceptions.py
└── tests/
    ├── conftest.py      # Fixtures: TestClient, async client, DB setup
    └── test_users.py
```

## Endpoint Patterns

```python
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.user import UserCreate, UserResponse
from app.dependencies import get_db, get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, db=Depends(get_db)):
    ...

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db=Depends(get_db)):
    ...
```

## Schema Design

```python
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
```

- Use `Field()` for validation constraints and example values.
- Separate Create / Update / Response schemas. Never expose internal fields in responses.
- Use `model_config = {"from_attributes": True}` for ORM compatibility.

## Dependency Injection

```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    user = await verify_token(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user
```

## Error Handling

```python
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

class AppError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        self.code = code
        self.message = message
        self.status = status

async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status,
        content={"error": {"code": exc.code, "message": exc.message}},
    )

# In main.py:
app.add_exception_handler(AppError, app_error_handler)
```

## Middleware

```python
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Background Tasks

```python
from fastapi import BackgroundTasks

def send_notification(email: str, message: str):
    ...  # Send email, push notification, etc.

@router.post("/notify")
async def notify(background_tasks: BackgroundTasks):
    background_tasks.add_task(send_notification, "user@example.com", "Hello")
    return {"status": "queued"}
```

## Testing

```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_create_user(client):
    response = await client.post("/users/", json={
        "email": "test@example.com",
        "name": "Test User",
        "password": "securepass123"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "password" not in data
```

## Performance Tips

- Use `response_model` to control serialization — avoid returning ORM objects directly.
- Enable `orjson` for faster JSON serialization: `from fastapi.responses import ORJSONResponse`.
- Use `async` DB drivers (asyncpg, aiomysql). Sync drivers block the event loop.
- Add `Cache-Control` headers for cacheable endpoints.
- Use `BackgroundTasks` for non-critical work (emails, analytics). Use Celery/RQ for heavy jobs.

## OpenAPI Docs

- FastAPI auto-generates `/docs` (Swagger) and `/redoc` (ReDoc).
- Use `summary`, `description`, and `response_description` on endpoints.
- Add `openapi_tags` metadata for grouped, documented sections.
- Use `example` in `Field()` and `model_config` `json_schema_extra` for request body examples.
