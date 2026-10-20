export interface Sector {
  id: string;
  slug: string;
  name: string;
  description: string;
  priority_tier: number;
  subcategories: string[];
  maturity_summary: string;
  commercialization_barriers: string[];
  technical_inflection_points: string[];
  investment_opportunities: string[];
  historical_trends: Array<{
    year: number;
    publications: number;
    citations: number;
    [key: string]: number;
  }>;
  quality_status: string;
  last_verified_at: string;
}

export interface Technology {
  id: string;
  slug: string;
  name: string;
  description: string;
  sector_id: string;
  technology_category: string;
  maturity_stage: string;
  maturity_score: number | null;
  maturity_evidence_status: string;
  commercialization_readiness: string;
  momentum_score: number | null;
  momentum_components: {
    publication_acceleration?: number;
    citation_momentum?: number;
    institution_expansion?: number;
    open_source_activity?: number;
    benchmark_progress?: number;
    missing_components?: string[];
  };
  momentum_coverage: number;
  scoring_version: string;
  competing_technologies: string[];
  commercialization_barriers: string[];
  inflection_points: string[];
  economic_implications: string;
  annual_publication_history: Array<{
    year: number;
    count: number;
    citations: number;
  }>;
  quality_status: string;
  last_assessed_at: string;
  last_verified_at: string;
}

export interface TechnologyMetric {
  id: string;
  technology_id: string;
  metric_name: string;
  value: number;
  unit: string;
  observed_at: string;
  source_id: string;
  measurement_type: string;
  method: string;
  test_conditions: string;
  higher_is_better: boolean;
  confidence_level: number;
  verification_status: string;
}

export interface Paper {
  id: string;
  doi: string | null;
  openalex_id: string | null;
  arxiv_id: string | null;
  title: string;
  abstract: string;
  publication_date: string;
  journal_or_venue: string;
  citations_count: number;
  open_access_url: string | null;
  publisher_url: string | null;
  language: string;
  source: string;
  sector_id: string | null;
  technology_id: string | null;
  authors_list: string[];
  institutions_list: string[];
  topics: string[];
  ai_summary: string | null;
  quality_status: string;
  retrieved_at: string;
  last_verified_at: string;
}

export interface Organization {
  id: string;
  name: string;
  normalized_name: string;
  organization_type: string;
  website: string | null;
  country: string;
  openalex_institution_id: string | null;
  description: string;
  works_count: number;
  citation_count: number;
  verified_status: string;
  quality_status: string;
  last_verified_at: string;
}

export interface Researcher {
  id: string;
  full_name: string;
  openalex_author_id: string | null;
  orcid: string | null;
  institution_id: string | null;
  institution_name: string | null;
  research_areas: string[];
  works_count: number;
  citation_count: number;
  h_index_estimate: number | null;
  quality_status: string;
  last_verified_at: string;
}

export interface Company {
  id: string;
  organization_id: string;
  name: string;
  website: string | null;
  headquarters_country: string;
  founded_year: number | null;
  description: string;
  sector_id: string;
  funding_stage: string | null;
  funding_stage_source_id: string | null;
  funding_stage_as_of: string | null;
  funding_amount: number | null;
  funding_amount_currency: string | null;
  funding_amount_source_id: string | null;
  funding_amount_as_of: string | null;
  funding_display: string;
  verification_status: string;
  technologies_linked: string[];
  verified_public_evidence: string[];
  commercialization_relevance: string;
  data_gaps: string[];
  quality_status: string;
  last_verified_at: string;
}

export interface Breakthrough {
  id: string;
  technology_id: string;
  sector_id: string | null;
  title: string;
  description: string;
  detected_at: string;
  first_observed_at: string;
  score: number;
  status: string;
  technical_improvement_score: number;
  novelty_score: number;
  momentum_score: number;
  reproducibility_score: number;
  economic_significance_score: number;
  evidence_quality_score: number;
  metric_name: string;
  previous_benchmark_value: number | null;
  new_benchmark_value: number | null;
  benchmark_unit: string;
  measured_improvement_pct: number | null;
  conditions_comparable: boolean;
  independently_replicated: boolean;
  economic_implications: string;
  limitations: string;
  suggested_verification_steps: string[];
  supporting_evidence_ids: string[];
  contradicting_evidence_ids: string[];
  related_researchers: string[];
  related_organizations: string[];
  review_notes: string | null;
  model_version: string;
  scoring_version: string;
}

export interface FalsificationCondition {
  id: string;
  claim: string;
  assumption: string;
  target_threshold: string;
  evidence: string;
  evaluation_date: string;
  current_status: string;
  related_metric: string;
}

export interface InvestmentThesis {
  id: string;
  title: string;
  sector_id: string;
  technology_id: string;
  executive_summary: string;
  market_hypothesis: string;
  why_now: string;
  technical_case: string;
  commercialization_case: string;
  counterarguments: string;
  falsification_conditions: FalsificationCondition[];
  monitoring_plan: Array<{ indicator: string; cadence: string; source: string }>;
  recommendation: string;
  sections_22: Record<string, string>;
  evidence_ids: string[];
  revision_history: Array<{
    version: number;
    timestamp: string;
    author: string;
    summary: string;
  }>;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface OverviewPayload {
  statistics: {
    papers_indexed: number;
    technologies_tracked: number;
    research_organizations: number;
    breakthrough_candidates: number;
    companies_mapped: number;
    active_theses: number;
    evidence_sources: number;
    repositories_tracked: number;
  };
  latest_refresh_utc: string | null;
  emerging_signals: Array<{
    id: string;
    slug: string;
    name: string;
    sector_id: string;
    sector_name: string;
    maturity_stage: string;
    maturity_score: number | null;
    momentum_score: number | null;
    momentum_coverage: number;
    recent_change: string;
    quality_status: string;
    last_verified_at: string;
  }>;
  research_trends: Array<Record<string, number>>;
  recent_breakthroughs: Array<{
    id: string;
    title: string;
    technology_id: string;
    sector_id: string | null;
    sector_name: string;
    score: number;
    status: string;
    metric_name: string;
    previous_benchmark_value: number | null;
    new_benchmark_value: number | null;
    benchmark_unit: string;
    measured_improvement_pct: number | null;
    first_observed_at: string;
    supporting_evidence_ids: string[];
  }>;
  recent_activity: Array<{
    id: string;
    connector: string;
    query: string;
    status: string;
    records_fetched: number;
    records_inserted: number;
    records_deduplicated: number;
    completed_at: string | null;
  }>;
}
