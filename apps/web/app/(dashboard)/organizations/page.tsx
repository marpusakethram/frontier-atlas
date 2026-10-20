"use client";

import React, { useState } from "react";
import { Landmark, ExternalLink, Globe } from "lucide-react";
import { useApiResource } from "@/hooks/useAtlasData";
import { Organization } from "@/types/atlas";
import { QualityBadge } from "@/components/ui/Badge";

export default function OrganizationsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("");
  const queryPath = typeFilter
    ? `/api/v1/organizations?org_type=${typeFilter}`
    : "/api/v1/organizations";

  const { data: organizations, loading, error } =
    useApiResource<Organization[]>(queryPath, [typeFilter]);

  if (loading && !organizations) {
    return (
      <div className="atlas-panel p-6 font-mono text-xs text-atlas-muted">
        Loading Research Institutions, National Labs & Corporate Labs...
      </div>
    );
  }

  if (error || !organizations) {
    return (
      <div className="atlas-panel p-6 text-xs text-rose-400">
        Error loading organizations: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="atlas-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-emerald-400" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              OpenAlex Institution Registry & Spinout Lineage
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-atlas-text">
            Research Organizations & Institutions
          </h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Universities, US Department of Energy National Laboratories, and
            deep-tech commercialization spinouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {["", "university", "national_lab", "startup", "company"].map((t) => (
            <button
              key={t || "all"}
              onClick={() => setTypeFilter(t)}
              className={`rounded px-2.5 py-1 font-mono text-xs ${
                typeFilter === t
                  ? "bg-atlas-teal/20 text-atlas-teal border border-atlas-teal/40"
                  : "border border-atlas-border bg-atlas-bg text-atlas-muted hover:text-atlas-text"
              }`}
            >
              {t ? t.replace(/_/g, " ").toUpperCase() : "ALL"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <div
            key={org.id}
            className="atlas-panel flex flex-col justify-between p-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-300">
                  {org.organization_type.replace(/_/g, " ")}
                </span>
                <QualityBadge status={org.quality_status} />
              </div>

              <h2 className="mt-2.5 text-base font-bold text-atlas-text">
                {org.name}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-atlas-muted">
                {org.description}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 rounded border border-atlas-border bg-atlas-bg/60 p-2.5 font-mono text-xs">
                <div>
                  <div className="text-[9px] uppercase text-atlas-muted">
                    Works Indexed
                  </div>
                  <div className="font-bold text-atlas-teal">
                    {org.works_count.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-atlas-muted">
                    Total Citations
                  </div>
                  <div className="font-bold text-atlas-blue">
                    {org.citation_count.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-atlas-border pt-2.5 font-mono text-[11px] text-atlas-muted">
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" /> {org.country}
              </span>
              {org.website && (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-atlas-teal hover:underline"
                >
                  Official Site <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
