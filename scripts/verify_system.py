"""End-to-end verification script for Frontier Atlas backend and database."""

from __future__ import annotations

import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1] / "services" / "api"
sys.path.insert(0, str(API_DIR))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402


def main() -> int:
    with TestClient(app) as client:
        health = client.get("/api/v1/health").json()
        overview = client.get("/api/v1/overview").json()
        sectors = client.get("/api/v1/sectors").json()
        theses = client.get("/api/v1/theses").json()
        print("Health:", health["status"])
        print("Statistics:", overview["statistics"])
        print("Sectors Count:", len(sectors))
        print("Flagship Theses Count:", len(theses))
        assert health["status"] == "ok"
        assert overview["statistics"]["papers_indexed"] >= 100
        assert len(sectors) >= 13
        assert len(theses) >= 6
    print("ALL FRONTIER ATLAS VERIFICATION CHECKS PASSED.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
