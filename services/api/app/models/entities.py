"""Complete SQLAlchemy 2.0 relational models for Frontier Atlas (Phase 3)."""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import (
     JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


class QualityStatus(str, enum.Enum):
    VERIFIED = "Verified"
    SOURCE_BACKED = "Source-backed"
    UNVERIFIED = "Unverified"
    CONFLICTING = "Conflicting"
    STALE = "Stale"
    UNAVAILABLE = "Unavailable"


class OrganizationType(str, enum.Enum):
    UNIVERSITY = "University"
    RESEARCH_LAB = "Research Laboratory"
    GOVERNMENT_LAB = "Government Laboratory"
    STARTUP = "Startup"
    ESTABLISHED_COMPANY = "Established Company"
    NONPROFIT = "Nonprofit"
    OTHER = "Other"


class SupportType(str, enum.Enum):
    SUPPORTS = "Supports"
    CONTRADICTS = "Contradicts"
    CONTEXTUAL = "Contextual"
    INSUFFICIENT = "Insufficient"


class ThesisRecommendation(str, enum.Enum):
    INVESTIGATE_FURTHER = "Investigate further"
    MONITOR = "Monitor"
    INSUFFICIENT_EVIDENCE = "Insufficient evidence"
    UNATTRACTIVE = "Unattractive under current assumptions"


# =============================================================================
# 1. SECTORS
# =============================================================================
class Sector(Base):
    __tablename__ = "sectors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    parent_sector_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("sectors.id", ondelete="SET NULL"), nullable=True
    )
    priority_tier: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    subcategories: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    maturity_summary: Mapped[str] = mapped_column(String(120), default="Emerging", nullable=False)
    commercialization_barriers: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    technical_inflection_points: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    investment_opportunities: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    historical_trends: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    data_source: Mapped[str] = mapped_column(String(120), default="frontier_atlas_taxonomy", nullable=False)
    quality_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.VERIFIED.value, nullable=False
    )
    last_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


# =============================================================================
# 2. TECHNOLOGIES
# =============================================================================
class Technology(Base):
    __tablename__ = "technologies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    slug: Mapped[str] = mapped_column(String(140), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    sector_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sectors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    technology_category: Mapped[str] = mapped_column(String(160), nullable=False)
    maturity_stage: Mapped[str] = mapped_column(String(80), nullable=False)
    maturity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    maturity_evidence_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.SOURCE_BACKED.value, nullable=False
    )
    commercialization_readiness: Mapped[str] = mapped_column(String(120), nullable=False)
    momentum_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    momentum_components: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    momentum_coverage: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    scoring_version: Mapped[str] = mapped_column(String(40), default="momentum-v1.0.0", nullable=False)
    competing_technologies: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    commercialization_barriers: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    inflection_points: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    economic_implications: Mapped[str] = mapped_column(Text, default="", nullable=False)
    annual_publication_history: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, default=list, nullable=False
    )
    data_source: Mapped[str] = mapped_column(String(120), default="multi_source_verified", nullable=False)
    quality_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.SOURCE_BACKED.value, nullable=False
    )
    last_assessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


# =============================================================================
# 3. PAPERS
# =============================================================================
class Paper(Base):
    __tablename__ = "papers"
    __table_args__ = (
        Index("ix_papers_doi_unique", "doi", unique=True),
        Index("ix_papers_openalex_id_unique", "openalex_id", unique=True),
        Index("ix_papers_arxiv_id_unique", "arxiv_id", unique=True),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    doi: Mapped[str | None] = mapped_column(String(200), nullable=True)
    openalex_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    arxiv_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    abstract: Mapped[str] = mapped_column(Text, default="", nullable=False)
    publication_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    journal_or_venue: Mapped[str] = mapped_column(String(255), default="Preprint / Conference", nullable=False)
    citations_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    open_access_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    publisher_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    language: Mapped[str] = mapped_column(String(20), default="en", nullable=False)
    source: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    sector_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("sectors.id", ondelete="SET NULL"), nullable=True, index=True
    )
    technology_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("technologies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    authors_list: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    institutions_list: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    topics: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(JSON, nullable=True)
    quality_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.SOURCE_BACKED.value, nullable=False
    )
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


# =============================================================================
# 4. ORGANIZATIONS
# =============================================================================
class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    organization_type: Mapped[str] = mapped_column(
        String(60), default=OrganizationType.UNIVERSITY.value, nullable=False, index=True
    )
    website: Mapped[str | None] = mapped_column(String(300), nullable=True)
    country: Mapped[str] = mapped_column(String(80), default="United States", nullable=False)
    openalex_institution_id: Mapped[str | None] = mapped_column(String(120), unique=True, nullable=True)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    works_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    citation_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    verified_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.SOURCE_BACKED.value, nullable=False
    )
    data_source: Mapped[str] = mapped_column(String(120), default="openalex", nullable=False)
    quality_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.SOURCE_BACKED.value, nullable=False
    )
    last_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


# =============================================================================
# 5. RESEARCHERS
# =============================================================================
class Researcher(Base):
    __tablename__ = "researchers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    full_name: Mapped[str] = mapped_column(String(240), nullable=False, index=True)
    openalex_author_id: Mapped[str | None] = mapped_column(String(120), unique=True, nullable=True)
    orcid: Mapped[str | None] = mapped_column(String(80), unique=True, nullable=True)
    institution_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    institution_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    research_areas: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    works_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    citation_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    h_index_estimate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    data_source: Mapped[str] = mapped_column(String(120), default="openalex", nullable=False)
    quality_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.SOURCE_BACKED.value, nullable=False
    )
    last_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


# =============================================================================
# 6. EVIDENCE SOURCES
# =============================================================================
class EvidenceSource(Base):
    __tablename__ = "evidence_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    source_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    source_name: Mapped[str] = mapped_column(String(160), nullable=False)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)
    external_identifier: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    excerpt_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    license_information: Mapped[str] = mapped_column(String(160), default="Public Academic / Open Metadata", nullable=False)
    access_status: Mapped[str] = mapped_column(String(60), default="open_access", nullable=False)
    quality_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.SOURCE_BACKED.value, nullable=False
    )


# =============================================================================
# 7. COMPANIES
# =============================================================================
class Company(Base):
    """Company entity. Never uses company name as unique key; unknown financials remain NULL."""

    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    website: Mapped[str | None] = mapped_column(String(300), nullable=True)
    headquarters_country: Mapped[str] = mapped_column(String(80), nullable=False)
    founded_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    sector_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sectors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    funding_stage: Mapped[str | None] = mapped_column(String(80), nullable=True)
    funding_stage_source_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("evidence_sources.id", ondelete="SET NULL"), nullable=True
    )
    funding_stage_as_of: Mapped[date | None] = mapped_column(Date, nullable=True)
    funding_amount: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    funding_amount_currency: Mapped[str | None] = mapped_column(String(12), nullable=True)
    funding_amount_source_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("evidence_sources.id", ondelete="SET NULL"), nullable=True
    )
    funding_amount_as_of: Mapped[date | None] = mapped_column(Date, nullable=True)
    verification_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.SOURCE_BACKED.value, nullable=False
    )
    technologies_linked: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    verified_public_evidence: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    commercialization_relevance: Mapped[str] = mapped_column(Text, default="", nullable=False)
    data_gaps: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    data_source: Mapped[str] = mapped_column(String(120), default="public_registry_verified", nullable=False)
    quality_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.SOURCE_BACKED.value, nullable=False
    )
    last_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


# =============================================================================
# 8. REPOSITORIES & REPOSITORY SNAPSHOTS
# =============================================================================
class Repository(Base):
    __tablename__ = "repositories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    github_repository_id: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    owner: Mapped[str] = mapped_column(String(140), nullable=False)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    full_name: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    primary_language: Mapped[str | None] = mapped_column(String(80), nullable=True)
    stars: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    forks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    watchers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    open_issues: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sector_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("sectors.id", ondelete="SET NULL"), nullable=True, index=True
    )
    technology_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("technologies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    organization_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True
    )
    etag: Mapped[str | None] = mapped_column(String(120), nullable=True)
    pushed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    data_source: Mapped[str] = mapped_column(String(80), default="github_rest_api", nullable=False)
    quality_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.VERIFIED.value, nullable=False
    )


class RepositorySnapshot(Base):
    __tablename__ = "repository_snapshots"
    __table_args__ = (
        UniqueConstraint("repository_id", "snapshot_date", name="uq_repo_snapshot_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    repository_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    stars: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    forks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    open_issues: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    contributors_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    commits_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    release_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


# =============================================================================
# 9. PAPER METRICS & TECHNOLOGY METRICS
# =============================================================================
class PaperMetric(Base):
    __tablename__ = "paper_metrics"
    __table_args__ = (
        UniqueConstraint("paper_id", "snapshot_date", "source", name="uq_paper_metric_snapshot"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    paper_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    citations_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    source: Mapped[str] = mapped_column(String(80), nullable=False)


class TechnologyMetric(Base):
    """Technology metric. A metric without units or a source is invalid."""

    __tablename__ = "technology_metrics"
    __table_args__ = (
        CheckConstraint("length(trim(unit)) > 0", name="ck_technology_metrics_unit_non_empty"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    technology_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("technologies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    metric_name: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(60), nullable=False)
    observed_at: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("evidence_sources.id", ondelete="RESTRICT"), nullable=False
    )
    measurement_type: Mapped[str] = mapped_column(String(80), nullable=False)
    method: Mapped[str] = mapped_column(String(200), nullable=False)
    test_conditions: Mapped[str] = mapped_column(String(255), default="Standard benchmark protocol", nullable=False)
    higher_is_better: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    confidence_level: Mapped[float] = mapped_column(Float, default=0.90, nullable=False)
    verification_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.SOURCE_BACKED.value, nullable=False
    )


# =============================================================================
# 10. CLAIMS & CLAIM EVIDENCE
# =============================================================================
class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    subject_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    subject_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    claim_type: Mapped[str] = mapped_column(String(60), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.85, nullable=False)
    verification_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.SOURCE_BACKED.value, nullable=False
    )
    created_by: Mapped[str] = mapped_column(String(120), default="deterministic_verifier", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class ClaimEvidence(Base):
    __tablename__ = "claim_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    claim_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False, index=True
    )
    evidence_source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("evidence_sources.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    evidence_location: Mapped[str] = mapped_column(String(200), default="Abstract / Section 1", nullable=False)
    excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    support_type: Mapped[str] = mapped_column(
        String(40), default=SupportType.SUPPORTS.value, nullable=False
    )
    verification_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.SOURCE_BACKED.value, nullable=False
    )


# =============================================================================
# 11. ENTITY RELATIONSHIPS (KNOWLEDGE GRAPH)
# =============================================================================
class EntityRelationship(Base):
    __tablename__ = "entity_relationships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    source_entity_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    source_entity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    target_entity_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    target_entity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    relationship_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("evidence_sources.id", ondelete="RESTRICT"), nullable=False
    )
    valid_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    valid_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.90, nullable=False)
    review_status: Mapped[str] = mapped_column(
        String(40), default=QualityStatus.SOURCE_BACKED.value, nullable=False
    )
    is_provisional: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    evidence_excerpt: Mapped[str] = mapped_column(Text, default="", nullable=False)


# =============================================================================
# 12. BREAKTHROUGH CANDIDATES
# =============================================================================
class BreakthroughCandidate(Base):
    __tablename__ = "breakthrough_candidates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    technology_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("technologies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sector_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("sectors.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    first_observed_at: Mapped[date] = mapped_column(Date, nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(40), default="Verified Candidate", nullable=False, index=True)
    technical_improvement_score: Mapped[float] = mapped_column(Float, nullable=False)
    novelty_score: Mapped[float] = mapped_column(Float, nullable=False)
    momentum_score: Mapped[float] = mapped_column(Float, nullable=False)
    reproducibility_score: Mapped[float] = mapped_column(Float, nullable=False)
    economic_significance_score: Mapped[float] = mapped_column(Float, nullable=False)
    evidence_quality_score: Mapped[float] = mapped_column(Float, nullable=False)
    metric_name: Mapped[str] = mapped_column(String(160), nullable=False)
    previous_benchmark_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    new_benchmark_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    benchmark_unit: Mapped[str] = mapped_column(String(60), nullable=False)
    measured_improvement_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    conditions_comparable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    independently_replicated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    economic_implications: Mapped[str] = mapped_column(Text, nullable=False)
    limitations: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_verification_steps: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    supporting_evidence_ids: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    contradicting_evidence_ids: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    related_researchers: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    related_organizations: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_version: Mapped[str] = mapped_column(String(60), default="deterministic-v1.0", nullable=False)
    scoring_version: Mapped[str] = mapped_column(String(60), default="breakthrough-v1.0.0", nullable=False)


# =============================================================================
# 13. INVESTMENT THESES
# =============================================================================
class InvestmentThesis(Base):
    __tablename__ = "investment_theses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    sector_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sectors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    technology_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("technologies.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    executive_summary: Mapped[str] = mapped_column(Text, nullable=False)
    market_hypothesis: Mapped[str] = mapped_column(Text, nullable=False)
    why_now: Mapped[str] = mapped_column(Text, nullable=False)
    technical_case: Mapped[str] = mapped_column(Text, nullable=False)
    commercialization_case: Mapped[str] = mapped_column(Text, nullable=False)
    counterarguments: Mapped[str] = mapped_column(Text, nullable=False)
    falsification_conditions: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, default=list, nullable=False
    )
    monitoring_plan: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    recommendation: Mapped[str] = mapped_column(
        String(80), default=ThesisRecommendation.INVESTIGATE_FURTHER.value, nullable=False
    )
    sections_22: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    evidence_ids: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    revision_history: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="Active Draft", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


# =============================================================================
# 14. ECONOMIC MODELS
# =============================================================================
class EconomicModel(Base):
    __tablename__ = "economic_models"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    technology_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("technologies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    model_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    model_version: Mapped[str] = mapped_column(String(40), default="econ-v1.0.0", nullable=False)
    input_schema: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    assumptions: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    output_schema: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    saved_scenarios: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    limitations: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


# =============================================================================
# 15. OPERATIONAL TABLES
# =============================================================================
class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    connector: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    sector_slug: Mapped[str] = mapped_column(String(120), nullable=False)
    query: Mapped[str] = mapped_column(String(300), nullable=False)
    schedule_cron: Mapped[str] = mapped_column(String(60), default="0 */12 * * *", nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_cursor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    job_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("ingestion_jobs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    connector: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    query: Mapped[str] = mapped_column(String(300), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    records_fetched: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    records_inserted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    records_deduplicated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    checkpoint_cursor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AIRequest(Base):
    __tablename__ = "ai_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    session_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    agent_role: Mapped[str] = mapped_column(String(80), nullable=False)
    model_name: Mapped[str] = mapped_column(String(80), nullable=False)
    prompt_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cached_hit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="completed", nullable=False)
    response_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)


class ResearchSession(Base):
    __tablename__ = "research_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    sector_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    technology_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    depth: Mapped[str] = mapped_column(String(40), default="institutional_deep", nullable=False)
    source_restrictions: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    date_range: Mapped[str] = mapped_column(String(60), default="2022-2026", nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="Planning", nullable=False, index=True)
    execution_mode: Mapped[str] = mapped_column(String(60), default="deterministic_verified", nullable=False)
    plan_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    retrieved_evidence_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    claims_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    report_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    progress_events: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ResearchMessage(Base):
    __tablename__ = "research_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(60), nullable=False)
    stage: Mapped[str] = mapped_column(String(60), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class Watchlist(Base):
    __tablename__ = "watchlists"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    owner_role: Mapped[str] = mapped_column(String(80), default="VC Investment Analyst", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    watchlist_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entity_type: Mapped[str] = mapped_column(String(60), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    entity_name: Mapped[str] = mapped_column(String(240), nullable=False)
    alert_threshold_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    watchlist_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("watchlists.id", ondelete="SET NULL"), nullable=True
    )
    severity: Mapped[str] = mapped_column(String(40), default="high", nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    detail: Mapped[str] = mapped_column(Text, nullable=False)
    source_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class EntityAlias(Base):
    __tablename__ = "entity_aliases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    canonical_entity_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    canonical_entity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    merged_from_entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    alias_value: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    alias_type: Mapped[str] = mapped_column(String(60), nullable=False)
    resolution_outcome: Mapped[str] = mapped_column(String(40), default="Confirmed match", nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.95, nullable=False)
    reversible_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    agent_name: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(40), nullable=False)
    template_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    system_instruction: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class ScoringRun(Base):
    __tablename__ = "scoring_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    target_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    target_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    scoring_version: Mapped[str] = mapped_column(String(60), nullable=False)
    composite_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    coverage_ratio: Mapped[float] = mapped_column(Float, nullable=False)
    components_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    suite_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    metric_name: Mapped[str] = mapped_column(String(120), nullable=False)
    score_value: Mapped[float] = mapped_column(Float, nullable=False)
    sample_size: Mapped[int] = mapped_column(Integer, nullable=False)
    failures_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(60), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    actor: Mapped[str] = mapped_column(String(120), default="system", nullable=False)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
