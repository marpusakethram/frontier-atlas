"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { useApiResource } from "@/hooks/useAtlasData";
import { Breakthrough } from "@/types/atlas";
import { QualityBadge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api";

export default function BreakthroughsFeedPage() {
  const { data: breakthroughs, loading, error, reload } =
    useApiResource<Breakthrough[]>("/api/v1/breakthroughs");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const handleReviewAction = async (
    id: string,
    action: "accept" | "reject" | "request_evidence"
  ) => {
    setReviewingId(id);
    try {
      await apiFetch(`/api/v1/breakthroughs/${id}/review`, {
        method: "POST",
        body: JSON.stringify({
          action,
          notes:
            reviewNote[id] ||
            `Analyst marked candidate as ${action.toUpperCase()} during IC triage.`,
        }),
      });
      await reload();
    } finally {
      setReviewingId(null);
    }
  };

  if (loading && !breakthroughs) {
    return (
      <div className="atlas-panel p-6 font-mono text-xs text-atlas-muted">
        Running Breakthrough Detection & Benchmark Comparability Engine...
      </div>
    );
  }

  if (error || !breakthroughs) {
    return (
      <div className="atlas-panel p-6 text-xs text-rose-400">
        Error loading breakthroughs: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="atlas-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              Phase 6.2 Breakthrough Detection • Comparable Benchmark Guardrails
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-atlas-text">
            Breakthrough Candidates & Inflection Feed
          </h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Candidates require a measurable performance delta over historical
            baselines under comparable test conditions, plus citation/replication
            evidence.
          </p>
        </div>
        <div className="font-mono text-xs text-atlas-muted">
          Candidates Tracked:{" "}
          <strong className="text-atlas-teal">{breakthroughs.length}</strong>
        </div>
      </div>

      <div className="space-y-5">
        {breakthroughs.map((b) => (
          <div key={b.id} className="atlas-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-atlas-border pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-atlas-teal/20 px-2.5 py-0.5 font-mono text-xs font-bold text-atlas-teal">
                    Composite Score: {b.score.toFixed(1)} / 100
                  </span>
                  <QualityBadge status={b.status} />
                  <span className="font-mono text-[11px] text-atlas-muted">
                    First Observed: {b.first_observed_at}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    ({b.scoring_version})
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-bold text-atlas-text">
                  {b.title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-atlas-muted">
                  {b.description}
                </p>
              </div>

              {/* Baseline vs New Benchmark Card */}
              <div className="rounded border border-atlas-teal/30 bg-atlas-bg p-3.5 font-mono text-xs">
                <div className="text-[10px] uppercase text-atlas-muted">
                  Empirical Benchmark Delta ({b.metric_name})
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-sm">
                  <span className="text-slate-400">
                    {b.previous_benchmark_value ?? "N/A"} {b.benchmark_unit}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-atlas-teal" />
                  <span className="font-bold text-emerald-400">
                    {b.new_benchmark_value ?? "N/A"} {b.benchmark_unit}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-atlas-teal">
                    Improvement: +{b.measured_improvement_pct ?? 0}%
                  </span>
                  <span className="text-slate-400">
                    {b.independently_replicated
                      ? "✓ Replicated"
                      : "Single-Lab Preprint"}
                  </span>
                </div>
              </div>
            </div>

            {/* 5-Component Score Breakdown */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
              {[
                {
                  label: "Technical Improvement",
                  val: b.technical_improvement_score,
                },
                { label: "Novelty Score", val: b.novelty_score },
                { label: "Momentum Score", val: b.momentum_score },
                { label: "Reproducibility", val: b.reproducibility_score },
                {
                  label: "Economic Significance",
                  val: b.economic_significance_score,
                },
                { label: "Evidence Quality", val: b.evidence_quality_score },
              ].map((comp) => (
                <div
                  key={comp.label}
                  className="rounded border border-atlas-border bg-atlas-bg/60 p-2.5"
                >
                  <div className="text-[10px] text-atlas-muted">{comp.label}</div>
                  <div className="mt-1 font-mono text-sm font-bold text-atlas-text">
                    {comp.val.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>

            {/* Economic Implications, Limitations & Verification Steps */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 text-xs">
              <div className="rounded border border-atlas-border bg-atlas-bg/40 p-3">
                <div className="font-semibold uppercase text-[10px] text-emerald-400">
                  Economic Implications
                </div>
                <p className="mt-1 text-slate-300">{b.economic_implications}</p>
              </div>
              <div className="rounded border border-atlas-border bg-atlas-bg/40 p-3">
                <div className="flex items-center gap-1 font-semibold uppercase text-[10px] text-amber-400">
                  <ShieldAlert className="h-3 w-3" /> Technical Limitations
                </div>
                <p className="mt-1 text-slate-300">{b.limitations}</p>
              </div>
              <div className="rounded border border-atlas-border bg-atlas-bg/40 p-3">
                <div className="font-semibold uppercase text-[10px] text-atlas-blue">
                  Suggested Verification Steps
                </div>
                <ul className="mt-1 list-disc pl-4 space-y-1 text-slate-300">
                  {b.suggested_verification_steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Provenance & Interactive Analyst Review Workflow */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-atlas-border pt-3.5 text-xs">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-atlas-muted">
                <span>
                  Supporting Evidence:{" "}
                  <strong className="text-atlas-teal">
                    {b.supporting_evidence_ids.join(", ")}
                  </strong>
                </span>
                <span>Researchers: {b.related_researchers.join(", ")}</span>
                <span>Institutions: {b.related_organizations.join(", ")}</span>
                {b.review_notes && (
                  <span className="text-amber-300">Note: {b.review_notes}</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={reviewNote[b.id] || ""}
                  onChange={(e) =>
                    setReviewNote((prev) => ({ ...prev, [b.id]: e.target.value }))
                  }
                  placeholder="Add IC review note..."
                  className="rounded border border-atlas-border bg-atlas-bg px-2.5 py-1 text-xs text-atlas-text"
                />
                <button
                  onClick={() => void handleReviewAction(b.id, "accept")}
                  disabled={reviewingId === b.id}
                  className="inline-flex items-center gap-1 rounded border border-emerald-700/60 bg-emerald-950/60 px-2.5 py-1 font-mono text-[11px] text-emerald-300 hover:bg-emerald-900/60"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                </button>
                <button
                  onClick={() => void handleReviewAction(b.id, "request_evidence")}
                  disabled={reviewingId === b.id}
                  className="inline-flex items-center gap-1 rounded border border-amber-700/60 bg-amber-950/60 px-2.5 py-1 font-mono text-[11px] text-amber-300 hover:bg-amber-900/60"
                >
                  <HelpCircle className="h-3.5 w-3.5" /> Request Evidence
                </button>
                <button
                  onClick={() => void handleReviewAction(b.id, "reject")}
                  disabled={reviewingId === b.id}
                  className="inline-flex items-center gap-1 rounded border border-rose-700/60 bg-rose-950/60 px-2.5 py-1 font-mono text-[11px] text-rose-300 hover:bg-rose-900/60"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
