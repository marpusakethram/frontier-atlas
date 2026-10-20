"use client";

import React from "react";
import {
  Building2,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Cpu,
} from "lucide-react";
import { useApiResource } from "@/hooks/useAtlasData";
import { Company } from "@/types/atlas";
import { QualityBadge } from "@/components/ui/Badge";

export default function CompaniesPage() {
  const { data: companies, loading, error } =
    useApiResource<Company[]>("/api/v1/companies");

  if (loading && !companies) {
    return (
      <div className="atlas-panel p-6 font-mono text-xs text-atlas-muted">
        Loading Publicly Verified Deep-Tech Companies...
      </div>
    );
  }

  if (error || !companies) {
    return (
      <div className="atlas-panel p-6 text-xs text-rose-400">
        Error loading companies: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="atlas-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple-400" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-purple-400">
              Phase 3.3 & 12.6 • Epistemic Integrity Company Registry
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-atlas-text">
            Frontier Companies & Commercialization Entities
          </h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Zero fabricated private company valuations or funding figures. All
            unverified private financial metrics remain NULL and explicitly
            surface &quot;Insufficient publicly verified data.&quot;
          </p>
        </div>
        <div className="font-mono text-xs text-atlas-muted">
          Verified Entities:{" "}
          <strong className="text-atlas-teal">{companies.length}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {companies.map((comp) => (
          <div
            key={comp.id}
            className="atlas-panel flex flex-col justify-between p-5"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-purple-950/60 border border-purple-700/50 px-2 py-0.5 font-mono text-[10px] font-semibold text-purple-300">
                    HQ: {comp.headquarters_country} • Founded{" "}
                    {comp.founded_year ?? "N/A"}
                  </span>
                  <QualityBadge status={comp.verification_status} />
                </div>
                {comp.website && (
                  <a
                    href={comp.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs text-atlas-teal hover:underline"
                  >
                    Website <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <h2 className="mt-2.5 text-lg font-bold text-atlas-text">
                {comp.name}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-atlas-muted">
                {comp.description}
              </p>

              {/* Funding / Financial Epistemic Status Box */}
              <div className="mt-3 rounded border border-amber-700/40 bg-amber-950/20 p-3 text-xs">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="uppercase text-amber-400 font-semibold">
                    Public Financial & Funding Record
                  </span>
                  <span className="text-slate-400">
                    Stage: {comp.funding_stage ?? "Unverified"}
                  </span>
                </div>
                <div className="mt-1 font-mono text-xs font-semibold text-amber-200">
                  {comp.funding_display}
                </div>
              </div>

              {/* Commercialization Relevance */}
              <div className="mt-3 text-xs">
                <div className="font-semibold text-atlas-text">
                  Commercialization Relevance:
                </div>
                <p className="mt-0.5 text-slate-300">
                  {comp.commercialization_relevance}
                </p>
              </div>

              {/* Publicly Verified Technical Evidence */}
              <div className="mt-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Publicly Verified
                  Technical Evidence
                </div>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-300">
                  {comp.verified_public_evidence.map((ev) => (
                    <li
                      key={ev}
                      className="rounded border border-atlas-border bg-atlas-bg/60 px-2.5 py-1.5"
                    >
                      {ev}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Explicit Data Gaps */}
              <div className="mt-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5" /> Disclosed Data Gaps &
                  Diligence Requirements
                </div>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-300">
                  {comp.data_gaps.map((gap) => (
                    <li
                      key={gap}
                      className="rounded border border-rose-900/40 bg-rose-950/20 px-2.5 py-1.5 text-rose-200"
                    >
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-atlas-border pt-3 font-mono text-[11px] text-atlas-muted">
              <span className="flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-atlas-teal" /> Linked Tech IDs:{" "}
                {comp.technologies_linked.join(", ")}
              </span>
              <span>Sector: {comp.sector_id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
