from pydantic_settings import BaseSettings


def _normalize_database_url(url: str) -> str:
    """Ensure PostgreSQL URLs use the psycopg driver and include sslmode for Render."""
    # Normalize scheme to postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    # Use psycopg (async) driver
    if url.startswith("postgresql://") and "+" not in url.split("://")[1].split("/")[0]:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
    # Add sslmode=require only for external (render.com) PostgreSQL URLs
    # Internal Render URLs (short hostname like dpg-xxx) don't need SSL
    if "psycopg" in url and "render.com" in url and "sslmode" not in url:
        separator = "&" if "?" in url else "?"
        url += f"{separator}sslmode=require"
    return url


class Settings(BaseSettings):
    APP_NAME: str = "Beans Inventory Management System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database (use sqlite+aiosqlite:///./beans_inventory.db for local dev without PostgreSQL)
    DATABASE_URL: str = "sqlite+aiosqlite:///./beans_inventory.db"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://172.21.29.186:5173",
        "http://172.21.29.186:3000",
        "https://beans-app-iota.vercel.app",
        "https://beans-app-*.vercel.app",
        "https://*.vercel.app",
        "https://beans-inventory-api.onrender.com",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
settings.DATABASE_URL = _normalize_database_url(settings.DATABASE_URL)
