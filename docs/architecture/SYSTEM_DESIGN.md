# Frontier Atlas — Detailed System Design (`docs/architecture/SYSTEM_DESIGN.md`)

## 1. End-to-End Data & Intelligence Flow

1. **Connector Layer (`services/api/app/integrations/`)**:
   - Fetches research works from **OpenAlex** (`openalex.py`), preprints from **arXiv** (`arxiv.py`), and repository telemetry from **GitHub** (`github.py`).
   - All raw responses are archived to `data/snapshots/` for offline reproducibility and rate-limit safety.
2. **Ingestion & Entity Resolution Layer (`services/api/app/ingestion/` & `app/intelligence/entity_resolution.py`)**:
   - Deduplicates publications by exact DOI, arXiv ID, OpenAlex ID, and normalized title + publication year + RapidFuzz similarity ($\ge 92$).
   - Disambiguates authors strictly via ORCID, OpenAlex Author ID, or shared institution + co-author overlap. Homonyms are never merged by name alone.
3. **Analytical & Scoring Layer (`services/api/app/scoring/` & `app/intelligence/`)**:
   - **SciPy Trend Engine (`trends.py`)**: Computes publication growth rate, acceleration, rolling Z-score, CAGR, OLS slope, and two-regime change points.
   - **Momentum Engine (`momentum.py`)**: Deterministic weighted formula $M = 0.25P + 0.15C + 0.15I + 0.20O + 0.25B$ with automatic weight renormalization when optional signals are missing.
   - **Breakthrough Engine (`breakthrough.py`)**: Evaluates empirical benchmark deltas under comparable test conditions.
   - **NetworkX Graph Engine (`graph.py`)**: Computes degree centrality, PageRank, betweenness centrality, and greedy modularity communities.
4. **Techno-Economic Simulator (`services/api/app/economics/models.py`)**:
   - Pure Python unit economics for Robotics, Battery Energy Storage, and AI Inference Serving, including Base/Bull/Bear scenarios, one-way Tornado sensitivity ($\pm 20\%$), and 5×5 two-variable sensitivity heatmaps.
5. **Controlled 5-Stage Research Agent (`services/api/app/agents/workflow.py`)**:
   - Executes `Query Planner` $\rightarrow$ `Evidence Retriever` $\rightarrow$ `Technical Analyst` $\rightarrow$ `Skeptical Verifier` $\rightarrow$ `Report Synthesizer`.
   - Uses the official `google-genai` SDK reading `GEMINI_MODEL` with free-tier allowlist checks, daily request budgeting, and deterministic fallback.
