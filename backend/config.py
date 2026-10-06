from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Role-Based Campus Placement Portal"
    VERSION: str = "2.0.0"
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

    # AWS Cloud Services Configuration
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET_NAME: Optional[str] = None
    AWS_SES_SENDER_EMAIL: Optional[str] = None

    # Local Storage Fallback Configuration
    UPLOAD_DIR: str = "uploads"
    MAX_RESUME_SIZE_MB: int = 10


settings = Settings()
