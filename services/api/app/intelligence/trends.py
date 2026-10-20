"""Statistical Trend Analysis, Novelty Detection, and Snapshot Growth Analytics (Phase 4.3, 6.3, 6.4).

Uses NumPy and SciPy for reproducible calculations.
Never fabricates historical GitHub stars when dated snapshots are missing.
"""

from __future__ import annotations

from collections import Counter
from datetime import date, timedelta
from typing import Any

import numpy as np
from scipy import stats


def analyze_time_series(points: list[dict[str, Any]], value_key: str = "publications") -> dict[str, Any]:
    """Compute YoY growth, rolling averages, growth acceleration, anomalies, and change points."""
    sorted_pts = sorted(
        [p for p in points if p.get("year") is not None and p.get(value_key) is not None],
        key=lambda x: int(x["year"]),
    )
    if len(sorted_pts) < 2:
        return {
            "sample_size": len(sorted_pts),
            "yoy_growth_rates": [],
            "rolling_average_3yr": [],
            "latest_yoy_growth_pct": None,
            "growth_acceleration_pct": None,
            "anomalies": [],
            "change_point_year": None,
            "confidence_interval_95": None,
            "statistical_note": "Insufficient time-series length (<2 points) for trend metrics.",
        }

    years = [int(p["year"]) for p in sorted_pts]
    values = np.array([float(p[value_key]) for p in sorted_pts], dtype=float)

    # 1. Year-over-Year (YoY) growth rates
    yoy_rates: list[dict[str, Any]] = []
    raw_yoy: list[float] = []
    for idx in range(1, len(values)):
        prev_val = values[idx - 1]
        curr_val = values[idx]
        if prev_val > 0:
            pct = ((curr_val - prev_val) / prev_val) * 100.0
            raw_yoy.append(float(pct))
            yoy_rates.append({"year": years[idx], "yoy_growth_pct": round(float(pct), 2)})
        else:
            yoy_rates.append({"year": years[idx], "yoy_growth_pct": None})

    # 2. Rolling 3-year average
    rolling_3yr: list[dict[str, Any]] = []
    for idx in range(len(values)):
        window = values[max(0, idx - 2) : idx + 1]
        rolling_3yr.append({"year": years[idx], "rolling_avg": round(float(np.mean(window)), 2)})

    # 3. Growth acceleration (second difference of YoY rates)
    growth_acceleration: float | None = None
    if len(raw_yoy) >= 2:
        growth_acceleration = round(float(raw_yoy[-1] - raw_yoy[-2]), 2)

    # 4. Distribution-based anomaly detection on YoY growth (Z-score & MAD)
    anomalies: list[dict[str, Any]] = []
    if len(raw_yoy) >= 3:
        yoy_arr = np.array(raw_yoy, dtype=float)
        mean_yoy = float(np.mean(yoy_arr))
        std_yoy = float(np.std(yoy_arr, ddof=1))
        if std_yoy > 1e-6:
            for idx, rate in enumerate(raw_yoy):
                z_val = (rate - mean_yoy) / std_yoy
                if abs(z_val) >= 1.65:
                    anomalies.append(
                        {
                            "year": years[idx + 1],
                            "yoy_growth_pct": round(rate, 2),
                            "z_score": round(float(z_val), 2),
                        }
                    )

    # 5. CUSUM change-point detection on annual increments
    change_point_year: int | None = None
    if len(values) >= 4:
        diffs = np.diff(values)
        mean_diff = float(np.mean(diffs))
        cusum = np.cumsum(diffs - mean_diff)
        cp_idx = int(np.argmax(np.abs(cusum)))
        change_point_year = years[cp_idx + 1]

    # 6. Defensible Student-t 95% confidence interval on YoY growth when n >= 3
    ci_95: dict[str, float] | None = None
    if len(raw_yoy) >= 3:
        yoy_arr = np.array(raw_yoy, dtype=float)
        sem = float(stats.sem(yoy_arr))
        if sem > 0:
            low, high = stats.t.interval(0.95, df=len(yoy_arr) - 1, loc=float(np.mean(yoy_arr)), scale=sem)
            ci_95 = {
                "mean_yoy_pct": round(float(np.mean(yoy_arr)), 2),
                "lower_95_pct": round(float(low), 2),
                "upper_95_pct": round(float(high), 2),
                "degrees_of_freedom": len(yoy_arr) - 1,
            }

    # 7. Linear regression & CAGR & rolling Z-score for UI analytics
    n_periods = max(1, years[-1] - years[0])
    cagr_pct = (
        round(((values[-1] / values[0]) ** (1.0 / n_periods) - 1.0) * 100.0, 2)
        if values[0] > 0
        else 0.0
    )
    lin_res = stats.linregress(np.arange(len(values), dtype=float), values)
    slope_per_period = round(float(lin_res.slope), 2)
    r_squared = round(float(lin_res.rvalue**2), 3) if not np.isnan(lin_res.rvalue) else 0.0

    std_vals = float(np.std(values, ddof=1)) if len(values) > 1 else 0.0
    rolling_z = (
        round(float((values[-1] - float(np.mean(values))) / std_vals), 2)
        if std_vals > 1e-6
        else 0.0
    )
    cp_index = years.index(change_point_year) if change_point_year in years else None
    latest_yoy = round(raw_yoy[-1], 2) if raw_yoy else 0.0

    return {
        "sample_size": len(sorted_pts),
        "yoy_growth_rates": yoy_rates,
        "rolling_average_3yr": rolling_3yr,
        "latest_yoy_growth_pct": round(raw_yoy[-1], 2) if raw_yoy else None,
        "growth_acceleration_pct": growth_acceleration,
        "anomalies": anomalies,
        "change_point_year": change_point_year,
        "confidence_interval_95": ci_95,
        "statistical_note": "Calculated via deterministic SciPy Student-t and CUSUM estimators.",
        "growth_rate_pct": latest_yoy,
        "acceleration": growth_acceleration or 0.0,
        "rolling_z_score": rolling_z,
        "cagr_pct": cagr_pct,
        "slope_per_period": slope_per_period,
        "r_squared": r_squared,
        "change_point_detected": change_point_year is not None,
        "change_point_index": cp_index,
        "summary": (
            f"CAGR {cagr_pct:+.1f}% ({years[0]}–{years[-1]}), latest YoY {latest_yoy:+.1f}%, "
            f"R²={r_squared:.3f}, structural regime shift in {change_point_year or 'N/A'}."
        ),
    }


def compute_repository_snapshot_growth(
    snapshots: list[dict[str, Any]],
    reference_date: date | None = None,
) -> dict[str, Any]:
    """Calculate 7d, 30d, and 90d repository growth strictly from dated snapshots (Phase 4.3).

    Never manufactures past stars from today's total. If historical snapshots do not cover
    a window, returns None with explicit status.
    """
    if not snapshots:
        return {
            "has_history": False,
            "star_growth_7d": None,
            "star_growth_30d": None,
            "star_growth_90d": None,
            "fork_growth_30d": None,
            "release_frequency_90d": None,
            "commit_velocity_30d": None,
            "status": "Insufficient snapshot history",
        }

    ordered = sorted(snapshots, key=lambda s: s["snapshot_date"])
    latest = ordered[-1]
    ref_d: date = reference_date or latest["snapshot_date"]

    def _find_snapshot_at_or_before(days_back: int) -> dict[str, Any] | None:
        target = ref_d - timedelta(days=days_back)
        # Accept snapshot within +/- 5 days of target window
        best: dict[str, Any] | None = None
        best_delta = 9999
        for s in ordered:
            delta = abs((s["snapshot_date"] - target).days)
            if delta <= 5 and delta < best_delta:
                best = s
                best_delta = delta
        return best

    s7 = _find_snapshot_at_or_before(7)
    s30 = _find_snapshot_at_or_before(30)
    s90 = _find_snapshot_at_or_before(90)

    return {
        "has_history": len(ordered) >= 2,
        "snapshot_count": len(ordered),
        "latest_snapshot_date": latest["snapshot_date"].isoformat(),
        "star_growth_7d": (latest["stars"] - s7["stars"]) if s7 else None,
        "star_growth_30d": (latest["stars"] - s30["stars"]) if s30 else None,
        "star_growth_90d": (latest["stars"] - s90["stars"]) if s90 else None,
        "fork_growth_30d": (latest["forks"] - s30["forks"]) if s30 else None,
        "release_frequency_90d": (latest["release_count"] - s90["release_count"]) if s90 else None,
        "commit_velocity_30d": (latest["commits_count"] - s30["commits_count"]) if s30 else None,
        "contributors_count": latest.get("contributors_count", 0),
        "commercial_adoption_disclaimer": (
            "Open-source repository star and commit velocity measures developer research interest, "
            "not audited commercial customer revenue."
        ),
    }


def detect_novelty_clusters(papers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Identify emerging research topic co-occurrence clusters by reproducible code (Phase 6.4)."""
    pair_counter: Counter[tuple[str, str]] = Counter()
    pair_citations: Counter[tuple[str, str]] = Counter()
    pair_institutions: dict[tuple[str, str], set[str]] = {}

    for p in papers:
        topics = sorted({str(t).strip().lower() for t in (p.get("topics") or []) if t})
        cites = int(p.get("citations_count") or 0)
        insts = {str(i).strip() for i in (p.get("institutions_list") or []) if i}
        for i in range(len(topics)):
            for j in range(i + 1, len(topics)):
                pair = (topics[i], topics[j])
                pair_counter[pair] += 1
                pair_citations[pair] += cites
                pair_institutions.setdefault(pair, set()).update(insts)

    clusters: list[dict[str, Any]] = []
    for (t1, t2), count in pair_counter.most_common(8):
        inst_set = pair_institutions.get((t1, t2), set())
        novelty_rank_score = min(100.0, round(35.0 + count * 14.0 + len(inst_set) * 6.5, 2))
        clusters.append(
            {
                "cluster_label": f"{t1.title()} × {t2.title()}",
                "topic_pair": [t1, t2],
                "publication_count": count,
                "combined_citations": pair_citations[(t1, t2)],
                "participating_institutions": sorted(inst_set),
                "novelty_rank_score": novelty_rank_score,
            }
        )
    return clusters
