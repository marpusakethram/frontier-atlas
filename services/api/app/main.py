"""Frontier Atlas FastAPI Application Entrypoint (Phase 2.2 & Phase 15)."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.config import settings
from app.core import configure_logging, get_logger
from app.db.seed import seed_database
from app.db.session import Base, SessionLocal, engine, verify_pgvector_availability
from app.ingestion import IngestionOrchestrator
from app.jobs import start_background_scheduler, stop_background_scheduler
from app.models import Paper

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup sequence: connect DB, create tables, verify pgvector, seed baseline & corpus, start scheduler."""
    Base.metadata.create_all(bind=engine)
    pgv = verify_pgvector_availability()
    logger.info(f"Database & pgvector status verified: {pgv}")

    with SessionLocal() as db:
        seed_database(db, force_reset=False)
        if db.query(Paper).count() < 100:
            orchestrator = IngestionOrchestrator()
            orchestrator.run_ingestion(db, connector="fixtures", try_live_network=False)

    start_background_scheduler()
    yield
    stop_background_scheduler()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Frontier Atlas — Deep-Tech Investment Intelligence API",
        description=(
            "Institutional-grade research intelligence platform for venture capital investors. "
            "Combines OpenAlex, arXiv, and GitHub ingestion with deterministic momentum scoring, "
            "breakthrough detection, first-principles unit economics, NetworkX knowledge graphs, "
            "and controlled free-tier Google Gemini research synthesis."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS + ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)
    return app


app = create_app()
