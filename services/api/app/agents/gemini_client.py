"""Official Google Gemini API Client & Free-Tier Budget Guard (Phase 8.2 & 8.3).

Uses exclusively the official `google-genai` Python SDK.
Reads model name from `GEMINI_MODEL` environment setting.
Validates model against free-tier allowlist and tracks daily/per-run/per-minute quotas.
Falls back cleanly to deterministic synthesis when GEMINI_API_KEY is absent or quota is reached.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.core import get_logger
from app.models import AIRequest, EvidenceSource
from app.security import sanitize_untrusted_research_text

logger = get_logger(__name__)

T = TypeVar("T", bound=BaseModel)


class ResearchPlanOutput(BaseModel):
    research_objective: str
    subquestions: list[str]
    evidence_requirements: list[str]
    search_plan: list[str]
    completion_criteria: list[str]


class ExtractedClaimItem(BaseModel):
    statement: str
    claim_type: str
    evidence_source_ids: list[str]
    confidence: float


class ExtractedClaimsOutput(BaseModel):
    claims: list[ExtractedClaimItem]


class TechnicalAnalysisOutput(BaseModel):
    benchmark_comparison: str
    technical_limitations: list[str]
    competing_approaches: list[str]
    unresolved_scientific_questions: list[str]
    cited_evidence_ids: list[str]


class ThesisSynthesisOutput(BaseModel):
    executive_summary: str
    bull_case: str
    bear_case: str
    what_must_be_true: list[str]
    falsification_triggers: list[str]
    next_research_actions: list[str]
    cited_evidence_ids: list[str]


class GeminiService:
    """Controlled Gemini API client with free-tier allowlist, caching, and Pydantic validation."""

    def __init__(self, api_key: str | None = None, model_name: str | None = None) -> None:
        self.api_key = (api_key if api_key is not None else settings.GEMINI_API_KEY).strip()
        self.model_name = (model_name if model_name is not None else settings.GEMINI_MODEL).strip()

    def discover_and_verify_model(self) -> dict[str, Any]:
        """Verify configured model eligibility and probe account availability when key is present."""
        eligible = settings.is_model_free_tier_eligible(self.model_name)
        if not eligible:
            return {
                "configured_model": self.model_name,
                "free_tier_eligible": False,
                "api_key_configured": bool(self.api_key),
                "status": "blocked_non_free_tier_model",
                "reason": (
                    f"Model '{self.model_name}' is not on the free-tier Flash allowlist "
                    f"({', '.join(settings.FREE_TIER_MODEL_ALLOWLIST)}). Paid/Pro models are strictly blocked."
                ),
            }

        if not settings.ENABLE_AI or not self.api_key:
            return {
                "configured_model": self.model_name,
                "free_tier_eligible": True,
                "api_key_configured": False,
                "status": "deterministic_fallback_ready",
                "reason": "GEMINI_API_KEY not set; deterministic research and economics engines active at $0 cost.",
            }

        try:
            client = genai.Client(api_key=self.api_key)
            available_names: list[str] = []
            for m in client.models.list():
                name = getattr(m, "name", "") or ""
                clean = name.removeprefix("models/")
                if settings.is_model_free_tier_eligible(clean):
                    available_names.append(clean)

            selected = self.model_name
            if available_names and selected not in available_names:
                selected = available_names[0]

            return {
                "configured_model": self.model_name,
                "selected_model": selected,
                "free_tier_eligible": True,
                "api_key_configured": True,
                "available_free_tier_models": available_names,
                "status": "live_gemini_ready",
                "reason": f"Verified free-tier model '{selected}' via google-genai SDK.",
            }
        except Exception as exc:
            return {
                "configured_model": self.model_name,
                "free_tier_eligible": True,
                "api_key_configured": True,
                "status": "connectivity_warning_fallback_ready",
                "reason": f"Gemini discovery probe returned warning ({exc}); deterministic fallback available.",
            }

    def check_budget(self, db: Session, session_id: str | None = None) -> dict[str, Any]:
        """Check per-minute, per-day, and per-run budgets against the ai_requests ledger."""
        now = datetime.now(timezone.utc)
        day_start = now - timedelta(days=1)
        min_start = now - timedelta(minutes=1)

        daily_used = int(
            db.scalar(
                select(func.count(AIRequest.id)).where(
                    AIRequest.created_at >= day_start,
                    AIRequest.cached_hit.is_(False),
                )
            )
            or 0
        )
        minute_used = int(
            db.scalar(
                select(func.count(AIRequest.id)).where(
                    AIRequest.created_at >= min_start,
                    AIRequest.cached_hit.is_(False),
                )
            )
            or 0
        )
        run_used = 0
        if session_id:
            run_used = int(
                db.scalar(
                    select(func.count(AIRequest.id)).where(
                        AIRequest.session_id == session_id,
                        AIRequest.cached_hit.is_(False),
                    )
                )
                or 0
            )

        allowed = (
            daily_used < settings.AI_MAX_REQUESTS_PER_DAY
            and minute_used < settings.AI_MAX_REQUESTS_PER_MINUTE
            and run_used < settings.AI_MAX_REQUESTS_PER_RUN
        )
        return {
            "allowed": allowed,
            "daily_used": daily_used,
            "daily_limit": settings.AI_MAX_REQUESTS_PER_DAY,
            "minute_used": minute_used,
            "minute_limit": settings.AI_MAX_REQUESTS_PER_MINUTE,
            "run_used": run_used,
            "run_limit": settings.AI_MAX_REQUESTS_PER_RUN,
        }

    @staticmethod
    def verify_output_structure(raw_payload: dict[str, Any] | str, schema_cls: type[T]) -> T:
        """Validate structured output against Pydantic schema."""
        if isinstance(raw_payload, str):
            data = json.loads(raw_payload)
        else:
            data = raw_payload
        return schema_cls.model_validate(data)

    def generate_structured(
        self,
        db: Session,
        *,
        agent_role: str,
        prompt: str,
        schema_cls: type[T],
        fallback_payload: dict[str, Any],
        session_id: str | None = None,
        max_retries: int = 2,
    ) -> tuple[T, str]:
        """Generate structured Pydantic-validated output via google-genai or deterministic fallback."""
        sanitized_prompt = sanitize_untrusted_research_text(prompt, max_length=14000)
        prompt_hash = hashlib.sha256(
            f"{self.model_name}:{schema_cls.__name__}:{sanitized_prompt}".encode("utf-8")
        ).hexdigest()

        # 1. Check local SHA-256 cache in ai_requests
        cached = db.scalars(
            select(AIRequest).where(
                AIRequest.prompt_hash == prompt_hash,
                AIRequest.status == "completed",
            )
        ).first()
        if cached and cached.response_json:
            try:
                validated = self.verify_output_structure(cached.response_json, schema_cls)
                return validated, "cached_gemini_response"
            except ValidationError:
                pass

        # 2. Enforce free-tier model eligibility & quota budget
        if not settings.is_model_free_tier_eligible(self.model_name):
            raise ValueError(
                f"Configured GEMINI_MODEL '{self.model_name}' is not eligible for the free tier."
            )

        budget = self.check_budget(db, session_id=session_id)
        if not settings.ENABLE_AI or not self.api_key or not budget["allowed"]:
            validated_fallback = self.verify_output_structure(fallback_payload, schema_cls)
            mode = "quota_exhausted_deterministic_fallback" if not budget["allowed"] else "deterministic_engine"
            return validated_fallback, mode

        # 3. Call official google-genai SDK with bounded retries for malformed JSON
        client = genai.Client(api_key=self.api_key)
        last_err: Exception | None = None
        for _attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model=self.model_name,
                    contents=sanitized_prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=schema_cls,
                        temperature=0.1,
                    ),
                )
                text_out = response.text or "{}"
                validated = self.verify_output_structure(text_out, schema_cls)
                db.add(
                    AIRequest(
                        session_id=session_id,
                        agent_role=agent_role,
                        model_name=self.model_name,
                        prompt_hash=prompt_hash,
                        prompt_tokens=len(sanitized_prompt) // 4,
                        completion_tokens=len(text_out) // 4,
                        cached_hit=False,
                        status="completed",
                        response_json=validated.model_dump(),
                    )
                )
                db.flush()
                return validated, f"live_gemini ({self.model_name})"
            except Exception as exc:
                last_err = exc
                logger.warning(f"Gemini structured call attempt failed ({exc}); retrying or falling back.")

        logger.warning(f"Falling back to deterministic synthesis after Gemini error: {last_err}")
        return self.verify_output_structure(fallback_payload, schema_cls), "deterministic_fallback_after_error"

    def summarize_evidence(
        self,
        db: Session,
        evidence_records: list[dict[str, Any]],
        question: str,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        ev_ids = [e["id"] for e in evidence_records if e.get("id")]
        fallback = {
            "benchmark_comparison": (
                f"Across {len(evidence_records)} verified primary sources addressing '{question}', "
                f"measured benchmarks demonstrate order-of-magnitude throughput and energy-density gains "
                f"while highlighting specific scaling bottlenecks ({', '.join(ev_ids[:3])})."
            ),
            "technical_limitations": [
                "Tail-latency or degradation behavior under extreme duty cycles requires extended multi-month telemetry.",
                "Manufacturing or cluster utilization below break-even thresholds erodes theoretical unit-cost gains.",
            ],
            "competing_approaches": [
                "Incumbent baseline architectures with fully depreciated manufacturing lines.",
                "Alternative algorithmic or chemistry pathways trading peak performance for lower CapEx.",
            ],
            "unresolved_scientific_questions": [
                "Long-horizon degradation and error-recovery scaling laws in unstructured commercial environments.",
            ],
            "cited_evidence_ids": ev_ids[:6],
        }
        prompt = (
            f"Summarize the following verified evidence records for the question: {question}\n"
            f"Evidence JSON: {json.dumps(evidence_records[:8], default=str)}\n"
            f"Only cite IDs from: {ev_ids}"
        )
        out, mode = self.generate_structured(
            db,
            agent_role="TechnicalAnalyst",
            prompt=prompt,
            schema_cls=TechnicalAnalysisOutput,
            fallback_payload=fallback,
            session_id=session_id,
        )
        res = out.model_dump()
        res["execution_mode"] = mode
        return res

    def extract_claims(
        self,
        db: Session,
        evidence_records: list[dict[str, Any]],
        session_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """Extract claims and strictly validate that every cited evidence_source_id exists in DB."""
        valid_db_ids = set(db.scalars(select(EvidenceSource.id)).all())
        fallback_claims = []
        for ev in evidence_records[:5]:
            if ev["id"] in valid_db_ids:
                fallback_claims.append(
                    {
                        "statement": f"{ev['title']}: {ev.get('excerpt_summary', '')[:220]}",
                        "claim_type": "Empirical Benchmark",
                        "evidence_source_ids": [ev["id"]],
                        "confidence": 0.93,
                    }
                )

        prompt = (
            "Extract factual technical claims grounded strictly in these evidence records. "
            f"Every claim MUST cite only IDs from {[e['id'] for e in evidence_records]}.\n"
            f"Records: {json.dumps(evidence_records[:6], default=str)}"
        )
        out, _ = self.generate_structured(
            db,
            agent_role="ClaimExtractor",
            prompt=prompt,
            schema_cls=ExtractedClaimsOutput,
            fallback_payload={"claims": fallback_claims},
            session_id=session_id,
        )
        return self.validate_grounded_claims(db, [c.model_dump() for c in out.claims])

    @staticmethod
    def validate_grounded_claims(db: Session, candidate_claims: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Reject any claim that cites a non-existent or fabricated evidence_source_id (Phase 8.4)."""
        valid_sources = {s.id: s for s in db.scalars(select(EvidenceSource)).all()}
        verified_claims: list[dict[str, Any]] = []

        for clm in candidate_claims:
            raw_ids = clm.get("evidence_source_ids") or []
            verified_ids = [eid for eid in raw_ids if eid in valid_sources]
            if not verified_ids:
                # Reject ungrounded / hallucinated citation claims
                continue
            citations = [
                {
                    "evidence_source_id": eid,
                    "title": valid_sources[eid].title,
                    "source_url": valid_sources[eid].source_url,
                    "external_identifier": valid_sources[eid].external_identifier,
                }
                for eid in verified_ids
            ]
            verified_claims.append(
                {
                    "statement": clm["statement"],
                    "claim_type": clm.get("claim_type", "Quantitative Benchmark"),
                    "confidence": float(clm.get("confidence", 0.90)),
                    "verification_status": "Verified" if len(verified_ids) >= 1 else "Unverified",
                    "evidence_source_ids": verified_ids,
                    "citations": citations,
                }
            )
        return verified_claims

    def analyze_technology(
        self,
        db: Session,
        technology_name: str,
        evidence_records: list[dict[str, Any]],
        session_id: str | None = None,
    ) -> dict[str, Any]:
        return self.summarize_evidence(
            db, evidence_records, f"Evaluate technical readiness of {technology_name}", session_id=session_id
        )

    def generate_thesis(
        self,
        db: Session,
        *,
        question: str,
        technical_analysis: dict[str, Any],
        economic_outputs: dict[str, Any],
        evidence_records: list[dict[str, Any]],
        session_id: str | None = None,
    ) -> dict[str, Any]:
        ev_ids = [e["id"] for e in evidence_records if e.get("id")]
        primary_metric_label = economic_outputs.get("primary_metric_label", "Unit Cost")
        primary_key = economic_outputs.get("primary_metric_key", "")
        primary_val = economic_outputs.get("outputs", {}).get(primary_key, "N/A")

        fallback = {
            "executive_summary": (
                f"Evidence-backed diligence on '{question}' across {len(evidence_records)} primary sources "
                f"({', '.join(ev_ids[:3])}) indicates a measurable technical inflection. "
                f"Deterministic unit-economics modeling yields {primary_metric_label} = {primary_val} "
                f"({economic_outputs.get('primary_metric_unit', '')})."
            ),
            "bull_case": (
                f"Benchmark trajectory continues and utilization/cycle life reaches Bull scenario targets, "
                f"compressing {primary_metric_label} below incumbent parity within 18-24 months."
            ),
            "bear_case": (
                "Real-world commercial duty cycles expose long-tail reliability or precursor cost bottlenecks, "
                "preventing unit costs from crossing adoption thresholds."
            ),
            "what_must_be_true": [
                f"{primary_metric_label} must remain at or below modeled Base Case ({primary_val}) in production.",
                "Independent multi-institution benchmark gains must transfer to multi-shift customer deployments.",
            ],
            "falsification_triggers": [
                f"Falsified if {primary_metric_label} exceeds Bear Case threshold due to <50% utilization or rapid degradation.",
                "Falsified if open-source or incumbent alternatives close >80% of the performance gap within 12 months.",
            ],
            "next_research_actions": [
                "Audit raw benchmark test conditions and sample sizes across cited primary papers.",
                "Stress-test Tornado sensitivity top-2 parameters in the Frontier Atlas Economics Lab.",
            ],
            "cited_evidence_ids": ev_ids[:6],
        }
        prompt = (
            f"Synthesize an institutional VC thesis for: {question}\n"
            f"Technical Analysis: {json.dumps(technical_analysis, default=str)}\n"
            f"Deterministic Economics (DO NOT OVERRIDE NUMBERS): {json.dumps(economic_outputs, default=str)}\n"
            f"Allowed Evidence IDs: {ev_ids}"
        )
        out, mode = self.generate_structured(
            db,
            agent_role="InvestmentThesisAnalyst",
            prompt=prompt,
            schema_cls=ThesisSynthesisOutput,
            fallback_payload=fallback,
            session_id=session_id,
        )
        data = out.model_dump()
        data["execution_mode"] = mode
        return data
