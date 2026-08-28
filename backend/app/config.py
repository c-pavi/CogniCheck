"""Application configuration loaded from environment variables.

All settings can be overridden via environment variables or a .env file
in the backend/ directory. See .env.example for documentation.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/cognicheck"
    audio_storage_path: str = "./audio_storage"
    cors_origins: str = "http://localhost:5173"
    consent_version: str = "demo-v1"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
