# Frontier Atlas — Implementation Plan & Prioritized Checklist

**Platform**: Frontier Atlas  
**Category**: Institutional-Grade Deep-Tech Investment Intelligence Platform  
**Tagline**: *Discover the technological inflection points that create tomorrow's companies.*  
**Cost Constraint**: $0 mandatory software/API expenditure (Open-source stack + public scientific APIs + Google Gemini API free tier).

---

## 1. Executive Summary & Architectural Philosophy

Frontier Atlas helps venture capital analysts, partners, technical researchers, and founders detect frontier technology breakthroughs, evaluate unit economics and commercialization thresholds, map research-to-company ecosystems, and author evidence-grounded, falsifiable investment theses.

Core non-negotiable engineering principles:
1. **Deterministic Computation First**: Momentum scores, breakthrough scores, statistical trend change-points, graph centrality, and unit economics (Robotics, Battery, AI Inference) are computed exclusively by deterministic Python functions (`NumPy`, `SciPy`, `Pandas`, `NetworkX`, `Decimal`) — never delegated to an LLM.
2. **Observable Provenance & Epistemic Honesty**: Every entity, metric, claim, and relationship carries explicit provenance (`source_id`, timestamps, confidence, and `quality_status` in `{Verified, Source-backed, Unverified, Conflicting, Stale, Unavailable}`). Missing corporate financial data stays `NULL` and renders as **"Insufficient publicly verified data."**
3. **Zero-Cost & Graceful Degradation**: Hosted AI uses exclusively the official `google-genai` SDK reading `GEMINI_MODEL` from configuration, validated against a runtime free-tier eligibility allowlist and strict rate/daily/per-run budgets. When `GEMINI_API_KEY` is absent or quota is exhausted, all deterministic discovery, analytics, scoring, graph traversal, economics modeling, and deterministic thesis scaffolding continue operating without failure.

---

## 2. Free-Tier Limitations & Architectural Risks

| Domain / Provider | Free-Tier Limitation | Architectural Risk | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Google Gemini API (`google-genai`)** | Strict RPM (5–15 RPM) and RPD (250–1,500 RPD) limits on free-tier Flash/Flash-Lite models; model availability varies by region/account. | Quota exhaustion mid-research run; hallucinated citation IDs; malformed JSON responses; accidental invocation of billable models. | 1. Runtime allowlist check (`gemini-3.8-flash`, `gemini-2.5-flash`, `gemini-2.0-flash`, etc.) rejecting pro/paid tiers unless explicitly verified free-tier.<br>2. Token-bucket rate limiter + SQLite/Postgres `ai_requests` ledger enforcing `AI_MAX_REQUESTS_PER_DAY` and `AI_MAX_REQUESTS_PER_RUN`.<br>3. SHA-256 prompt+schema response caching.<br>4. Strict Pydantic validation + foreign-key verification of all cited `evidence_source_id`s. |
| **OpenAlex REST API** | Polite pool allows 10 req/sec and 100,000 req/day with `mailto` or `OPENALEX_API_KEY`; anonymous rate is lower. | Unbounded pagination exhausting daily budget; noisy keyword matches polluting sector datasets. | Cursor pagination with explicit `per-page` caps, local HTTP response caching by URL hash, domain/topic filtering, and relevance scoring before ingestion commit. |
| **arXiv Public API** | Terms of Use enforce maximum 1 request every 3 seconds (`>= 3.0s` delay) and forbid bulk automated PDF scraping. | IP temporary ban if concurrent requests fire; storage bloat from PDF downloads. | Single-flight rate limiter (`3.1s` spacing) for arXiv metadata queries (`export.arxiv.org/api/query`); metadata-only default ingestion; user-triggered permission-aware PDF parsing via PyMuPDF. |
| **GitHub REST API** | Unauthenticated: 60 req/hr (Search: 10 req/min). Authenticated (`GITHUB_TOKEN`): 5,000 req/hr (Search: 30 req/min). Does not provide full historical star timelines via simple REST metadata. | Secondary rate limits; temptation to fabricate historical star curves from current star count. | ETag / `If-None-Match` conditional requests; explicit `repository_snapshots` table recording dated observations; growth metrics (`7d`, `30d`, `90d`) calculated **only** when dated snapshots exist (`Insufficient snapshot history` otherwise). |
| **Public Company & Funding Data** | No free API provides comprehensive audited private startup valuations, cap tables, or private revenue. | AI fabrication of valuations or funding rounds. | `companies` schema tracks `funding_stage_source_id` and `funding_amount_source_id`; AI is banned from populating financial columns; unknown values remain `NULL` and display **"Insufficient publicly verified data."** |
| **Local Host Environment (Windows / Docker / Postgres)** | Docker Desktop may not be running on every developer laptop; bare-metal Windows PostgreSQL 18 may lack compiled `pgvector` C binaries. | Startup failure when Docker or `vector.dll` is absent. | Support both `docker compose up --build` (`pgvector/pgvector:pg16`) and native local PostgreSQL 18 (`postgres.exe` with local cluster management), plus transparent `pgvector` availability detection with graceful fallback to native float array / JSONB cosine similarity. |

---

## 3. Build, Test, and Verification Commands

### Backend (`services/api`)
- **Install dependencies**: `uv sync` (or `pip install -e ".[dev]"` inside `services/api`)
- **Run database migrations**: `uv run alembic upgrade head`
- **Seed deterministic fixtures & case studies**: `uv run python -m app.db.seed`
- **Start FastAPI server**: `uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
- **Run backend unit, integration & evaluation tests**: `uv run pytest -v`
- **Run backend lint & type checks**: `uv run ruff check .`

### Frontend (`apps/web`)
- **Install dependencies**: `npm install` (inside `apps/web`)
- **Run TypeScript strict typecheck**: `npm run typecheck` (`tsc --noEmit`)
- **Run production build verification**: `npm run build`
- **Start Next.js dev server**: `npm run dev` (Port 3000)
- **Run Playwright E2E tests**: `npx playwright test`

### Full Stack / Containerized
- **Docker Compose**: `docker compose up --build`

---

## 4. Prioritized Sprint Implementation Checklist

### Sprint 1 — Foundation [COMPLETED]
- [x] Initialize Git repository and monorepo folder hierarchy (`apps/web`, `services/api`, `packages/shared`, `data`, `docs`, `scripts`, `.github/workflows`).
- [x] Create `.env.example`, `.gitignore`, `LICENSE`, `Makefile`, `docker-compose.yml`, and `README.md`.
- [x] Configure local PostgreSQL 18 service & database (`frontier_atlas`) and verify `pgvector` capability probe.
- [x] Initialize `services/api` with FastAPI, Pydantic v2 settings, structured logging, CORS, security middleware, and `/api/v1/health`, `/api/v1/system/status`, `/api/v1/system/connectors`.
- [x] Initialize `apps/web` with Next.js App Router, TypeScript strict mode, Tailwind CSS (`#0B0F14` institutional dark theme + semantic tokens), Lucide icons, TanStack Query, React Flow, and Recharts.
- [x] Verify frontend-backend communication and health check tests.

### Sprint 2 — Database & Core Repositories [COMPLETED]
- [x] Implement SQLAlchemy 2.0 models across all required domain and operational tables (`sectors`, `technologies`, `papers`, `researchers`, `organizations`, `companies`, `repositories`, `repository_snapshots`, `paper_metrics`, `technology_metrics`, `evidence_sources`, `claims`, `claim_evidence`, `entity_relationships`, `breakthrough_candidates`, `investment_theses`, `economic_models`, plus operational tables `ingestion_jobs`, `ingestion_runs`, `ai_requests`, `research_sessions`, `research_messages`, `watchlists`, `watchlist_items`, `alerts`, `entity_aliases`, `prompt_versions`, `scoring_runs`, `evaluation_results`, `audit_events`).
- [x] Create and execute Alembic migrations (`alembic upgrade head`) against PostgreSQL.
- [x] Implement repository and CRUD service layers with strict provenance and data quality statuses (`Verified`, `Source-backed`, `Unverified`, `Conflicting`, `Stale`, `Unavailable`).
- [x] Build deterministic fixture seeder covering all 10 frontier verticals and deep datasets for Robotics, AI Infrastructure, and Energy Storage.
- [x] Write and pass schema constraint, uniqueness, and migration tests.

### Sprint 3 — Real Data Ingestion [COMPLETED]
- [x] Build OpenAlex connector (`services/api/app/integrations/openalex.py`) with work/author/institution/topic search, cursor pagination, response caching, rate-limit budgets, and record normalization.
- [x] Build arXiv connector (`services/api/app/integrations/arxiv.py`) with Atom XML parsing, canonical ID extraction, OpenAlex reconciliation, and 3-second pacing.
- [x] Build GitHub REST API connector (`services/api/app/integrations/github.py`) with ETag support, repo metadata/contributors/releases/commits retrieval, dated `repository_snapshots`, and honest snapshot-only growth calculation.
- [x] Implement ingestion orchestrator (`services/api/app/ingestion/service.py`), APScheduler jobs, checkpointing, partial recovery, and `/api/v1/ingestion/*` endpoints.
- [x] Execute real public ingestion + recorded fixture tests verifying >100 real normalized publications can be ingested, deduplicated, and queried.

### Sprint 4 — Entity Resolution & Technology Intelligence Engine [COMPLETED]
- [x] Build Identifier-First Entity Resolution engine (`services/api/app/intelligence/entity_resolution.py`) for publications (DOI → arXiv → OpenAlex → normalized title+year), researchers (ORCID → OpenAlex ID → human review queue), and organizations/companies (domain → external ID → normalized name + country + type).
- [x] Support `Confirmed match`, `Possible match`, and `Distinct entities` with reversible merge history and alias tracking (`entity_aliases`).
- [x] Implement Technology Momentum Scoring (`Momentum = 0.25P + 0.15C + 0.15I + 0.20O + 0.25B`) with percentile normalization, conditional missing-data handling, coverage reporting, and score suppression when coverage `< 0.50`.
- [x] Implement statistical trend analysis (`SciPy` rolling averages, YoY growth, growth acceleration, Z-score/IQR anomaly detection, CUSUM/piecewise change-point detection) and novelty cluster detection.
- [x] Write unit tests for entity resolution edge cases and momentum/trend math.

### Sprint 5 — Institutional Terminal Shell & Discovery UI [COMPLETED]
- [x] Build global institutional terminal layout (`Sidebar`, `TopNav` with global command search, active sector selector, data freshness badge, ingestion status indicator, demo/live mode indicator).
- [x] Build `Overview` dashboard (`/overview`) with database-driven summary cards, Frontier Technology Landscape scatter/bubble matrix, Emerging Signals ranked table, multi-series Research Trends chart, Recently Verified Breakthroughs, and Activity log.
- [x] Build `Sectors` explorer (`/sectors` & `/sectors/[slug]`) supporting all 10 verticals with deep drilldowns.
- [x] Build `Technologies` explorer (`/technologies` & `/technologies/[slug]`) with momentum breakdown, maturity assessment, historical metrics charts, publications, institutions, companies, and competing approaches.
- [x] Build `Papers` searchable table (`/papers`), `Organizations` (`/organizations`), `Companies` (`/companies`), `Researchers` (`/researchers`), and `Watchlists` (`/watchlists`).

### Sprint 6 — Gemini Research Agent System [COMPLETED]
- [x] Implement `GeminiService` (`services/api/app/agents/gemini_client.py`) using official `google-genai` SDK, reading `GEMINI_MODEL`, enforcing free-tier model allowlist, token/request budgets (`ai_requests`), prompt hashing, local caching, and Pydantic structured validation.
- [x] Implement 5-stage controlled multi-agent workflow (`ResearchPlanner`, `EvidenceRetriever`, `TechnicalAnalyst`, `CommercializationAnalyst`, `InvestmentThesisAnalyst`) with deterministic fallback when `GEMINI_API_KEY` is unconfigured.
- [x] Implement strict claim-to-evidence grounding verifier (rejecting hallucinated `evidence_source_id`s and checking numerical consistency).
- [x] Implement SSE streaming progress (`/api/v1/research/runs/{id}/events`) and build the split-screen `Research Agent` workspace (`/research-agent`).

### Sprint 7 — Breakthrough Detector [COMPLETED]
- [x] Implement 4-stage Breakthrough Detection engine (`services/api/app/scoring/breakthrough.py`): Stage A (Collect evidence), Stage B (Historical baseline & unit/condition comparability check), Stage C (Significance evaluation), Stage D (Candidate generation).
- [x] Implement versioned Breakthrough Score (`0.30 * Technical Improvement + 0.20 * Novelty + 0.20 * Reproducibility + 0.20 * Economic Significance + 0.10 * Evidence Quality`) where reproducibility requires independent replication/open artifacts rather than citations alone.
- [x] Build `/api/v1/breakthroughs` review workflow (`accept`, `reject`, `request_evidence`) and `/breakthroughs` interactive feed with score decomposition and benchmark comparison.

### Sprint 8 — Technology Economics Engine & Lab [COMPLETED]
- [x] Implement deterministic Python economics models (`services/api/app/economics/models.py`):
  - **Robotics Commercialization Model**: annualized CapEx, OpEx, successful tasks/yr, cost per successful task vs. human baseline, break-even utilization, task-success sensitivity.
  - **Battery Lifecycle Cost Model**: cell + pack cost/kWh, cycle life, depth of discharge, round-trip efficiency, discount rate, approximate cost per delivered kWh (explicitly distinguishing from full utility LCOE).
  - **AI Inference Unit Economics Model**: accelerator CapEx, amortization, power + PUE, electricity rate, utilization, token throughput, serving overhead, cost per 1M tokens, utilization break-even.
- [x] Implement Base / Bull / Bear / Custom scenarios, 1-way Tornado sensitivity analysis, and 2-variable sensitivity heatmaps (`/api/v1/economics/*`).
- [x] Build the 3-pane `Economics Lab` UI (`/economics`) with interactive sliders, Tornado charts, 2D heatmaps, break-even curves, and scenario persistence.

### Sprint 9 — Technology Knowledge Graph [COMPLETED]
- [x] Implement PostgreSQL + `NetworkX` knowledge graph engine (`services/api/app/intelligence/graph.py`) supporting all 8 node types and 9 relationship types with degree centrality, betweenness centrality, Louvain/greedy modularity community detection, and bounded ego-graph expansion.
- [x] Build `/api/v1/graph/nodes/{id}` and `/api/v1/graph/expand`.
- [x] Build interactive `Knowledge Graph` workspace (`/knowledge-graph`) using React Flow with pan/zoom, node search, neighbor expansion, community coloring, provisional edge badges, and evidence drawer.

### Sprint 10 — Investment Thesis Studio [COMPLETED]
- [x] Implement 22-section Investment Thesis generator, editor, revision history, and Falsification Engine (requiring $\ge 3$ falsifiable claims with target thresholds, metrics, and evaluation dates).
- [x] Implement Markdown and local PDF export (`/api/v1/theses/{id}/export` using PyMuPDF `fitz` PDF generation).
- [x] Build `Investment Thesis Studio` (`/theses`) with section-by-section editor, claim verification toggles, falsification tracker, revision comparison, and one-click export.

### Sprint 11 — Hardening, Security, Evaluation & Historical Backtesting [COMPLETED]
- [x] Implement SSRF protection, prompt-injection sanitization for untrusted paper abstracts/READMEs, API rate limiting, and write-endpoint authentication token checks.
- [x] Build gold-standard evaluation suite (`services/api/tests/evaluation/test_evaluation_suite.py`) measuring paper relevance, entity resolution precision/recall, claim-to-source verification accuracy, breakthrough classification, and point-in-time historical backtesting without future data leakage.
- [x] Build `Settings` & Diagnostics page (`/settings`) with Gemini model eligibility inspector, budget gauges, connector health checks, fixture import/reset, and database diagnostics.
- [x] Add GitHub Actions CI workflow (`.github/workflows/ci.yml`).

### Sprint 12 — Portfolio Case Studies & Final Verification [COMPLETED]
- [x] Author and seed three complete, source-backed flagship case studies with full literature metrics, repositories, relationships, economic models, breakthrough candidates, and 22-section investment theses:
  - **Case Study A — Robotics**: Vision-Language-Action (VLA) & Dexterous Manipulation for High-Mix Industrial Piece-Picking.
  - **Case Study B — AI Infrastructure**: Speculative Decoding, INT4/FP4 Quantization & Custom Silicon for Sub-\$0.05/1M Token Agentic Inference.
  - **Case Study C — Energy Storage**: Silicon-Dominant Anodes & Solid-State Electrolytes for High-Specific-Energy Aviation and EV Duty Cycles.
- [x] Document methodology (`docs/methodology/`), data sources (`docs/data-sources/`), and evaluation results (`docs/evaluation/`).
- [x] Execute full backend test suite, evaluation suite, frontend typecheck, production build, and live end-to-end verification.
