"""Integration tests covering connectors, database constraints, >100 paper ingestion, and all API routes."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.integrations.arxiv import ArXivConnector
from app.integrations.github import GitHubConnector
from app.integrations.openalex import OpenAlexConnector
from app.main import app


def test_connectors_normalization_with_recorded_payloads() -> None:
    # 1. OpenAlex normalization test
    oa_raw = {
        "id": "https://openalex.org/W4386642910",
        "doi": "https://doi.org/10.1145/3600006.3613165",
        "title": "Efficient Memory Management for Large Language Model Serving with PagedAttention",
        "publication_date": "2023-09-12",
        "cited_by_count": 2410,
        "abstract_inverted_index": {"PagedAttention": [0], "improves": [1], "LLM": [2], "serving": [3]},
        "primary_location": {"source": {"display_name": "ACM SOSP"}},
        "authorships": [
            {
                "author": {"display_name": "Woosuk Kwon"},
                "institutions": [{"display_name": "UC Berkeley"}],
            }
        ],
        "topics": [{"display_name": "Inference Optimization"}],
    }
    norm_oa = OpenAlexConnector.normalize_work(oa_raw)
    assert norm_oa["doi"] == "10.1145/3600006.3613165"
    assert norm_oa["abstract"] == "PagedAttention improves LLM serving"
    assert norm_oa["citations_count"] == 2410

    # 2. arXiv Atom XML feed parsing test
    sample_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
      <entry>
        <id>http://arxiv.org/abs/2406.09246v1</id>
        <published>2024-06-13T17:59:00Z</published>
        <title>OpenVLA: An Open-Source Vision-Language-Action Model</title>
        <summary>A 7B-parameter open-source VLA trained on 970k robot episodes.</summary>
        <author><name>Moo Jin Kim</name></author>
        <category term="cs.RO"/>
      </entry>
    </feed>"""
    parsed_arxiv = ArXivConnector.parse_atom_feed(sample_xml)
    assert len(parsed_arxiv) == 1
    assert parsed_arxiv[0]["arxiv_id"] == "2406.09246"
    assert parsed_arxiv[0]["authors_list"] == ["Moo Jin Kim"]

    # 3. GitHub normalization test
    gh_raw = {
        "id": 636129481,
        "name": "vllm",
        "full_name": "vllm-project/vllm",
        "owner": {"login": "vllm-project"},
        "html_url": "https://github.com/vllm-project/vllm",
        "description": "High-throughput LLM serving engine",
        "language": "Python",
        "stargazers_count": 46850,
        "forks_count": 7420,
        "subscribers_count": 480,
        "open_issues_count": 1120,
        "pushed_at": "2026-10-15T12:00:00Z",
    }
    norm_gh = GitHubConnector.normalize_repository(gh_raw, etag='W/"etag-123"')
    assert norm_gh["full_name"] == "vllm-project/vllm"
    assert norm_gh["stars"] == 46850
    assert norm_gh["etag"] == 'W/"etag-123"'


def test_full_api_contract_and_100_plus_publications_ingestion() -> None:
    with TestClient(app) as client:
        # 1. System & Health
        health = client.get("/api/v1/health")
        assert health.status_code == 200
        assert health.json()["status"] == "ok"
        assert health.json()["gemini_eligible"] is True

        sys_status = client.get("/api/v1/system/status")
        assert sys_status.status_code == 200
        assert sys_status.json()["table_counts"]["sectors"] >= 10
        assert sys_status.json()["table_counts"]["papers"] >= 100

        connectors = client.get("/api/v1/system/connectors")
        assert connectors.status_code == 200
        assert len(connectors.json()) == 4

        # 2. Trigger Ingestion Run & Verify Idempotent Deduplication (>100 papers)
        ing_run = client.post(
            "/api/v1/ingestion/run",
            json={"connector": "fixtures", "sector_slug": "all", "max_results": 120},
        )
        assert ing_run.status_code == 200
        run_data = ing_run.json()
        assert run_data["total_papers_in_db"] >= 100
        assert run_data["records_deduplicated"] >= 100

        # 3. Sectors & Trends (All 13 verticals including Healthcare, Physical AI, Consumer AI)
        sectors = client.get("/api/v1/sectors")
        assert sectors.status_code == 200
        assert len(sectors.json()) == 13

        sec_detail = client.get("/api/v1/sectors/healthcare-clinical-ai")
        assert sec_detail.status_code == 200
        assert "Healthcare" in sec_detail.json()["sector"]["name"]

        sec_trends = client.get("/api/v1/sectors/ai-infrastructure/trends")
        assert sec_trends.status_code == 200
        assert sec_trends.json()["publication_analytics"]["sample_size"] == 6

        # 4. Technologies & Metrics
        techs = client.get("/api/v1/technologies")
        assert techs.status_code == 200
        assert len(techs.json()) >= 10

        tech_detail = client.get("/api/v1/technologies/vla-dexterous-manipulation")
        assert tech_detail.status_code == 200
        assert tech_detail.json()["technology"]["momentum_score"] == 91.4

        # 5. Papers Search & On-Demand Summary
        papers = client.get("/api/v1/papers?q=PagedAttention")
        assert papers.status_code == 200
        assert papers.json()["total"] >= 1
        first_paper_id = papers.json()["items"][0]["id"]

        summary_resp = client.post(f"/api/v1/papers/{first_paper_id}/summarize")
        assert summary_resp.status_code == 200
        assert "PagedAttention" in summary_resp.json()["ai_summary"]

        # 6. Companies (Verify NULL private financials show 'Insufficient publicly verified data.')
        companies = client.get("/api/v1/companies")
        assert companies.status_code == 200
        pi_comp = next(c for c in companies.json() if "Physical Intelligence" in c["name"])
        assert pi_comp["funding_amount"] is None
        assert pi_comp["funding_display"] == "Insufficient publicly verified data."

        # 7. Breakthroughs & Review Workflow
        bts = client.get("/api/v1/breakthroughs")
        assert bts.status_code == 200
        assert len(bts.json()) >= 3
        bt_id = bts.json()[0]["id"]

        review_resp = client.post(
            f"/api/v1/breakthroughs/{bt_id}/review",
            json={"action": "accept", "reviewer": "Partner Diligence", "notes": "Replicated on 8xH200 cluster."},
        )
        assert review_resp.status_code == 200
        assert review_resp.json()["status"] == "Accepted (IC Verified)"

        # 8. Economics Lab Calculate, Sensitivity, and Scenario Saving
        models = client.get("/api/v1/economics/models")
        assert models.status_code == 200
        assert len(models.json()) == 6

        calc_resp = client.post(
            "/api/v1/economics/calculate",
            json={"model_type": "robotics", "assumptions": {"robot_purchase_price_usd": 35000.0, "utilization_rate": 0.80}},
        )
        assert calc_resp.status_code == 200
        assert calc_resp.json()["outputs"]["commercially_viable"] is True

        hc_calc = client.post(
            "/api/v1/economics/simulate",
            json={"model_type": "healthcare_ai", "inputs": {"annual_studies_volume": 120000.0, "cms_reimbursement_per_study_usd": 45.0}},
        )
        assert hc_calc.status_code == 200
        assert hc_calc.json()["outputs"]["commercially_viable"] is True

        phys_calc = client.post(
            "/api/v1/economics/simulate",
            json={"model_type": "physical_ai", "inputs": {"embodied_unit_bom_usd": 28000.0, "autonomy_success_rate_hours_between_interventions": 18.0}},
        )
        assert phys_calc.status_code == 200
        assert phys_calc.json()["outputs"]["commercially_viable"] is True

        cons_calc = client.post(
            "/api/v1/economics/simulate",
            json={"model_type": "consumer_ai", "inputs": {"monthly_ai_subscription_arpu_usd": 19.0, "on_device_npu_offload_ratio": 0.78}},
        )
        assert cons_calc.status_code == 200
        assert cons_calc.json()["outputs"]["commercially_viable"] is True

        sens_resp = client.post(
            "/api/v1/economics/sensitivity",
            json={"model_type": "battery", "assumptions": {"cell_cost_per_kwh_usd": 100.0, "cycle_life_to_80pct_soh": 950.0}},
        )
        assert sens_resp.status_code == 200
        assert len(sens_resp.json()["tornado"]) >= 2

        # 9. Knowledge Graph Traversal & Bounded Expansion
        graph_resp = client.get("/api/v1/graph")
        assert graph_resp.status_code == 200
        assert graph_resp.json()["summary"]["node_count"] >= 20
        assert graph_resp.json()["summary"]["edge_count"] >= 15

        expand_resp = client.get("/api/v1/graph/expand?node_id=tech-vla-manipulation&depth=2")
        assert expand_resp.status_code == 200
        assert len(expand_resp.json()["nodes"]) >= 3

        # 10. Research Agent End-to-End Run & SSE Stream
        run_resp = client.post(
            "/api/v1/research/runs",
            json={
                "question": "Under what utilization and hardware cost assumptions do VLA manipulation robots beat manual warehouse kitting?",
                "sector_id": "sec-robotics",
                "technology_id": "tech-vla-manipulation",
            },
        )
        assert run_resp.status_code == 200
        run_payload = run_resp.json()
        assert run_payload["status"] == "Reporting"
        assert len(run_payload["claims"]) >= 1
        for claim in run_payload["claims"]:
            assert len(claim["evidence_source_ids"]) >= 1

        sse_resp = client.get(f"/api/v1/research/runs/{run_payload['id']}/events")
        assert sse_resp.status_code == 200
        assert "COMPLETE" in sse_resp.text

        # 11. Investment Theses & Markdown/PDF Export
        theses_resp = client.get("/api/v1/theses")
        assert theses_resp.status_code == 200
        assert len(theses_resp.json()) >= 3
        thesis_id = theses_resp.json()[0]["id"]

        md_export = client.post(f"/api/v1/theses/{thesis_id}/export", json={"format": "markdown"})
        assert md_export.status_code == 200
        assert "## 1. Executive Summary" in md_export.text
        assert "## 22. Evidence Appendix" in md_export.text

        pdf_export = client.post(f"/api/v1/theses/{thesis_id}/export", json={"format": "pdf"})
        assert pdf_export.status_code == 200
        assert pdf_export.content.startswith(b"%PDF")

        # 12. Global Search
        search_resp = client.get("/api/v1/search?q=silicon")
        assert search_resp.status_code == 200
        assert len(search_resp.json()["technologies"]) >= 1
