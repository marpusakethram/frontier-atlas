# Frontier Atlas — Data Sources & Connectors (`docs/data-sources/CONNECTORS.md`)

## 1. OpenAlex Connector (`services/api/app/integrations/openalex.py`)
- **Endpoint**: `https://api.openalex.org/works`
- **Authentication**: Polite pool via `OPENALEX_EMAIL` query parameter (`mailto`) and `User-Agent`.
- **Rate Limits**: Token-bucket throttled; Exponential backoff on `429`/`5xx`.
- **Extracted Fields**: OpenAlex Work ID, DOI, title, inverted-index reconstructed abstract, publication date, venue, citation count, open-access URL, authors (with ORCID & OpenAlex Author ID), institutions (with country & type), and concepts/topics.
- **Snapshots**: Saved to `data/snapshots/openalex_*.json` and seeded via `data/fixtures/corpus_papers.json`.

## 2. arXiv Atom XML Connector (`services/api/app/integrations/arxiv.py`)
- **Endpoint**: `https://export.arxiv.org/api/query`
- **Protocol**: Atom XML parsed via `xml.etree.ElementTree`.
- **Rate Limits**: Respects arXiv's 1 request / 3 seconds policy with local caching.
- **Extracted Fields**: Versioned & base `arxiv_id`, title, summary, published/updated timestamps, authors, primary category (`cs.RO`, `cs.LG`, `cond-mat.mtrl-sci`, etc.), DOI (if linked), and PDF link.

## 3. GitHub REST API v3 Connector (`services/api/app/integrations/github.py`)
- **Endpoint**: `https://api.github.com/repos/{owner}/{repo}`
- **Authentication**: Optional `GITHUB_TOKEN` Bearer header; falls back gracefully to unauthenticated public rate limits or cached snapshots.
- **Historical Growth Rule**: GitHub's repository endpoint returns current point-in-time counters (`stargazers_count`, `forks_count`). Historical growth (`7d`, `30d`, `90d`) is computed **strictly** from dated rows in `repository_snapshots`. When fewer than two dated snapshots exist for a time window, the system returns `"Insufficient snapshot history"` and never fabricates historical curves.
