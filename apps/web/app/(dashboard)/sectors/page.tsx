"use client";

import React from "react";
import Link from "next/link";
import { Layers, ArrowRight, Sparkles, AlertTriangle, TrendingUp } from "lucide-react";
import { useApiResource } from "@/hooks/useAtlasData";
import { Sector } from "@/types/atlas";
import { QualityBadge } from "@/components/ui/Badge";

export default function SectorsExplorerPage() {
  const { data: sectors, loading, error } =
    useApiResource<Sector[]>("/api/v1/sectors");

  if (loading && !sectors) {
    return (
      <div className="atlas-panel p-6 font-mono text-xs text-atlas-muted">
        Loading 10 Frontier Research Verticals...
      </div>
    );
  }

  if (error || !sectors) {
    return (
      <div className="atlas-panel p-6 text-xs text-rose-400">
        Failed to load sectors: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="atlas-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-atlas-teal" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-atlas-teal">
              Phase 1.2 Architecture • 10 Deep-Tech Verticals
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-atlas-text">
            Frontier Sectors Explorer
          </h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Prioritizing AI Infrastructure, Robotics & Autonomous Systems, and
            Energy Storage while tracking all 10 institutional deep-tech sectors.
          </p>
        </div>
        <div className="font-mono text-xs text-atlas-muted">
          Total Active Verticals:{" "}
          <strong className="text-atlas-teal">{sectors.length}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sectors.map((sec) => {
          const latestTrend =
            sec.historical_trends[sec.historical_trends.length - 1];
          const firstTrend = sec.historical_trends[0];
          const growthPct =
            firstTrend && latestTrend && firstTrend.publications > 0
              ? Math.round(
                  ((latestTrend.publications - firstTrend.publications) /
                    firstTrend.publications) *
                    100
                )
              : 0;

          return (
            <div
              key={sec.id}
              className="atlas-panel flex flex-col justify-between p-5 transition-colors hover:border-atlas-teal/50"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                      sec.priority_tier === 1
                        ? "bg-atlas-teal/20 text-atlas-teal border border-atlas-teal/40"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    Tier {sec.priority_tier}{" "}
                    {sec.priority_tier === 1 ? "• Priority Flagship" : "• Tracked"}
                  </span>
                  <QualityBadge status={sec.quality_status} />
                </div>

                <Link
                  href={`/sectors/${sec.slug}`}
                  className="mt-2.5 block text-base font-bold text-atlas-text hover:text-atlas-teal"
                >
                  {sec.name}
                </Link>
                <p className="mt-1.5 text-xs leading-relaxed text-atlas-muted">
                  {sec.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {sec.subcategories.map((sub) => (
                    <span
                      key={sub}
                      className="rounded border border-atlas-border bg-atlas-bg px-2 py-0.5 font-mono text-[10px] text-slate-300"
                    >
                      {sub}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 rounded border border-atlas-border bg-atlas-bg/60 p-3 text-xs sm:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-400">
                      <Sparkles className="h-3 w-3" /> Technical Inflection
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      {sec.technical_inflection_points[0] || "Tracked via metrics"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-amber-400">
                      <AlertTriangle className="h-3 w-3" /> Primary Barrier
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      {sec.commercialization_barriers[0] || "Capital intensity"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-atlas-border pt-3">
                <div className="flex items-center gap-3 font-mono text-[11px] text-atlas-muted">
                  <span className="flex items-center gap-1 text-atlas-teal">
                    <TrendingUp className="h-3.5 w-3.5" />+{growthPct}% 5Y Pubs
                  </span>
                  <span>
                    2026 Vol:{" "}
                    <strong className="text-atlas-text">
                      {latestTrend?.publications?.toLocaleString() ?? "N/A"}
                    </strong>
                  </span>
                </div>
                <Link
                  href={`/sectors/${sec.slug}`}
                  className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-atlas-teal hover:underline"
                >
                  Open Vertical Dossier <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
