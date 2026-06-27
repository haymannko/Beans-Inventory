from pydantic_settings import BaseSettings


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
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
