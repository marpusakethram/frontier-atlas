"""Database engine, session management, and pgvector capability probe."""

from __future__ import annotations

import socket
from collections.abc import Generator
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import DATA_DIR, settings
from app.core import get_logger

logger = get_logger(__name__)


class Base(DeclarativeBase):
    """Declarative base for all Frontier Atlas relational models."""


def _is_tcp_reachable(host: str, port: int, timeout: float = 0.8) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def resolve_database_url(configured_url: str | None = None) -> tuple[str, str]:
    """Resolve active database URL.

    Uses PostgreSQL when reachable; in local bare-metal development when a local
    PostgreSQL daemon is not running on port 5432, falls back cleanly to a persistent
    local relational file in data/frontier_atlas.db while reporting the status.
    """
    raw_url = (configured_url or settings.DATABASE_URL).strip()
    if raw_url.startswith("sqlite"):
        return raw_url, "sqlite_configured"

    parsed = urlparse(raw_url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432

    if _is_tcp_reachable(host, port):
        return raw_url, "postgresql_connected"

    if settings.APP_ENV.lower() in {"development", "test", "testing"}:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        fallback_path = (DATA_DIR / "frontier_atlas.db").as_posix()
        fallback_url = f"sqlite:///{fallback_path}"
        logger.warning(
            f"PostgreSQL at {host}:{port} is not reachable; activating persistent local relational store at {fallback_path}"
        )
        return fallback_url, f"sqlite_local_fallback (postgres {host}:{port} unreachable)"

    return raw_url, "postgresql_unreachable"


ACTIVE_DATABASE_URL, DATABASE_MODE = resolve_database_url()


def build_engine(url: str) -> Engine:
    if url.startswith("sqlite"):
        eng = create_engine(
            url,
            connect_args={"check_same_thread": False},
            future=True,
        )

        @event.listens_for(eng, "connect")
        def _set_sqlite_pragma(dbapi_connection: Any, _connection_record: Any) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()

        return eng

    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        future=True,
    )


engine: Engine = build_engine(ACTIVE_DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def verify_pgvector_availability(target_engine: Engine | None = None) -> dict[str, Any]:
    """Probe PostgreSQL and pgvector extension availability as required by Phase 15."""
    eng = target_engine or engine
    dialect = eng.dialect.name
    if dialect != "postgresql":
        return {
            "dialect": dialect,
            "pgvector_installed": False,
            "pgvector_mode": "json_float_array_cosine_fallback",
            "detail": (
                "Running on local SQLite relational engine with deterministic NumPy cosine similarity. "
                "Start Docker Compose (pgvector/pgvector:pg16) for native HNSW pgvector indexing."
            ),
        }

    try:
        with eng.begin() as conn:
            row = conn.execute(
                text("SELECT 1 FROM pg_available_extensions WHERE name = 'vector'")
            ).fetchone()
            if row:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                return {
                    "dialect": "postgresql",
                    "pgvector_installed": True,
                    "pgvector_mode": "native_pgvector_extension",
                    "detail": "pgvector extension is installed and active.",
                }
            return {
                "dialect": "postgresql",
                "pgvector_installed": False,
                "pgvector_mode": "json_float_array_cosine_fallback",
                "detail": "PostgreSQL connected; vector extension not installed on host binary, using JSONB float array fallback.",
            }
    except Exception as exc:
        return {
            "dialect": dialect,
            "pgvector_installed": False,
            "pgvector_mode": "error",
            "detail": str(exc),
        }


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
