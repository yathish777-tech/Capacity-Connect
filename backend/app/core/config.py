import os
from pathlib import Path

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# ============================================================
# Default database configuration
# ============================================================

DEFAULT_DATABASE_URL = (
    "postgresql://postgres:postgres@localhost:5432/capacity_connect"
)


# ============================================================
# Application Settings
# ============================================================

class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        extra="ignore",
        case_sensitive=False,
    )

    # ========================================================
    # Database
    # ========================================================

    database_url: str = Field(
        default=DEFAULT_DATABASE_URL,
        validation_alias="DATABASE_URL",
    )

    database_schema: str = Field(
        default="capacity_connect_app",
        validation_alias="DATABASE_SCHEMA",
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def use_sync_postgres_driver(cls, value: str) -> str:
        """
        Convert asyncpg URL to standard PostgreSQL URL.

        SQLAlchemy code in this project currently uses the
        synchronous PostgreSQL driver.
        """

        if isinstance(value, str):
            if value.startswith("postgresql+asyncpg://"):
                return value.replace(
                    "postgresql+asyncpg://",
                    "postgresql://",
                    1,
                )

        return value

    @field_validator("database_schema")
    @classmethod
    def validate_database_schema(cls, value: str) -> str:
        """
        PostgreSQL schema names are restricted to letters,
        numbers and underscores.
        """

        if not value.replace("_", "").isalnum():
            raise ValueError(
                "DATABASE_SCHEMA may only contain "
                "letters, numbers, and underscores"
            )

        return value

    # ========================================================
    # Supabase
    # ========================================================
    #
    # SUPABASE_URL:
    #   Project URL
    #
    # SUPABASE_SERVICE_ROLE_KEY:
    #   Server-side secret key used by FastAPI.
    #
    # IMPORTANT:
    # Never expose SUPABASE_SERVICE_ROLE_KEY to React/frontend.
    #
    # ========================================================

    supabase_url: str = Field(
        default="",
        validation_alias="SUPABASE_URL",
    )

    supabase_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "SUPABASE_SERVICE_ROLE_KEY",
            "SUPABASE_SECRET_KEY",
        ),
    )

    supabase_storage_bucket: str = Field(
        default="capacity-connect-files",
        validation_alias="SUPABASE_STORAGE_BUCKET",
    )

    # ========================================================
    # JWT Authentication
    # ========================================================

    jwt_secret: str = Field(
        default="change-this-secret-in-production",
        validation_alias=AliasChoices(
            "JWT_SECRET",
            "JWT_SECRET_KEY",
        ),
    )

    jwt_algorithm: str = Field(
        default="HS256",
        validation_alias="JWT_ALGORITHM",
    )

    jwt_expires_minutes: int = Field(
        default=60 * 24,
        validation_alias=AliasChoices(
            "JWT_EXPIRES_MINUTES",
            "ACCESS_TOKEN_EXPIRE_MINUTES",
        ),
    )

    # ========================================================
    # Ollama / AI
    # ========================================================

    ollama_base_url: str = Field(
        default="http://localhost:11434",
        validation_alias="OLLAMA_BASE_URL",
    )

    ollama_chat_model: str = Field(
        default="llama3.2",
        validation_alias=AliasChoices(
            "OLLAMA_CHAT_MODEL",
            "OLLAMA_MODEL",
        ),
    )

    ollama_embed_model: str = Field(
        default="nomic-embed-text",
        validation_alias="OLLAMA_EMBED_MODEL",
    )

    embedding_dimensions: int = Field(
        default=768,
        validation_alias="EMBEDDING_DIMENSIONS",
    )

    # ========================================================
    # Mock Modes
    # ========================================================

    mock_email: bool = Field(
        default=True,
        validation_alias="MOCK_EMAIL",
    )

    mock_ai: bool = Field(
        default=True,
        validation_alias="MOCK_AI",
    )

    mock_ocr: bool = Field(
        default=True,
        validation_alias="MOCK_OCR",
    )

    # ========================================================
    # SMTP
    # ========================================================

    smtp_host: str = Field(
        default="smtp.gmail.com",
        validation_alias="SMTP_HOST",
    )

    smtp_port: int = Field(
        default=587,
        validation_alias="SMTP_PORT",
    )

    smtp_user: str = Field(
        default="",
        validation_alias="SMTP_USER",
    )

    smtp_password: str = Field(
        default="",
        validation_alias="SMTP_PASSWORD",
    )

    smtp_from: str = Field(
        default="noreply@capacityconnect.imd.gov.in",
        validation_alias="SMTP_FROM",
    )

    # ========================================================
    # Seed Admin
    # ========================================================

    seed_admin_email: str = Field(
        default="adminsih@gmail.com",
        validation_alias="SEED_ADMIN_EMAIL",
    )

    seed_admin_password: str = Field(
        default="",
        validation_alias="SEED_ADMIN_PASSWORD",
    )

    # ========================================================
    # CORS
    # ========================================================

    frontend_origin: str = Field(
        default="http://localhost:5173",
        validation_alias="FRONTEND_ORIGIN",
    )

    frontend_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        validation_alias=AliasChoices(
            "FRONTEND_ORIGINS",
            "CORS_ORIGINS",
        ),
    )

    @field_validator("frontend_origins", mode="before")
    @classmethod
    def parse_frontend_origins(
        cls,
        value: str | list[str],
    ) -> str | list[str]:

        if isinstance(value, str):

            value = value.strip()

            # JSON list:
            # ["http://localhost:5173","http://localhost:3000"]
            if value.startswith("["):
                return value

            # Comma-separated list:
            # http://localhost:5173,http://localhost:3000
            return [
                origin.strip()
                for origin in value.split(",")
                if origin.strip()
            ]

        return value

    # ========================================================
    # Application
    # ========================================================

    app_name: str = Field(
        default="Capacity Connect",
        validation_alias="APP_NAME",
    )

    app_env: str = Field(
        default="development",
        validation_alias="APP_ENV",
    )

    # ========================================================
    # Utility
    # ========================================================

    def using_implicit_database_fallback(self) -> bool:
        """
        Returns True when the application is using the local
        fallback database instead of DATABASE_URL.
        """

        env_files = (
            Path(".env"),
            Path("backend/.env"),
        )

        return (
            self.database_url == DEFAULT_DATABASE_URL
            and "DATABASE_URL" not in os.environ
            and not any(
                env_file.exists()
                for env_file in env_files
            )
        )


# ============================================================
# Global Settings Instance
# ============================================================

settings = Settings()