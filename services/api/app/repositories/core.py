"""Repository data-access classes for Frontier Atlas entities (Sprint 2)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session

from app.intelligence.trends import compute_repository_snapshot_growth
from app.models import (
    Alert,
    BreakthroughCandidate,
    Company,
    EvidenceSource,
    IngestionRun,
    InvestmentThesis,
    Organization,
    Paper,
    Repository,
    RepositorySnapshot,
    Sector,
    Technology,
    Watchlist,
    WatchlistItem,
)


class AtlasRepository:
    """Encapsulated database queries ensuring routes remain thin and modular."""

    @staticmethod
    def get_sector_by_id_or_slug(db: Session, identifier: str) -> Sector | None:
        return db.scalars(
            select(Sector).where(or_(Sector.id == identifier, Sector.slug == identifier))
        ).first()

    @staticmethod
    def get_technology_by_id_or_slug(db: Session, identifier: str) -> Technology | None:
        return db.scalars(
            select(Technology).where(
                or_(Technology.id == identifier, Technology.slug == identifier)
            )
        ).first()

    @staticmethod
    def serialize_company(company: Company) -> dict[str, Any]:
        """Serialize company ensuring NULL financials display 'Insufficient publicly verified data.'"""
        if company.funding_amount is not None and company.funding_stage_source_id:
            curr = company.funding_amount_currency or "USD"
            funding_display = f"{curr} {float(company.funding_amount):,.2f} (Verified Source: {company.funding_amount_source_id})"
        else:
            funding_display = "Insufficient publicly verified data."

        return {
            "id": company.id,
            "organization_id": company.organization_id,
            "name": company.name,
            "website": company.website,
            "headquarters_country": company.headquarters_country,
            "founded_year": company.founded_year,
            "description": company.description,
            "sector_id": company.sector_id,
            "funding_stage": company.funding_stage or "Insufficient publicly verified data.",
            "funding_stage_source_id": company.funding_stage_source_id,
            "funding_stage_as_of": (
                company.funding_stage_as_of.isoformat() if company.funding_stage_as_of else None
            ),
            "funding_amount": float(company.funding_amount) if company.funding_amount is not None else None,
            "funding_amount_currency": company.funding_amount_currency,
            "funding_amount_source_id": company.funding_amount_source_id,
            "funding_amount_as_of": (
                company.funding_amount_as_of.isoformat() if company.funding_amount_as_of else None
            ),
            "funding_display": funding_display,
            "verification_status": company.verification_status,
            "technologies_linked": company.technologies_linked,
            "verified_public_evidence": company.verified_public_evidence,
            "commercialization_relevance": company.commercialization_relevance,
            "data_gaps": company.data_gaps,
            "quality_status": company.quality_status,
            "last_verified_at": company.last_verified_at.isoformat(),
        }

    @staticmethod
    def list_repositories_with_growth(
        db: Session,
        sector_id: str | None = None,
        technology_id: str | None = None,
    ) -> list[dict[str, Any]]:
        stmt = select(Repository).order_by(desc(Repository.stars))
        if sector_id:
            stmt = stmt.where(Repository.sector_id == sector_id)
        if technology_id:
            stmt = stmt.where(Repository.technology_id == technology_id)
        repos = db.scalars(stmt).all()

        out: list[dict[str, Any]] = []
        for r in repos:
            snaps = db.scalars(
                select(RepositorySnapshot)
                .where(RepositorySnapshot.repository_id == r.id)
                .order_by(RepositorySnapshot.snapshot_date)
            ).all()
            snap_dicts = [
                {
                    "snapshot_date": s.snapshot_date,
                    "stars": s.stars,
                    "forks": s.forks,
                    "open_issues": s.open_issues,
                    "contributors_count": s.contributors_count,
                    "commits_count": s.commits_count,
                    "release_count": s.release_count,
                }
                for s in snaps
            ]
            growth = compute_repository_snapshot_growth(snap_dicts)
            out.append(
                {
                    "id": r.id,
                    "github_repository_id": r.github_repository_id,
                    "owner": r.owner,
                    "name": r.name,
                    "full_name": r.full_name,
                    "url": r.url,
                    "html_url": r.url,
                    "description": r.description,
                    "primary_language": r.primary_language,
                    "stars": r.stars,
                    "stars_count": r.stars,
                    "forks": r.forks,
                    "forks_count": r.forks,
                    "watchers": r.watchers,
                    "open_issues": r.open_issues,
                    "contributors_count": snaps[-1].contributors_count if snaps else 0,
                    "sector_id": r.sector_id,
                    "technology_id": r.technology_id,
                    "pushed_at": r.pushed_at.isoformat(),
                    "last_fetched_at": r.last_fetched_at.isoformat(),
                    "quality_status": r.quality_status,
                    "growth_metrics": growth,
                    "growth": {
                        "status": growth.get("status", "verified"),
                        "stars_7d_delta": growth.get("star_growth_7d"),
                        "stars_30d_delta": growth.get("star_growth_30d"),
                        "stars_90d_delta": growth.get("star_growth_90d"),
                        "snapshot_count": growth.get("snapshot_count", len(snaps)),
                    },
                    "snapshots": [
                        {
                            "snapshot_date": s.snapshot_date.isoformat(),
                            "stars": s.stars,
                            "forks": s.forks,
                            "contributors_count": s.contributors_count,
                            "commits_count": s.commits_count,
                            "release_count": s.release_count,
                        }
                        for s in snaps
                    ],
                }
            )
        return out

    @staticmethod
    def get_overview_payload(db: Session, sector_id: str | None = None) -> dict[str, Any]:
        sectors = db.scalars(select(Sector).order_by(Sector.priority_tier, Sector.name)).all()
        tech_stmt = select(Technology).order_by(desc(Technology.momentum_score))
        if sector_id and sector_id != "all":
            tech_stmt = tech_stmt.where(Technology.sector_id == sector_id)
        technologies = db.scalars(tech_stmt).all()

        bt_stmt = select(BreakthroughCandidate).order_by(desc(BreakthroughCandidate.score))
        if sector_id and sector_id != "all":
            bt_stmt = bt_stmt.where(BreakthroughCandidate.sector_id == sector_id)
        breakthroughs = db.scalars(bt_stmt).all()

        latest_runs = db.scalars(
            select(IngestionRun).order_by(desc(IngestionRun.started_at)).limit(8)
        ).all()

        sector_map = {s.id: s.name for s in sectors}

        # Build multi-series research trend chart across priority verticals
        years = [2021, 2022, 2023, 2024, 2025, 2026]
        trend_by_year: dict[int, dict[str, Any]] = {y: {"year": y} for y in years}
        for s in sectors:
            for pt in s.historical_trends or []:
                yr = int(pt.get("year", 0))
                if yr in trend_by_year:
                    trend_by_year[yr][s.slug] = int(pt.get("publications", 0))

        return {
            "statistics": {
                "papers_indexed": db.query(Paper).count(),
                "technologies_tracked": db.query(Technology).count(),
                "research_organizations": db.query(Organization).count(),
                "breakthrough_candidates": db.query(BreakthroughCandidate).count(),
                "companies_mapped": db.query(Company).count(),
                "active_theses": db.query(InvestmentThesis).count(),
                "evidence_sources": db.query(EvidenceSource).count(),
                "repositories_tracked": db.query(Repository).count(),
            },
            "latest_refresh_utc": (
                latest_runs[0].completed_at.isoformat()
                if latest_runs and latest_runs[0].completed_at
                else None
            ),
            "emerging_signals": [
                {
                    "id": t.id,
                    "slug": t.slug,
                    "name": t.name,
                    "sector_id": t.sector_id,
                    "sector_name": sector_map.get(t.sector_id, t.sector_id),
                    "maturity_stage": t.maturity_stage,
                    "maturity_score": t.maturity_score,
                    "momentum_score": t.momentum_score,
                    "momentum_coverage": t.momentum_coverage,
                    "recent_change": (
                        f"+{round(((t.annual_publication_history[-1]['count'] - t.annual_publication_history[-2]['count']) / max(t.annual_publication_history[-2]['count'], 1)) * 100, 1)}% YoY pubs"
                        if len(t.annual_publication_history or []) >= 2
                        else "Verified Baseline"
                    ),
                    "quality_status": t.quality_status,
                    "last_verified_at": t.last_verified_at.isoformat(),
                }
                for t in technologies
            ],
            "research_trends": [trend_by_year[y] for y in years],
            "recent_breakthroughs": [
                {
                    "id": b.id,
                    "title": b.title,
                    "technology_id": b.technology_id,
                    "sector_id": b.sector_id,
                    "sector_name": sector_map.get(b.sector_id or "", "Frontier Tech"),
                    "score": b.score,
                    "status": b.status,
                    "metric_name": b.metric_name,
                    "previous_benchmark_value": b.previous_benchmark_value,
                    "new_benchmark_value": b.new_benchmark_value,
                    "benchmark_unit": b.benchmark_unit,
                    "measured_improvement_pct": b.measured_improvement_pct,
                    "first_observed_at": b.first_observed_at.isoformat(),
                    "supporting_evidence_ids": b.supporting_evidence_ids,
                }
                for b in breakthroughs
            ],
            "recent_activity": [
                {
                    "id": r.id,
                    "connector": r.connector,
                    "query": r.query,
                    "status": r.status,
                    "records_fetched": r.records_fetched,
                    "records_inserted": r.records_inserted,
                    "records_deduplicated": r.records_deduplicated,
                    "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                }
                for r in latest_runs
            ],
        }

    @staticmethod
    def list_watchlists(db: Session) -> list[dict[str, Any]]:
        wls = db.scalars(select(Watchlist)).all()
        alerts = db.scalars(select(Alert).order_by(desc(Alert.triggered_at))).all()
        out = []
        for w in wls:
            items = db.scalars(
                select(WatchlistItem).where(WatchlistItem.watchlist_id == w.id)
            ).all()
            out.append(
                {
                    "id": w.id,
                    "name": w.name,
                    "description": w.description,
                    "owner_role": w.owner_role,
                    "created_at": w.created_at.isoformat(),
                    "items": [
                        {
                            "id": i.id,
                            "entity_type": i.entity_type,
                            "entity_id": i.entity_id,
                            "entity_name": i.entity_name,
                            "alert_threshold_note": i.alert_threshold_note,
                            "created_at": i.created_at.isoformat(),
                        }
                        for i in items
                    ],
                    "alerts": [
                        {
                            "id": a.id,
                            "severity": a.severity,
                            "title": a.title,
                            "detail": a.detail,
                            "source_id": a.source_id,
                            "is_read": a.is_read,
                            "triggered_at": a.triggered_at.isoformat(),
                        }
                        for a in alerts
                        if a.watchlist_id == w.id
                    ],
                }
            )
        return out
