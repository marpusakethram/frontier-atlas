"use client";

import React from "react";
import Link from "next/link";
import { Cpu, ArrowRight, Activity } from "lucide-react";
import { useApiResource } from "@/hooks/useAtlasData";
import { Technology } from "@/types/atlas";
import { QualityBadge } from "@/components/ui/Badge";
import { useAtlasStore } from "@/lib/api";

export default function TechnologiesPage() {
  const { activeSectorId } = useAtlasStore();
  const queryPath =
    activeSectorId === "all"
      ? "/api/v1/technologies"
      : `/api/v1/technologies?sector_id=${activeSectorId}`;

  const { data: technologies, loading, error } = useApiResource<Technology[]>(
    queryPath,
    [activeSectorId]
  );

  if (loading && !technologies) {
    return (
      <div className="atlas-panel p-6 font-mono text-xs text-atlas-muted">
        Loading Frontier Technologies & Momentum Vectors...
      </div>
    );
  }

  if (error || !technologies) {
    return (
      <div className="atlas-panel p-6 text-xs text-rose-400">
        Failed to load technologies: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="atlas-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-atlas-teal" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-atlas-teal">
              Deterministic Momentum & Maturity Evaluation
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-atlas-text">
            Frontier Technologies Registry
          </h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Auditable technical assessments, historical benchmark series, and
            5-factor momentum scores.
          </p>
        </div>
        <div className="font-mono text-xs text-atlas-muted">
          Tracked Technologies:{" "}
          <strong className="text-atlas-teal">{technologies.length}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {technologies.map((tech) => (
          <div
            key={tech.id}
            className="atlas-panel flex flex-col justify-between p-5 transition-colors hover:border-atlas-teal/50"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                  {tech.technology_category}
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded bg-atlas-teal/15 px-2 py-0.5 font-mono text-xs font-bold text-atlas-teal">
                    <Activity className="h-3 w-3" />
                    M = {tech.momentum_score?.toFixed(1) ?? "INSUFFICIENT"}
                  </span>
                  <QualityBadge status={tech.quality_status} />
                </div>
              </div>

              <Link
                href={`/technologies/${tech.slug}`}
                className="mt-2.5 block text-base font-bold text-atlas-text hover:text-atlas-teal"
              >
                {tech.name}
              </Link>
              <p className="mt-1.5 text-xs leading-relaxed text-atlas-muted">
                {tech.description}
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2 rounded border border-atlas-border bg-atlas-bg/60 p-2.5 font-mono text-[11px]">
                <div>
                  <div className="text-[9px] uppercase text-atlas-muted">
                    Maturity Stage
                  </div>
                  <div className="mt-0.5 font-semibold text-atlas-text">
                    {tech.maturity_stage.replace(/_/g, " ")} (
                    {tech.maturity_score ?? "N/A"})
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-atlas-muted">
                    Signal Coverage
                  </div>
                  <div className="mt-0.5 font-semibold text-emerald-400">
                    {(tech.momentum_coverage * 100).toFixed(0)}% (5-Factor)
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-atlas-muted">
                    Evidence Status
                  </div>
                  <div className="mt-0.5 font-semibold text-atlas-blue">
                    {tech.maturity_evidence_status}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-300">
                <strong className="text-atlas-muted">Economic Impact: </strong>
                {tech.economic_implications}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-atlas-border pt-3">
              <div className="text-[11px] text-atlas-muted">
                Competing: {tech.competing_technologies.slice(0, 2).join(", ")}
              </div>
              <Link
                href={`/technologies/${tech.slug}`}
                className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-atlas-teal hover:underline"
              >
                Inspect Technical Dossier <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
