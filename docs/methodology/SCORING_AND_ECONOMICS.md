# Frontier Atlas — Quantitative Scoring & Techno-Economics Methodology (`docs/methodology/SCORING_AND_ECONOMICS.md`)

## 1. Technology Momentum Score (`momentum-v1.0.0`)

Each technology's momentum score $M \in [0, 100]$ is computed deterministically from five normalized signals:

$$M = 0.25 P + 0.15 C + 0.15 I + 0.20 O + 0.25 B$$

- $P$: Publication acceleration score (`[0, 100]`)
- $C$: Citation velocity score (`[0, 100]`)
- $I$: Institution expansion score (`[0, 100]`)
- $O$: Open-source activity score (`[0, 100]`)
- $B$: Quantitative benchmark progress score (`[0, 100]`)

**Missing Component Normalization**:
- If a technology has no applicable open-source repositories (e.g., wet-lab battery chemistry), $O$ is marked `None`, and the remaining active weights are renormalized to sum to `1.0` while `momentum_coverage` records the fraction of active weight (`0.80`).
- If fewer than `3` of the `5` components are available, `momentum_score` returns `None` (`INSUFFICIENT_DATA`).

## 2. Breakthrough Candidate Score (`breakthrough-v1.0.0`)

$$S_{\text{breakthrough}} = 0.30 T_{\text{imp}} + 0.15 N + 0.15 M + 0.20 R + 0.20 E$$

- **Comparability Guardrail**: If `conditions_comparable` is `False`, the candidate status is downgraded to `needs_verification` and $T_{\text{imp}}$ is capped at `35.0` to prevent apples-to-oranges benchmark comparisons.

## 3. Deterministic Techno-Economic Models

1. **Robotics Deployment (`robotics`)**:
   - Computes Annualized CapEx, Total Annual Robot Cost, Effective Annual Tasks, Cost per Task, Effective Hourly Robot Cost (including fractional human supervisor burden), Payback Period (months), and 5-Year NPV at 10% discount rate.
2. **Battery Energy Storage (`battery_storage`)**:
   - Computes Yield-Adjusted Cell Cost, Total Pack Cost (\$/kWh), Parity Gap vs. Incumbent Li-Ion, Effective Lifetime Energy Throughput, Levelized Cost of Storage (LCOS in \$/MWh), and Specific Energy.
3. **AI Inference Serving (`ai_inference`)**:
   - Computes Power Cost per Hour, All-In Hourly Node Cost, Effective Tokens per Hour, Cost per 1M Tokens, Savings vs. Baseline (%), Tokens per Watt-Second, and Annual 64-GPU Cluster Savings.
