"use client";

import React from "react";
import { ShieldCheck, ExternalLink, FileText } from "lucide-react";
import { ProvenancePill, QualityBadge } from "@/components/ui/Badge";

interface EvidenceItem {
  id: string;
  source_type: string;
  title: string;
  url: string | null;
  snippet: string;
  published_at?: string | null;
  confidence_score?: number;
  quality_status?: string;
}

export function EvidenceDrawer({
  evidence,
  title = "Auditable Evidence Provenance",
}: {
  evidence: EvidenceItem[];
  title?: string;
}) {
  return (
    <div className="atlas-panel p-4">
      <div className="mb-3 flex items-center justify-between border-b border-atlas-border pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-atlas-teal" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
            {title}
          </h3>
        </div>
        <span className="font-mono text-[11px] text-atlas-muted">
          {evidence.length} source{evidence.length === 1 ? "" : "s"}
        </span>
      </div>

      {evidence.length === 0 ? (
        <div className="py-6 text-center text-xs text-atlas-muted">
          Insufficient publicly verified data.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          {evidence.map((ev) => (
            <div
              key={ev.id}
              className="rounded border border-atlas-border bg-atlas-bg/60 p-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-atlas-teal" />
                  <span className="font-mono text-[11px] font-semibold text-atlas-teal">
                    [{ev.id}]
                  </span>
                  <ProvenancePill source={ev.source_type} />
                </div>
                <div className="flex items-center gap-2">
                  {ev.confidence_score !== undefined && (
                    <span className="font-mono text-[10px] text-atlas-muted">
                      Conf: {(ev.confidence_score * 100).toFixed(0)}%
                    </span>
                  )}
                  <QualityBadge status={ev.quality_status || "verified"} />
                </div>
              </div>
              <div className="mt-1.5 font-medium text-atlas-text">{ev.title}</div>
              <p className="mt-1 text-atlas-muted leading-relaxed">{ev.snippet}</p>
              {ev.url && (
                <a
                  href={ev.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-atlas-blue hover:underline"
                >
                  Inspect External Artifact <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
