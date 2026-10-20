"use client";

import React from "react";
import { Users, ShieldCheck, BookOpen } from "lucide-react";
import { useApiResource } from "@/hooks/useAtlasData";
import { Researcher } from "@/types/atlas";
import { QualityBadge } from "@/components/ui/Badge";

export default function ResearchersPage() {
  const { data: researchers, loading, error } =
    useApiResource<Researcher[]>("/api/v1/researchers");

  if (loading && !researchers) {
    return (
      <div className="atlas-panel p-6 font-mono text-xs text-atlas-muted">
        Loading Principal Investigators & Author Disambiguation Ledger...
      </div>
    );
  }

  if (error || !researchers) {
    return (
      <div className="atlas-panel p-6 text-xs text-rose-400">
        Error loading researchers: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="atlas-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-atlas-teal" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-atlas-teal">
              Phase 5.1 Entity Resolution • Anti-Homonym Disambiguation
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-atlas-text">
            Principal Investigators & Frontier Researchers
          </h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Authors are never merged by name alone. Disambiguation requires ORCID,
            OpenAlex Author ID, or shared affiliation + co-author neighborhood.
          </p>
        </div>
        <div className="font-mono text-xs text-atlas-muted">
          Disambiguated Authors:{" "}
          <strong className="text-atlas-teal">{researchers.length}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {researchers.map((r) => (
          <div
            key={r.id}
            className="atlas-panel flex flex-col justify-between p-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 border border-emerald-700/50 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                  <ShieldCheck className="h-3 w-3" /> ORCID: {r.orcid ?? "Pending"}
                </span>
                <QualityBadge status={r.quality_status} />
              </div>

              <h2 className="mt-2.5 text-base font-bold text-atlas-text">
                {r.full_name}
              </h2>
              <div className="mt-0.5 text-xs text-atlas-teal font-medium">
                {r.institution_name || "Independent / Unaffiliated"}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.research_areas.map((area) => (
                  <span
                    key={area}
                    className="rounded border border-atlas-border bg-atlas-bg px-2 py-0.5 font-mono text-[10px] text-slate-300"
                  >
                    {area}
                  </span>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 rounded border border-atlas-border bg-atlas-bg/60 p-2.5 font-mono text-xs">
                <div>
                  <div className="text-[9px] uppercase text-atlas-muted">
                    Works
                  </div>
                  <div className="font-bold text-atlas-text">
                    {r.works_count}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-atlas-muted">
                    Citations
                  </div>
                  <div className="font-bold text-atlas-teal">
                    {r.citation_count.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-atlas-muted">
                    h-index est.
                  </div>
                  <div className="font-bold text-atlas-blue">
                    {r.h_index_estimate ?? "N/A"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-atlas-border pt-2.5 font-mono text-[10px] text-atlas-muted">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> OpenAlex:{" "}
                {r.openalex_author_id ?? "N/A"}
              </span>
              <span>Homonym-Guarded</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
