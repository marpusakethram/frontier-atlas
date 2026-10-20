# Frontier Atlas

**Turn research papers and open-source activity into technology maps, economics scenarios, and investment theses.**

Frontier Atlas is an MIT-licensed research and investment intelligence prototype built for venture capital analysts, partners, technical researchers, and founders. It combines real scientific ingestion (OpenAlex, arXiv, GitHub), deterministic technology momentum & breakthrough scoring, first-principles unit economics modeling (Robotics, Battery Storage, AI Inference), a NetworkX-backed Knowledge Graph, and a controlled 5-stage Google Gemini research agent pipeline.

![Frontier Atlas architecture](docs/assets/architecture.png)

---

## Start here

- **Explore the design:** [Architecture](docs/architecture/SYSTEM_DESIGN.md) and [methodology](docs/methodology/SCORING_AND_ECONOMICS.md).
- **Run it locally:** follow the quickstart below. The web UI is on port 3000 and API documentation on port 8000.
- **What can I use it for?** Compare a robotics deployment scenario, inspect research behind a technology, or draft a thesis with evidence and conditions that would disprove it.
- **Contribute:** see [CONTRIBUTING.md](CONTRIBUTING.md). Small documentation fixes and connector fixtures are welcome.

### Data and model limits

The application includes seeded examples and calculated scenarios. Scores, case-study metrics, benchmark summaries and economic outputs are not independent proof of clinical effectiveness, commercial traction or investment returns. Verify each source, unit, date and assumption before relying on an output. A citation is a reference to inspect, not a guarantee that the claim is supported.

The repository includes connectors for live public sources; running the UI alone does not guarantee fresh data. Optional Gemini access needs your own key and an available model. Check provider access and pricing before enabling requests.

## Core Capabilities

1. **10 Frontier Technology Verticals** (Deep coverage on Robotics & Autonomous Systems, AI Infrastructure, and Energy Storage & Battery Technologies; full vertical support across Semiconductors, Biotechnology, Aerospace, Climate/Industrial, Advanced Materials, Quantum Computing, and Nuclear/Fusion).
2. **Real Public Research & Open-Source Ingestion**:
   - **OpenAlex REST Connector**: Publications, citations, authors, institutions, and topic taxonomy with cursor pagination and polite-pool rate limiting.
   - **arXiv Atom Connector**: Preprint metadata, categories, canonical IDs, and OpenAlex reconciliation with 3-second request pacing.
   - **GitHub REST Connector**: Repository metadata, contributors, releases, and dated `repository_snapshots` with ETag conditional fetching.
3. **Identifier-First Entity Resolution**: Reconciles papers (DOI $\rightarrow$ arXiv $\rightarrow$ OpenAlex $\rightarrow$ normalized title), researchers (ORCID $\rightarrow$ OpenAlex Author ID), and organizations/companies with reversible merge history.
4. **Deterministic Technology Intelligence & Breakthrough Detector**:
   - Explainable **Momentum Score** ($0.25P + 0.15C + 0.15I + 0.20O + 0.25B$) with missing-data coverage thresholds and SciPy change-point / anomaly detection.
   - 4-Stage **Breakthrough Detector** verifying unit and test-condition comparability against historical baselines before computing percentage improvements.
5. **Technology Economics Lab**:
   - Deterministic Python models for **Robotics**, **Battery Lifecycle Cost**, and **AI Inference Unit Economics** with Base/Bull/Bear/Custom scenarios, 1-way Tornado sensitivity charts, 2D sensitivity heatmaps, and break-even curves.
6. **Controlled 5-Stage Gemini Research Agent**:
   - Uses only the official `google-genai` SDK reading `GEMINI_MODEL` from environment variables, validated against a free-tier eligibility allowlist with strict daily/per-run budgets and deterministic fallback when offline.
7. **22-Section Investment Thesis Studio & Falsification Engine**:
   - Every thesis tracks $\ge 3$ quantitative falsification conditions, verified source citations, revision history, and local Markdown/PDF export via PyMuPDF.

---

## Quickstart

### Option A: Docker Compose
```bash
git clone https://github.com/marpusakethram/frontier-atlas.git
cd frontier-atlas
cp .env.example .env
docker compose up --build
```

The API container runs migrations and seeds the example dataset automatically on startup.

Use the example credentials only for local development. Review networking, authentication and database configuration before exposing a deployment publicly.

### Option B: Local Bare-Metal Development (PostgreSQL + uv + Node.js)
```bash
cp .env.example .env

# 1. Backend setup, migrations & fixture/case-study seeding
cd services/api
uv sync --all-extras
uv run alembic upgrade head
uv run python -m app.db.seed
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 2. Frontend setup & dev server
cd ../../apps/web
npm install
npm run dev
```

Open `http://localhost:3000` for the Frontier Atlas terminal and `http://localhost:8000/docs` for the OpenAPI specification.


## Development checks

```bash
cd services/api
uv sync --all-extras
uv run pytest
```

In a separate terminal, run `npm ci` and `npm run typecheck` from `apps/web`. Test results depend on the configured database and optional services; do not interpret repository documentation as a current CI pass.

## Feedback

Open an issue with a reproducible connector problem, a scoring assumption to challenge, or a concrete workflow you would like to use. Include public or synthetic examples only.
