"""Pydantic v2 request and response schemas for Frontier Atlas REST API (Phase 13)."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ORMBaseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# SYSTEM & HEALTH
# =============================================================================
class HealthResponse(BaseModel):
    status: str
    service: str = "frontier-atlas-api"
    version: str = "1.0.0"
    database_mode: str
    pgvector: dict[str, Any]
    gemini_eligible: bool
    gemini_model: str
    timestamp_utc: datetime


class ConnectorStatusItem(BaseModel):
    connector: str
    configured: bool
    auth_mode: str
    rate_limit_policy: str
    status: str
    last_run_at: datetime | None = None
    notes: str


# =============================================================================
# SECTORS & TECHNOLOGIES
# =============================================================================
class SectorSummary(ORMBaseModel):
    id: str
    slug: str
    name: str
    description: str
    priority_tier: int
    subcategories: list[str]
    maturity_summary: str
    commercialization_barriers: list[str]
    technical_inflection_points: list[str]
    investment_opportunities: list[str]
    historical_trends: list[dict[str, Any]]
    quality_status: str
    last_verified_at: datetime


class TechnologySummary(ORMBaseModel):
    id: str
    slug: str
    name: str
    description: str
    sector_id: str
    technology_category: str
    maturity_stage: str
    maturity_score: float | None
    maturity_evidence_status: str
    commercialization_readiness: str
    momentum_score: float | None
    momentum_components: dict[str, Any]
    momentum_coverage: float
    scoring_version: str
    competing_technologies: list[str]
    commercialization_barriers: list[str]
    inflection_points: list[str]
    economic_implications: str
    annual_publication_history: list[dict[str, Any]]
    quality_status: str
    last_assessed_at: datetime
    last_verified_at: datetime


class TechnologyMetricSchema(ORMBaseModel):
    id: str
    technology_id: str
    metric_name: str
    value: float
    unit: str
    observed_at: date
    source_id: str
    measurement_type: str
    method: str
    test_conditions: str
    higher_is_better: bool
    confidence_level: float
    verification_status: str

    @field_validator("unit")
    @classmethod
    def validate_non_empty_unit(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("A technology metric without explicit units is invalid.")
        return v.strip()


# =============================================================================
# PAPERS, RESEARCHERS, ORGANIZATIONS, COMPANIES
# =============================================================================
class PaperSchema(ORMBaseModel):
    id: str
    doi: str | None
    openalex_id: str | None
    arxiv_id: str | None
    title: str
    abstract: str
    publication_date: date
    journal_or_venue: str
    citations_count: int
    open_access_url: str | None
    publisher_url: str | None
    language: str
    source: str
    sector_id: str | None
    technology_id: str | None
    authors_list: list[str]
    institutions_list: list[str]
    topics: list[str]
    ai_summary: str | None
    quality_status: str
    retrieved_at: datetime
    last_verified_at: datetime


class ResearcherSchema(ORMBaseModel):
    id: str
    full_name: str
    openalex_author_id: str | None
    orcid: str | None
    institution_id: str | None
    institution_name: str | None
    research_areas: list[str]
    works_count: int
    citation_count: int
    h_index_estimate: int | None
    quality_status: str
    last_verified_at: datetime


class OrganizationSchema(ORMBaseModel):
    id: str
    name: str
    normalized_name: str
    organization_type: str
    website: str | None
    country: str
    openalex_institution_id: str | None
    description: str
    works_count: int
    citation_count: int
    verified_status: str
    quality_status: str
    last_verified_at: datetime


class CompanySchema(ORMBaseModel):
    id: str
    organization_id: str
    name: str
    website: str | None
    headquarters_country: str
    founded_year: int | None
    description: str
    sector_id: str
    funding_stage: str | None
    funding_stage_source_id: str | None
    funding_stage_as_of: date | None
    funding_amount: float | None
    funding_amount_currency: str | None
    funding_amount_source_id: str | None
    funding_amount_as_of: date | None
    funding_display: str = "Insufficient publicly verified data."
    verification_status: str
    technologies_linked: list[str]
    verified_public_evidence: list[str]
    commercialization_relevance: str
    data_gaps: list[str]
    quality_status: str
    last_verified_at: datetime


# =============================================================================
# BREAKTHROUGHS
# =============================================================================
class BreakthroughSchema(ORMBaseModel):
    id: str
    technology_id: str
    sector_id: str | None
    title: str
    description: str
    detected_at: datetime
    first_observed_at: date
    score: float
    status: str
    technical_improvement_score: float
    novelty_score: float
    momentum_score: float
    reproducibility_score: float
    economic_significance_score: float
    evidence_quality_score: float
    metric_name: str
    previous_benchmark_value: float | None
    new_benchmark_value: float | None
    benchmark_unit: str
    measured_improvement_pct: float | None
    conditions_comparable: bool
    independently_replicated: bool
    economic_implications: str
    limitations: str
    suggested_verification_steps: list[str]
    supporting_evidence_ids: list[str]
    contradicting_evidence_ids: list[str]
    related_researchers: list[str]
    related_organizations: list[str]
    review_notes: str | None
    model_version: str
    scoring_version: str


class BreakthroughReviewRequest(BaseModel):
    action: str = Field(..., pattern="^(accept|reject|request_evidence)$")
    reviewer: str = Field(default="IC Diligence Reviewer")
    notes: str = Field(default="")


# =============================================================================
# ECONOMICS LAB
# =============================================================================
class EconomicsCalculateRequest(BaseModel):
    model_type: str = Field(..., pattern="^(robotics|battery|ai_inference)$")
    assumptions: dict[str, float]


class EconomicsSensitivityRequest(BaseModel):
    model_type: str = Field(..., pattern="^(robotics|battery|ai_inference)$")
    assumptions: dict[str, float]
    variation_pct: float = Field(default=0.20, ge=0.05, le=0.50)
    x_param: str | None = None
    y_param: str | None = None


class ScenarioSaveRequest(BaseModel):
    model_id: str
    name: str = Field(..., min_length=2, max_length=120)
    scenario_type: str = Field(default="custom")
    assumptions: dict[str, float]


# =============================================================================
# RESEARCH AGENT
# =============================================================================
class ResearchRunCreateRequest(BaseModel):
    question: str = Field(..., min_length=8, max_length=1500)
    sector_id: str | None = None
    technology_id: str | None = None
    depth: str = Field(default="institutional_deep")
    date_range: str = Field(default="2022-2026")
    source_restrictions: list[str] = Field(default_factory=lambda: ["openalex", "arxiv", "github", "sec"])


# =============================================================================
# INVESTMENT THESES
# =============================================================================
class FalsificationConditionItem(BaseModel):
    id: str
    claim: str
    assumption: str
    target_threshold: str
    evidence: str
    evaluation_date: str
    current_status: str
    related_metric: str


class ThesisCreateRequest(BaseModel):
    title: str = Field(..., min_length=5, max_length=300)
    sector_id: str
    technology_id: str
    executive_summary: str | None = None
    market_hypothesis: str | None = None
    recommendation: str = Field(default="Investigate further")


class ThesisUpdateRequest(BaseModel):
    title: str | None = None
    executive_summary: str | None = None
    market_hypothesis: str | None = None
    why_now: str | None = None
    technical_case: str | None = None
    commercialization_case: str | None = None
    counterarguments: str | None = None
    recommendation: str | None = None
    status: str | None = None
    sections_22: dict[str, Any] | None = None
    falsification_conditions: list[FalsificationConditionItem] | None = None
    revision_note: str = Field(default="Manual analyst update")


class ThesisExportRequest(BaseModel):
    format: str = Field(default="markdown", pattern="^(markdown|pdf)$")


# =============================================================================
# INGESTION
# =============================================================================
class IngestionRunTriggerRequest(BaseModel):
    connector: str = Field(default="all", pattern="^(all|openalex|arxiv|github|fixtures)$")
    sector_slug: str = Field(default="all")
    query: str | None = None
    max_results: int = Field(default=35, ge=5, le=200)
