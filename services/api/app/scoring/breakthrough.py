"""4-Stage Breakthrough Detector & Versioned Scoring Engine (Phase 7).

Breakthrough Score Formula (v1.0.0):
    Score = 0.30 * Technical_Improvement
          + 0.20 * Novelty
          + 0.20 * Reproducibility
          + 0.20 * Economic_Significance
          + 0.10 * Evidence_Quality

Strict Verification Rules:
1. Stage B checks that baseline_unit == candidate_unit and test conditions are comparable.
   If units differ or no comparable baseline exists, measured_improvement_pct is None (never fabricated).
2. Reproducibility is computed from independent lab replication, open-source code/weights,
   and standardized test protocols — NEVER inferred from citation count alone.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

BREAKTHROUGH_SCORING_VERSION = "breakthrough-v1.0.0"

BREAKTHROUGH_WEIGHTS = {
    "technical_improvement": 0.30,
    "novelty": 0.20,
    "reproducibility": 0.20,
    "economic_significance": 0.20,
    "evidence_quality": 0.10,
}


@dataclass
class BaselineComparisonResult:
    is_comparable: bool
    measured_improvement_pct: float | None
    technical_improvement_score: float
    reason: str


def evaluate_baseline_comparability(
    *,
    previous_value: float | None,
    new_value: float | None,
    previous_unit: str | None,
    new_unit: str | None,
    conditions_comparable: bool = True,
    higher_is_better: bool = True,
) -> BaselineComparisonResult:
    """Stage B: Compare candidate technical metric against historical baseline."""
    if previous_value is None or new_value is None:
        return BaselineComparisonResult(
            is_comparable=False,
            measured_improvement_pct=None,
            technical_improvement_score=0.0,
            reason="Missing baseline or candidate numeric value; percentage improvement suppressed.",
        )

    u1 = (previous_unit or "").strip().lower()
    u2 = (new_unit or "").strip().lower()
    if not u1 or not u2 or u1 != u2:
        return BaselineComparisonResult(
            is_comparable=False,
            measured_improvement_pct=None,
            technical_improvement_score=0.0,
            reason=f"Incompatible measurement units ('{previous_unit}' vs '{new_unit}'); percentage improvement suppressed.",
        )

    if not conditions_comparable:
        return BaselineComparisonResult(
            is_comparable=False,
            measured_improvement_pct=None,
            technical_improvement_score=25.0,
            reason="Testing conditions are non-comparable; quantitative improvement percentage suppressed.",
        )

    if previous_value == 0:
        return BaselineComparisonResult(
            is_comparable=False,
            measured_improvement_pct=None,
            technical_improvement_score=50.0,
            reason="Zero baseline prevents ratio percentage calculation.",
        )

    if higher_is_better:
        raw_pct = ((new_value - previous_value) / abs(previous_value)) * 100.0
    else:
        # When lower is better (e.g. cost per token, required stack pressure), reduction is positive improvement
        raw_pct = ((previous_value - new_value) / abs(previous_value)) * 100.0

    # Map improvement to 0-100 score smoothly using saturating curve
    if raw_pct <= 0:
        tech_score = 10.0
    else:
        tech_score = float(np.clip(35.0 + 65.0 * (1.0 - np.exp(-raw_pct / 45.0)), 0.0, 100.0))

    return BaselineComparisonResult(
        is_comparable=True,
        measured_improvement_pct=round(float(raw_pct), 2),
        technical_improvement_score=round(tech_score, 2),
        reason="Verified unit and test-condition equivalence.",
    )


def compute_reproducibility_score(
    *,
    independently_replicated: bool,
    has_open_source_artifact: bool,
    standardized_benchmark_protocol: bool,
    peer_reviewed_venue: bool,
) -> float:
    """Compute Reproducibility score (0-100) from verification signals rather than citation count."""
    score = 15.0  # Base documented claim
    if standardized_benchmark_protocol:
        score += 25.0
    if peer_reviewed_venue:
        score += 15.0
    if has_open_source_artifact:
        score += 20.0
    if independently_replicated:
        score += 25.0
    return round(float(np.clip(score, 0.0, 100.0)), 2)


def calculate_breakthrough_score(
    *,
    technical_improvement_score: float,
    novelty_score: float,
    reproducibility_score: float,
    economic_significance_score: float,
    evidence_quality_score: float,
) -> dict[str, Any]:
    """Stage C & D: Compute composite Breakthrough Candidate score (v1.0.0)."""
    t = float(np.clip(technical_improvement_score, 0.0, 100.0))
    n = float(np.clip(novelty_score, 0.0, 100.0))
    r = float(np.clip(reproducibility_score, 0.0, 100.0))
    e = float(np.clip(economic_significance_score, 0.0, 100.0))
    q = float(np.clip(evidence_quality_score, 0.0, 100.0))

    composite = (
        BREAKTHROUGH_WEIGHTS["technical_improvement"] * t
        + BREAKTHROUGH_WEIGHTS["novelty"] * n
        + BREAKTHROUGH_WEIGHTS["reproducibility"] * r
        + BREAKTHROUGH_WEIGHTS["economic_significance"] * e
        + BREAKTHROUGH_WEIGHTS["evidence_quality"] * q
    )

    classification = (
        "Verified Inflection Candidate"
        if composite >= 82.0 and r >= 65.0
        else ("Emerging Signal — Replication Pending" if composite >= 68.0 else "Early Observation")
    )

    return {
        "score": round(float(composite), 2),
        "classification": classification,
        "scoring_version": BREAKTHROUGH_SCORING_VERSION,
        "components": {
            "technical_improvement_score": round(t, 2),
            "novelty_score": round(n, 2),
            "reproducibility_score": round(r, 2),
            "economic_significance_score": round(e, 2),
            "evidence_quality_score": round(q, 2),
        },
        "weights": BREAKTHROUGH_WEIGHTS,
    }
