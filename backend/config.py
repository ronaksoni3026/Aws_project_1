from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Role-Based Campus Placement Portal"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Database Configuration (PostgreSQL default in prod, SQLite fallback for zero-config local run)
    DATABASE_URL: str = "sqlite:///./placement_portal.db"

    # JWT Security Configuration
    SECRET_KEY: str = "institutional-placement-portal-super-secret-key-production-grade-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Rate Limiting Configuration
    RATE_LIMIT_DEFAULT: str = "100/minute"
    RATE_LIMIT_APPLY: str = "10/minute"
    RATE_LIMIT_AUTH: str = "20/minute"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
