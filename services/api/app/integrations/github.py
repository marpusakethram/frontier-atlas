"""GitHub REST API Connector with ETag Conditional Retrieval & Snapshot Tracking (Phase 4.3)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import settings


class GitHubConnector:
    """GitHub REST API client supporting ETag conditional requests and snapshot recording."""

    BASE_URL = "https://api.github.com"

    def __init__(self, token: str | None = None) -> None:
        self.token = (token if token is not None else settings.GITHUB_TOKEN).strip()

    def _headers(self, etag: str | None = None) -> dict[str, str]:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": settings.ARXIV_USER_AGENT,
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        if etag:
            headers["If-None-Match"] = etag
        return headers

    def get_repository(self, full_name: str, etag: str | None = None) -> dict[str, Any]:
        """Fetch repository metadata with ETag conditional request support."""
        url = f"{self.BASE_URL}/repos/{full_name.strip('/')}"
        with httpx.Client(timeout=12.0) as client:
            resp = client.get(url, headers=self._headers(etag=etag))
            if resp.status_code == 304:
                return {"not_modified": True, "etag": etag}
            resp.raise_for_status()
            data = resp.json()
            new_etag = resp.headers.get("ETag")
            return self.normalize_repository(data, etag=new_etag)

    def search_repositories(self, query: str, per_page: int = 10) -> list[dict[str, Any]]:
        url = f"{self.BASE_URL}/search/repositories"
        params = {"q": query, "sort": "stars", "order": "desc", "per_page": min(per_page, 30)}
        with httpx.Client(timeout=12.0) as client:
            resp = client.get(url, params=params, headers=self._headers())
            resp.raise_for_status()
            items = resp.json().get("items") or []
            return [self.normalize_repository(item) for item in items]

    @staticmethod
    def normalize_repository(raw: dict[str, Any], etag: str | None = None) -> dict[str, Any]:
        owner_obj = raw.get("owner") or {}
        pushed_str = raw.get("pushed_at") or datetime.now(timezone.utc).isoformat()
        try:
            pushed_at = datetime.fromisoformat(pushed_str.replace("Z", "+00:00"))
        except ValueError:
            pushed_at = datetime.now(timezone.utc)

        return {
            "not_modified": False,
            "github_repository_id": str(raw.get("id") or raw.get("full_name")),
            "owner": owner_obj.get("login") or raw.get("full_name", "unknown/repo").split("/")[0],
            "name": raw.get("name") or raw.get("full_name", "unknown/repo").split("/")[-1],
            "full_name": raw.get("full_name") or "unknown/repo",
            "url": raw.get("html_url") or f"https://github.com/{raw.get('full_name')}",
            "description": raw.get("description") or "",
            "primary_language": raw.get("language") or "Python",
            "stars": int(raw.get("stargazers_count") or 0),
            "forks": int(raw.get("forks_count") or 0),
            "watchers": int(raw.get("subscribers_count") or raw.get("watchers_count") or 0),
            "open_issues": int(raw.get("open_issues_count") or 0),
            "pushed_at": pushed_at,
            "etag": etag,
        }
