"""Explainable Technology Momentum Scoring Engine (Phase 6.2).

Formula:
    Momentum = 0.25*P + 0.15*C + 0.15*I + 0.20*O + 0.25*B

Where:
    P = Publication acceleration (0-100)
    C = Citation momentum, age-adjusted (0-100)
    I = Research institution expansion (0-100)
    O = Open-source activity (0-100)
    B = Technical benchmark progress (0-100)

Rules:
- Never silently treat missing data as 0.
- Compute conditional score from available components weighted by their relative share.
- Report coverage ratio and missing components explicitly.
- Suppress composite score when coverage_ratio < min_coverage_threshold (default 0.50).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from scipy import stats

MOMENTUM_SCORING_VERSION = "momentum-v1.0.0"

COMPONENT_WEIGHTS: dict[str, float] = {
    "publication_acceleration": 0.25,
    "citation_momentum": 0.15,
    "institution_expansion": 0.15,
    "open_source_activity": 0.20,
    "benchmark_progress": 0.25,
}


@dataclass
class MomentumScoreResult:
    score: float | None
    status: str
    coverage_ratio: float
    available_components: dict[str, float]
    missing_components: list[str]
    effective_weights: dict[str, float]
    scoring_version: str = MOMENTUM_SCORING_VERSION
    methodology_note: str = (
        "Experimental starting weights (0.25P + 0.15C + 0.15I + 0.20O + 0.25B); "
        "missing components are excluded rather than zero-filled."
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "score": self.score,
            "status": self.status,
            "coverage_ratio": round(self.coverage_ratio, 4),
            "available_components": {k: round(v, 2) for k, v in self.available_components.items()},
            "missing_components": self.missing_components,
            "effective_weights": {k: round(v, 4) for k, v in self.effective_weights.items()},
            "scoring_version": self.scoring_version,
            "methodology_note": self.methodology_note,
        }


def compute_percentile_ranks(values: list[float | None]) -> list[float | None]:
    """Convert raw cohort metric values into 0-100 percentile ranks while preserving None."""
    valid_vals = [float(v) for v in values if v is not None and not np.isnan(v)]
    if not valid_vals:
        return [None for _ in values]
    arr = np.array(valid_vals, dtype=float)
    result: list[float | None] = []
    for v in values:
        if v is None or np.isnan(v):
            result.append(None)
        else:
            pct = float(stats.percentileofscore(arr, float(v), kind="weak"))
            result.append(round(float(np.clip(pct, 0.0, 100.0)), 2))
    return result


def calculate_technology_momentum(
    *,
    publication_acceleration: float | None,
    citation_momentum: float | None,
    institution_expansion: float | None,
    open_source_activity: float | None,
    benchmark_progress: float | None,
    min_coverage_threshold: float = 0.50,
) -> MomentumScoreResult:
    """Compute explainable technology momentum score with strict missing-data handling."""
    raw_inputs: dict[str, float | None] = {
        "publication_acceleration": publication_acceleration,
        "citation_momentum": citation_momentum,
        "institution_expansion": institution_expansion,
        "open_source_activity": open_source_activity,
        "benchmark_progress": benchmark_progress,
    }

    available: dict[str, float] = {}
    missing: list[str] = []
    coverage = 0.0

    for comp_name, weight in COMPONENT_WEIGHTS.items():
        val = raw_inputs.get(comp_name)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            missing.append(comp_name)
        else:
            clamped = float(np.clip(float(val), 0.0, 100.0))
            available[comp_name] = clamped
            coverage += weight

    coverage = round(coverage, 4)

    if coverage < min_coverage_threshold or coverage <= 0.0:
        return MomentumScoreResult(
            score=None,
            status="suppressed_insufficient_coverage",
            coverage_ratio=coverage,
            available_components=available,
            missing_components=missing,
            effective_weights={},
        )

    effective_weights = {
        comp_name: COMPONENT_WEIGHTS[comp_name] / coverage for comp_name in available
    }
    weighted_sum = sum(available[c] * effective_weights[c] for c in available)
    status = "complete" if not missing else "conditional_partial_coverage"

    return MomentumScoreResult(
        score=round(float(weighted_sum), 2),
        status=status,
        coverage_ratio=coverage,
        available_components=available,
        missing_components=missing,
        effective_weights=effective_weights,
    )
