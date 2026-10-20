"use client";

import React from "react";
import { Activity } from "lucide-react";

interface MomentumBreakdownCardProps {
  momentumScore: number | null;
  coverage: number;
  scoringVersion: string;
  components: {
    publication_acceleration?: number;
    citation_momentum?: number;
    institution_expansion?: number;
    open_source_activity?: number;
    benchmark_progress?: number;
    missing_components?: string[];
  };
}

const COMPONENT_META = [
  {
    key: "publication_acceleration" as const,
    label: "Publication Acceleration (P)",
    weight: "0.25",
    color: "bg-atlas-teal",
  },
  {
    key: "citation_momentum" as const,
    label: "Citation Velocity (C)",
    weight: "0.15",
    color: "bg-atlas-blue",
  },
  {
    key: "institution_expansion" as const,
    label: "Institution Expansion (I)",
    weight: "0.15",
    color: "bg-emerald-500",
  },
  {
    key: "open_source_activity" as const,
    label: "Open-Source Activity (O)",
    weight: "0.20",
    color: "bg-amber-500",
  },
  {
    key: "benchmark_progress" as const,
    label: "Benchmark Progress (B)",
    weight: "0.25",
    color: "bg-purple-500",
  },
];

export function MomentumBreakdownCard({
  momentumScore,
  coverage,
  scoringVersion,
  components,
}: MomentumBreakdownCardProps) {
  return (
    <div className="atlas-panel p-4">
      <div className="flex items-center justify-between border-b border-atlas-border pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-atlas-teal" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
            Deterministic Momentum Engine
          </h3>
        </div>
        <span className="font-mono text-[10px] text-atlas-muted">
          {scoringVersion} • Coverage {(coverage * 100).toFixed(0)}%
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div>
          <div className="text-[11px] text-atlas-muted">
            Formula: M = 0.25P + 0.15C + 0.15I + 0.20O + 0.25B
          </div>
          {components.missing_components &&
            components.missing_components.length > 0 && (
              <div className="mt-1 text-[11px] text-amber-400">
                Normalized over available signals (missing:{" "}
                {components.missing_components.join(", ")})
              </div>
            )}
        </div>
        <div className="text-right">
          <span className="font-mono text-2xl font-bold text-atlas-teal">
            {momentumScore !== null ? momentumScore.toFixed(1) : "INSUFFICIENT"}
          </span>
          <span className="ml-1 font-mono text-xs text-atlas-muted">/ 100</span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {COMPONENT_META.map((item) => {
          const val = components[item.key];
          return (
            <div key={item.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-atlas-muted">
                  {item.label}{" "}
                  <span className="font-mono text-[10px] text-slate-500">
                    (w={item.weight})
                  </span>
                </span>
                <span className="font-mono text-xs text-atlas-text">
                  {val !== undefined && val !== null ? `${val.toFixed(1)}` : "N/A"}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full ${item.color}`}
                  style={{ width: `${Math.min(100, Math.max(0, val ?? 0))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
