"""APScheduler Background Ingestion & Analytics Worker (Phase 2.1 & Sprint 3)."""

from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler

from app.core import get_logger
from app.db.session import SessionLocal
from app.ingestion.service import IngestionOrchestrator

logger = get_logger(__name__)

_scheduler: BackgroundScheduler | None = None


def scheduled_corpus_sync_job() -> None:
    """Periodic background job ensuring ingestion checkpoints stay current."""
    try:
        with SessionLocal() as db:
            orchestrator = IngestionOrchestrator()
            orchestrator.run_ingestion(db, connector="fixtures", try_live_network=False)
    except Exception as exc:
        logger.warning(f"Scheduled sync job skipped: {exc}")


def start_background_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        return _scheduler
    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        scheduled_corpus_sync_job,
        trigger="interval",
        hours=12,
        id="frontier_atlas_12h_sync",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("APScheduler background worker started (12h sync cadence).")
    return _scheduler


def stop_background_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        _scheduler = None
