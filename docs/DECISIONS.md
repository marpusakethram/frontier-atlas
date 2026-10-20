# Frontier Atlas — Architectural Decision Records (ADRs)

## ADR-001: Modular Monolith over Distributed Microservices
- **Status**: Accepted
- **Context**: Frontier Atlas requires academic ingestion (OpenAlex, arXiv), GitHub repository analytics, entity resolution, NetworkX knowledge graph traversal, deterministic economics modeling, and multi-stage Gemini agent orchestration.
- **Decision**: Deploy a single FastAPI modular backend (`services/api`) backed by a single PostgreSQL database (`pgvector`) and a single Next.js App Router frontend (`apps/web`).
- **Consequences**: Zero inter-service network serialization overhead, atomic SQL transactions across ingestion and entity resolution, simple `docker compose up --build` and bare-metal local execution, and zero cloud orchestration cost.

## ADR-002: Dual PostgreSQL Execution & Transparent `pgvector` Adaptation
- **Status**: Accepted
- **Context**: In containerized deployments (`docker-compose.yml`), `pgvector/pgvector:pg16` provides the native `vector` extension. However, developers running bare-metal PostgreSQL 18 on Windows or running fast CI tests may not have the compiled `vector.dll` C extension installed in their host PostgreSQL instance.
- **Decision**: On startup, the database engine queries `pg_available_extensions` for `vector`. When present, it runs `CREATE EXTENSION IF NOT EXISTS vector`. When absent on a local bare-metal Postgres installation, it stores embedding vectors in native JSONB/float arrays and performs deterministic NumPy cosine similarity, exposing the exact capability state (`extension_available` vs. `fallback_float_array`) via `/api/v1/system/status`.
- **Consequences**: 100% compatibility with Docker `pgvector/pgvector:pg16`, bare-metal Windows PostgreSQL 18, and pytest test suites without silent failures.

## ADR-003: Strict Separation of Deterministic Math from LLM Inference
- **Status**: Accepted
- **Context**: LLMs are prone to arithmetic errors, non-reproducible scoring, and hallucinated unit conversions. Institutional venture capital diligence requires auditable, repeatable numbers.
- **Decision**: All numerical outputs—Technology Momentum Scores, Breakthrough Candidate Scores, SciPy statistical change-points, NetworkX graph centrality metrics, and Technology Economics unit-cost/sensitivity models—are implemented exclusively in deterministic Python modules (`app/scoring/`, `app/economics/`, `app/intelligence/`) using `Decimal`, `NumPy`, and `SciPy`. Gemini may interpret pre-calculated numbers but can never overwrite them.
- **Consequences**: Every chart, table, tornado plot, and sensitivity heatmap is 100% reproducible and verified by unit tests.

## ADR-004: Identifier-First Entity Resolution with Non-Destructive Merge Ledgers
- **Status**: Accepted
- **Context**: Academic and open-source records frequently collide on author names (e.g., "J. Wang") or institution variants ("MIT" vs. "Massachusetts Institute of Technology").
- **Decision**: Entity resolution prioritizes canonical identifiers first (`DOI` $\rightarrow$ `arXiv ID` $\rightarrow$ `OpenAlex ID` for papers; `ORCID` $\rightarrow$ `OpenAlex Author ID` for researchers; verified domain $\rightarrow$ `OpenAlex Institution ID` for organizations). Name-only researcher matches are classified as `Possible match` and routed to human review rather than auto-merged. All aliases and merges are recorded in `entity_aliases` and `audit_events` so merges are reversible.
- **Consequences**: High precision in knowledge graph edges and zero silent corruption of researcher profiles.

## ADR-005: Epistemic Honesty for Missing Private Company Financials & Snapshot History
- **Status**: Accepted
- **Context**: Free public APIs do not provide verified private startup revenue, valuations, or historical GitHub star time-series prior to initial tracking.
- **Decision**:
  1. `companies` funding fields default to `NULL` unless backed by an explicit public `evidence_source_id`. The UI renders `NULL` financial metrics as **"Insufficient publicly verified data."**
  2. `repository_snapshots` computes `7d`, `30d`, and `90d` growth strictly from dated snapshot rows. Back-casting historical stars from a single current star count is forbidden.
- **Consequences**: Eliminates fabricated data and builds institutional trust.

## ADR-006: Controlled 5-Stage Research Pipeline with Deterministic Fallback
- **Status**: Accepted
- **Context**: Autonomous multi-agent loops can burn through free-tier API quotas rapidly and hallucinate sources.
- **Decision**: Implement a bounded, linear 5-stage pipeline (`ResearchPlanner` $\rightarrow$ `EvidenceRetriever` $\rightarrow$ `TechnicalAnalyst` $\rightarrow$ `CommercializationAnalyst` $\rightarrow$ `InvestmentThesisAnalyst`) sharing one `GeminiService` instance with hard per-run and daily request budgets. Every generated claim is validated against `evidence_sources` in PostgreSQL. If `GEMINI_API_KEY` is not configured or free-tier quota is exhausted, the pipeline executes a deterministic evidence-synthesis fallback using local database records and economics models.
- **Consequences**: Predictable token usage, zero fabricated citations, and uninterrupted usability in both Demo Mode and Live Mode.
