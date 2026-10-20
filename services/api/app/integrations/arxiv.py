"""arXiv Atom API Connector & Targeted PyMuPDF Parser (Phase 4.2).

Features:
- Search titles and abstracts
- Retrieve publication dates, authors, categories, and canonical arXiv IDs
- Respect >=3.0s request pacing
- Targeted, permission-aware PDF text extraction via PyMuPDF (fitz) on user demand
"""

from __future__ import annotations

import time
import xml.etree.ElementTree as ET
from datetime import date, datetime, timezone
from typing import Any

import fitz  # PyMuPDF
import httpx

from app.config import settings
from app.intelligence.entity_resolution import normalize_arxiv_id, normalize_doi, normalize_title
from app.security import sanitize_untrusted_research_text, validate_safe_external_url

ATOM_NS = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}


class ArXivConnector:
    """Public arXiv metadata connector with polite request pacing."""

    API_URL = "https://export.arxiv.org/api/query"

    def __init__(self, min_delay_seconds: float | None = None) -> None:
        self.min_delay = min_delay_seconds if min_delay_seconds is not None else settings.ARXIV_MIN_DELAY_SECONDS
        self._last_call_ts: float = 0.0

    def _pace(self) -> None:
        elapsed = time.monotonic() - self._last_call_ts
        if self._last_call_ts > 0 and elapsed < self.min_delay:
            time.sleep(self.min_delay - elapsed)
        self._last_call_ts = time.monotonic()

    def search_papers(
        self,
        query: str,
        *,
        start: int = 0,
        max_results: int = 25,
    ) -> list[dict[str, Any]]:
        """Query arXiv Atom feed and return normalized publication dicts."""
        self._pace()
        params = {
            "search_query": f"all:{query}",
            "start": max(0, start),
            "max_results": min(max(max_results, 1), 100),
            "sortBy": "submittedDate",
            "sortOrder": "descending",
        }
        headers = {"User-Agent": settings.ARXIV_USER_AGENT}
        with httpx.Client(timeout=15.0, headers=headers, follow_redirects=True) as client:
            resp = client.get(self.API_URL, params=params)
            resp.raise_for_status()
            return self.parse_atom_feed(resp.text)

    @staticmethod
    def parse_atom_feed(xml_text: str) -> list[dict[str, Any]]:
        """Parse arXiv Atom XML response into normalized Paper DTOs."""
        root = ET.fromstring(xml_text)
        records: list[dict[str, Any]] = []

        for entry in root.findall("atom:entry", ATOM_NS):
            raw_id = entry.findtext("atom:id", default="", namespaces=ATOM_NS).strip()
            canonical_arxiv = normalize_arxiv_id(raw_id)
            title_raw = entry.findtext("atom:title", default="", namespaces=ATOM_NS)
            title = " ".join(title_raw.split())
            if not title:
                continue

            summary_raw = entry.findtext("atom:summary", default="", namespaces=ATOM_NS)
            abstract = " ".join(summary_raw.split())

            published_str = entry.findtext("atom:published", default="2024-01-01", namespaces=ATOM_NS)
            try:
                pub_date = date.fromisoformat(published_str[:10])
            except ValueError:
                pub_date = date(2024, 1, 1)

            authors = [
                " ".join((a.findtext("atom:name", default="", namespaces=ATOM_NS)).split())
                for a in entry.findall("atom:author", ATOM_NS)
                if a.findtext("atom:name", default="", namespaces=ATOM_NS)
            ]

            categories = [
                c.attrib.get("term", "").lower()
                for c in entry.findall("atom:category", ATOM_NS)
                if c.attrib.get("term")
            ]

            doi_el = entry.findtext("arxiv:doi", default="", namespaces=ATOM_NS)
            doi = normalize_doi(doi_el) or (f"10.48550/arxiv.{canonical_arxiv}" if canonical_arxiv else None)

            pdf_url = f"https://arxiv.org/pdf/{canonical_arxiv}" if canonical_arxiv else None
            abs_url = f"https://arxiv.org/abs/{canonical_arxiv}" if canonical_arxiv else raw_id

            records.append(
                {
                    "openalex_id": None,
                    "doi": doi,
                    "arxiv_id": canonical_arxiv,
                    "title": title,
                    "normalized_title": normalize_title(title),
                    "abstract": abstract,
                    "publication_date": pub_date,
                    "journal_or_venue": "arXiv Preprint",
                    "citations_count": 0,
                    "open_access_url": pdf_url,
                    "publisher_url": abs_url,
                    "language": "en",
                    "source": "arxiv",
                    "authors_list": authors[:12],
                    "institutions_list": [],
                    "topics": categories[:6],
                    "retrieved_at": datetime.now(timezone.utc),
                }
            )
        return records

    @staticmethod
    def extract_pdf_text_bytes(pdf_bytes: bytes, max_pages: int = 8) -> dict[str, Any]:
        """Targeted, bounded PyMuPDF text extraction for user-requested open-access PDFs."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(doc)
        extracted_pages: list[str] = []
        for idx in range(min(page_count, max_pages)):
            page_text = doc.load_page(idx).get_text("text")
            extracted_pages.append(sanitize_untrusted_research_text(page_text, max_length=4000))
        doc.close()
        return {
            "page_count": page_count,
            "pages_parsed": len(extracted_pages),
            "sanitized_text": "\n\n".join(extracted_pages),
        }

    def fetch_and_parse_open_access_pdf(self, pdf_url: str, max_pages: int = 6) -> dict[str, Any]:
        safe_url = validate_safe_external_url(pdf_url)
        self._pace()
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            resp = client.get(safe_url, headers={"User-Agent": settings.ARXIV_USER_AGENT})
            resp.raise_for_status()
            return self.extract_pdf_text_bytes(resp.content, max_pages=max_pages)
