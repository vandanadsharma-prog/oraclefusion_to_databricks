from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="BACKEND_", extra="ignore")

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    fusion_mock_require_auth: bool = False

    pipelines_dir: str = "pipelines"
    connections_dir: str = "connections"


settings = Settings()
