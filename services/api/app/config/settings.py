"""Application configuration and free-tier Gemini model eligibility rules."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import ClassVar

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[4]
DATA_DIR = ROOT_DIR / "data"


class Settings(BaseSettings):
    """Typed environment settings for Frontier Atlas."""

    model_config = SettingsConfigDict(
        env_file=(str(ROOT_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/frontier_atlas"
    )

    # Google Gemini API (Official google-genai SDK only)
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-3.8-flash")

    # External connectors
    OPENALEX_API_KEY: str = Field(default="")
    GITHUB_TOKEN: str = Field(default="")
    ARXIV_USER_AGENT: str = Field(
        default="FrontierAtlas/1.0 (https://github.com/frontier-atlas; mailto:research@frontier-atlas.org)"
    )

    # Runtime environment
    APP_ENV: str = Field(default="development")
    APP_BASE_URL: str = Field(default="http://localhost:3000")
    API_BASE_URL: str = Field(default="http://localhost:8000")

    # AI budgets and controls
    ENABLE_AI: bool = Field(default=True)
    AI_MAX_REQUESTS_PER_DAY: int = Field(default=100, ge=1, le=1500)
    AI_MAX_REQUESTS_PER_RUN: int = Field(default=8, ge=1, le=50)
    AI_MAX_REQUESTS_PER_MINUTE: int = Field(default=5, ge=1, le=15)

    # Connector budgets
    OPENALEX_MAX_RPS: float = Field(default=5.0)
    ARXIV_MIN_DELAY_SECONDS: float = Field(default=3.0)
    GITHUB_MAX_RPM: int = Field(default=25)

    # Security
    API_WRITE_TOKEN: str = Field(default="")
    CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )

    # Free-tier eligible Gemini model allowlist (Flash & Flash-Lite family only; never Pro/Ultra/paid)
    FREE_TIER_MODEL_ALLOWLIST: ClassVar[tuple[str, ...]] = (
        "gemini-3.8-flash",
        "gemini-3.8-flash-lite",
        "gemini-3.0-flash",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash",
    )

    @property
    def is_gemini_configured(self) -> bool:
        return bool(self.ENABLE_AI and self.GEMINI_API_KEY.strip())

    def is_model_free_tier_eligible(self, model_name: str | None = None) -> bool:
        """Verify that a Gemini model is on the free-tier allowlist and not a paid Pro/Ultra tier."""
        candidate = (model_name or self.GEMINI_MODEL or "").strip().lower()
        if candidate.startswith("models/"):
            candidate = candidate.removeprefix("models/")
        if not candidate:
            return False
        if any(blocked in candidate for blocked in ("pro", "ultra", "imagen", "veo", "paid")):
            return False
        return candidate in self.FREE_TIER_MODEL_ALLOWLIST


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
