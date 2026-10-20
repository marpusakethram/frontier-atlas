"""OpenAlex REST API Connector (Phase 4.1).

Implements:
1. Search publications
2. Retrieve works by identifier
3. Retrieve authors
4. Retrieve institutions
5. Retrieve topics
6. Retrieve citation metadata
7. Filter by publication date
8. Filter by research domain
9. Cursor pagination
10. Record normalization (including abstract_inverted_index reconstruction)
"""

from __future__ import annotations

import hashlib
import json
import time
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from app.config import DATA_DIR, settings
from app.core import get_logger
from app.intelligence.entity_resolution import (
    normalize_arxiv_id,
    normalize_doi,
    normalize_openalex_id,
    normalize_title,
)

logger = get_logger(__name__)

CACHE_DIR: Path = DATA_DIR / "cache" / "openalex"


def reconstruct_abstract(inverted_index: dict[str, list[int]] | None) -> str:
    """Reconstruct plain-text abstract from OpenAlex abstract_inverted_index."""
    if not inverted_index or not isinstance(inverted_index, dict):
        return ""
    position_map: dict[int, str] = {}
    for word, positions in inverted_index.items():
        if isinstance(positions, list):
            for pos in positions:
                if isinstance(pos, int) and 0 <= pos <= 10000:
                    position_map[pos] = word
    if not position_map:
        return ""
    max_pos = max(position_map.keys())
    tokens = [position_map.get(i, "") for i in range(max_pos + 1)]
    return " ".join(t for t in tokens if t).strip()


class OpenAlexConnector:
    """Rate-limited, cached OpenAlex API client."""

    BASE_URL = "https://api.openalex.org"

    def __init__(self, api_key: str | None = None, max_rps: float | None = None) -> None:
        self.api_key = (api_key if api_key is not None else settings.OPENALEX_API_KEY).strip()
        self.max_rps = max_rps or settings.OPENALEX_MAX_RPS
        self._last_request_ts: float = 0.0
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

    def _throttle(self) -> None:
        min_interval = 1.0 / max(self.max_rps, 0.5)
        elapsed = time.monotonic() - self._last_request_ts
        if elapsed < min_interval:
            time.sleep(min_interval - elapsed)
        self._last_request_ts = time.monotonic()

    def _headers(self) -> dict[str, str]:
        headers = {"User-Agent": settings.ARXIV_USER_AGENT, "Accept": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _cache_path(self, key_str: str) -> Path:
        digest = hashlib.sha256(key_str.encode("utf-8")).hexdigest()
        return CACHE_DIR / f"{digest}.json"

    def _get_json(self, endpoint: str, params: dict[str, Any], use_cache: bool = True) -> dict[str, Any]:
        req_params = dict(params)
        if self.api_key:
            req_params["api_key"] = self.api_key
        else:
            req_params.setdefault("mailto", "research@frontier-atlas.org")

        cache_key = f"{endpoint}?{json.dumps(params, sort_keys=True)}"
        cpath = self._cache_path(cache_key)
        if use_cache and cpath.exists():
            try:
                return json.loads(cpath.read_text(encoding="utf-8"))
            except Exception:
                pass

        self._throttle()
        url = f"{self.BASE_URL}{endpoint}"
        with httpx.Client(timeout=12.0, headers=self._headers()) as client:
            resp = client.get(url, params=req_params)
            resp.raise_for_status()
            payload = resp.json()

        try:
            cpath.write_text(json.dumps(payload), encoding="utf-8")
        except Exception:
            pass
        return payload

    def search_publications(
        self,
        query: str,
        *,
        from_publication_date: str | None = "2021-01-01",
        to_publication_date: str | None = None,
        domain_id: str | None = None,
        per_page: int = 25,
        cursor: str = "*",
        use_cache: bool = True,
    ) -> dict[str, Any]:
        """Search OpenAlex works with documented filter fields and cursor pagination."""
        filters: list[str] = []
        if from_publication_date:
            filters.append(f"from_publication_date:{from_publication_date}")
        if to_publication_date:
            filters.append(f"to_publication_date:{to_publication_date}")
        if domain_id:
            filters.append(f"primary_topic.domain.id:{domain_id}")

        params: dict[str, Any] = {
            "search": query,
            "per-page": min(max(per_page, 1), 100),
            "cursor": cursor,
        }
        if filters:
            params["filter"] = ",".join(filters)

        raw = self._get_json("/works", params, use_cache=use_cache)
        results = raw.get("results") or []
        meta = raw.get("meta") or {}
        normalized = [self.normalize_work(w) for w in results if w.get("title")]
        return {
            "results": normalized,
            "next_cursor": meta.get("next_cursor"),
            "count": meta.get("count", len(normalized)),
        }

    def get_work_by_id(self, work_id: str) -> dict[str, Any]:
        clean_id = work_id.split("/")[-1]
        raw = self._get_json(f"/works/{clean_id}", {})
        return self.normalize_work(raw)

    def search_authors(self, query: str, per_page: int = 15) -> list[dict[str, Any]]:
        raw = self._get_json("/authors", {"search": query, "per-page": per_page})
        out: list[dict[str, Any]] = []
        for a in raw.get("results") or []:
            affs = a.get("affiliations") or []
            inst_name = affs[0].get("institution", {}).get("display_name") if affs else None
            out.append(
                {
                    "openalex_author_id": normalize_openalex_id(a.get("id")),
                    "full_name": a.get("display_name", "Unknown Researcher"),
                    "orcid": a.get("orcid"),
                    "works_count": int(a.get("works_count") or 0),
                    "citation_count": int(a.get("cited_by_count") or 0),
                    "institution_name": inst_name,
                }
            )
        return out

    def search_institutions(self, query: str, per_page: int = 15) -> list[dict[str, Any]]:
        raw = self._get_json("/institutions", {"search": query, "per-page": per_page})
        out: list[dict[str, Any]] = []
        for inst in raw.get("results") or []:
            out.append(
                {
                    "openalex_institution_id": normalize_openalex_id(inst.get("id")),
                    "name": inst.get("display_name", "Unknown Institution"),
                    "country": inst.get("country_code") or "United States",
                    "organization_type": inst.get("type", "University").title(),
                    "website": inst.get("homepage_url"),
                    "works_count": int(inst.get("works_count") or 0),
                    "citation_count": int(inst.get("cited_by_count") or 0),
                }
            )
        return out

    def search_topics(self, query: str, per_page: int = 15) -> list[dict[str, Any]]:
        raw = self._get_json("/topics", {"search": query, "per-page": per_page})
        return [
            {
                "id": t.get("id"),
                "display_name": t.get("display_name"),
                "domain": (t.get("domain") or {}).get("display_name"),
                "field": (t.get("field") or {}).get("display_name"),
                "works_count": int(t.get("works_count") or 0),
            }
            for t in (raw.get("results") or [])
        ]

    @staticmethod
    def normalize_work(raw: dict[str, Any]) -> dict[str, Any]:
        """Normalize raw OpenAlex work payload into Frontier Atlas Paper DTO."""
        title = (raw.get("title") or raw.get("display_name") or "Untitled Publication").strip()
        ids = raw.get("ids") or {}
        doi = normalize_doi(raw.get("doi") or ids.get("doi"))
        oa_id = normalize_openalex_id(raw.get("id") or ids.get("openalex"))

        arxiv_id: str | None = None
        if doi and "arxiv." in doi:
            arxiv_id = normalize_arxiv_id(doi.split("arxiv.")[-1])

        pub_date_str = raw.get("publication_date") or "2024-01-01"
        try:
            pub_date = date.fromisoformat(pub_date_str[:10])
        except ValueError:
            pub_date = date(2024, 1, 1)

        abstract = raw.get("abstract") or reconstruct_abstract(raw.get("abstract_inverted_index"))
        primary_loc = raw.get("primary_location") or {}
        source_info = primary_loc.get("source") or {}
        venue = source_info.get("display_name") or "Academic Venue / Preprint"

        authors: list[str] = []
        institutions: list[str] = []
        for auth in raw.get("authorships") or []:
            author_obj = auth.get("author") or {}
            if author_obj.get("display_name"):
                authors.append(author_obj["display_name"])
            for inst in auth.get("institutions") or []:
                if inst.get("display_name") and inst["display_name"] not in institutions:
                    institutions.append(inst["display_name"])

        topics = [
            t.get("display_name", "").lower()
            for t in (raw.get("topics") or raw.get("concepts") or [])[:6]
            if t.get("display_name")
        ]

        oa_info = raw.get("open_access") or {}
        oa_url = oa_info.get("oa_url") or primary_loc.get("pdf_url")
        pub_url = primary_loc.get("landing_page_url") or (f"https://doi.org/{doi}" if doi else oa_url)

        return {
            "openalex_id": oa_id,
            "doi": doi,
            "arxiv_id": arxiv_id,
            "title": title,
            "normalized_title": normalize_title(title),
            "abstract": abstract,
            "publication_date": pub_date,
            "journal_or_venue": venue,
            "citations_count": int(raw.get("cited_by_count") or 0),
            "open_access_url": oa_url,
            "publisher_url": pub_url,
            "language": raw.get("language") or "en",
            "source": "openalex",
            "authors_list": authors[:12],
            "institutions_list": institutions[:8],
            "topics": topics,
            "retrieved_at": datetime.now(timezone.utc),
        }
