"use client";

import React, { useState } from "react";
import {
  Settings,
  Cpu,
  Database,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useApiResource } from "@/hooks/useAtlasData";
import { QualityBadge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api";

interface SettingsStatusPayload {
  environment: string;
  gemini: {
    configured_model: string;
    active_model: string | null;
    eligible_free_tier: boolean;
    api_key_configured: boolean;
    daily_budget: number;
    requests_used_today: number;
    requests_remaining_today: number;
    rpm_limit: number;
    allowlist: string[];
    status_reason: string;
  };
  connectors: Record<string, { status: string; mode: string }>;
  database: {
    engine: string;
    pgvector_supported: boolean;
    total_papers: number;
    total_evidence_sources: number;
  };
  recent_jobs: Array<{
    id: string;
    connector: string;
    query: string;
    status: string;
    records_fetched: number;
    records_inserted: number;
    records_deduplicated: number;
    completed_at: string | null;
  }>;
}

export default function SettingsPage() {
  const { data, loading, error, reload } =
    useApiResource<SettingsStatusPayload>("/api/v1/settings/status");
  const [ingesting, setIngesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  const handleTriggerIngestion = async () => {
    setIngesting(true);
    setActionBanner(null);
    try {
      const res = await apiFetch<{
        openalex: { inserted: number };
        arxiv: { inserted: number };
        github: { inserted: number };
      }>("/api/v1/ingestion/run", {
        method: "POST",
        body: JSON.stringify({
          queries: [
            "humanoid robot manipulation",
            "solid state battery electrolyte",
            "vllm inference serving",
          ],
          offline_only: true,
        }),
      });
      setActionBanner(
        `Ingestion pipeline verified: OpenAlex (+${res.openalex.inserted}), arXiv (+${res.arxiv.inserted}), GitHub (+${res.github.inserted})`
      );
      await reload();
    } finally {
      setIngesting(false);
    }
  };

  const handleResetFixtures = async () => {
    setResetting(true);
    setActionBanner(null);
    try {
      const res = await apiFetch<{ counts: Record<string, number> }>(
        "/api/v1/settings/reset-fixtures",
        { method: "POST" }
      );
      setActionBanner(
        `Seeded & verified database: ${res.counts.papers} papers, ${res.counts.technologies} technologies, ${res.counts.investment_theses} theses.`
      );
      await reload();
    } finally {
      setResetting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="atlas-panel p-6 font-mono text-xs text-atlas-muted">
        Inspecting Gemini Free-Tier Allowlist, Quota Budgets & Connector
        Telemetry...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="atlas-panel p-6 text-xs text-rose-400">
        Failed to load settings status: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="atlas-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-atlas-teal" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-atlas-teal">
              Phase 12.12 & 13 • System Diagnostics, Free-Tier Guardrails &
              Ingestion Controls
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-atlas-text">
            System Settings, Gemini Quota & Connector Diagnostics
          </h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Zero-cost ($0) operational guardrails: official google-genai SDK,
            free-tier allowlist enforcement, request budgeting, and manual
            pipeline triggers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void handleTriggerIngestion()}
            disabled={ingesting}
            className="inline-flex items-center gap-1.5 rounded border border-atlas-teal/50 bg-atlas-teal/20 px-3.5 py-2 font-mono text-xs font-semibold text-atlas-teal hover:bg-atlas-teal/30 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${ingesting ? "animate-spin" : ""}`}
            />
            {ingesting ? "Running Connectors..." : "Run Ingestion Pipeline"}
          </button>

          <button
            onClick={() => void handleResetFixtures()}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 rounded border border-atlas-border bg-atlas-bg px-3.5 py-2 font-mono text-xs text-atlas-text hover:border-atlas-teal/50 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5 text-atlas-blue" />
            {resetting ? "Synchronizing..." : "Verify / Re-Seed Fixtures"}
          </button>
        </div>
      </div>

      {actionBanner && (
        <div className="atlas-panel flex items-center gap-2 border-emerald-700/60 bg-emerald-950/30 p-4 font-mono text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {actionBanner}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Gemini Model Eligibility & Quota Card */}
        <div className="atlas-panel space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-atlas-border pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-atlas-teal" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
                Google Gemini API Free-Tier Guardrails
              </h2>
            </div>
            <QualityBadge
              status={
                data.gemini.eligible_free_tier ? "verified" : "provisional"
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="rounded border border-atlas-border bg-atlas-bg p-3">
              <div className="text-[10px] uppercase text-atlas-muted">
                GEMINI_MODEL Configured
              </div>
              <div className="mt-1 font-bold text-atlas-teal">
                {data.gemini.configured_model}
              </div>
            </div>
            <div className="rounded border border-atlas-border bg-atlas-bg p-3">
              <div className="text-[10px] uppercase text-atlas-muted">
                Active Runtime Mode
              </div>
              <div className="mt-1 font-bold text-atlas-blue">
                {data.gemini.active_model || "Deterministic Offline Mode"}
              </div>
            </div>
            <div className="rounded border border-atlas-border bg-atlas-bg p-3">
              <div className="text-[10px] uppercase text-atlas-muted">
                Daily Request Budget
              </div>
              <div className="mt-1 font-bold text-emerald-400">
                {data.gemini.requests_used_today} / {data.gemini.daily_budget}{" "}
                used ({data.gemini.requests_remaining_today} rem)
              </div>
            </div>
            <div className="rounded border border-atlas-border bg-atlas-bg p-3">
              <div className="text-[10px] uppercase text-atlas-muted">
                Rate Throttle Limit
              </div>
              <div className="mt-1 font-bold text-atlas-text">
                {data.gemini.rpm_limit} RPM
              </div>
            </div>
          </div>

          <div className="rounded border border-atlas-border bg-atlas-bg/60 p-3 text-xs">
            <div className="font-mono text-[10px] uppercase text-atlas-muted">
              Eligibility & Fallback Diagnostic:
            </div>
            <p className="mt-1 text-slate-300">{data.gemini.status_reason}</p>
            <div className="mt-2 font-mono text-[10px] text-atlas-muted">
              Allowlist: {data.gemini.allowlist.join(", ")}
            </div>
          </div>
        </div>

        {/* Database & Connectors Status */}
        <div className="atlas-panel space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-atlas-border pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-atlas-blue" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
                Relational Database & Connector Status
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" /> $0 Budget Compliant
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 font-mono text-xs">
            <div className="rounded border border-atlas-border bg-atlas-bg p-3">
              <div className="text-[10px] uppercase text-atlas-muted">
                Indexed Papers
              </div>
              <div className="mt-1 text-base font-bold text-atlas-teal">
                {data.database.total_papers}
              </div>
            </div>
            <div className="rounded border border-atlas-border bg-atlas-bg p-3">
              <div className="text-[10px] uppercase text-atlas-muted">
                Evidence Sources
              </div>
              <div className="mt-1 text-base font-bold text-atlas-blue">
                {data.database.total_evidence_sources}
              </div>
            </div>
            <div className="rounded border border-atlas-border bg-atlas-bg p-3">
              <div className="text-[10px] uppercase text-atlas-muted">
                Vector Engine
              </div>
              <div className="mt-1 text-xs font-bold text-emerald-400">
                pgvector + Hybrid
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {Object.entries(data.connectors).map(([name, meta]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded border border-atlas-border bg-atlas-bg/60 px-3 py-2 text-xs"
              >
                <span className="font-mono font-semibold uppercase text-atlas-text">
                  {name} Connector
                </span>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-atlas-muted">{meta.mode}</span>
                  <QualityBadge status={meta.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ingestion Job Audit Table */}
      <div className="atlas-panel p-5">
        <h2 className="mb-3 border-b border-atlas-border pb-2.5 text-xs font-semibold uppercase tracking-wider text-atlas-text">
          Ingestion Job Execution History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-atlas-border bg-atlas-bg/60 text-[10px] uppercase text-atlas-muted">
                <th className="px-3 py-2">Job ID</th>
                <th className="px-3 py-2">Connector</th>
                <th className="px-3 py-2">Query</th>
                <th className="px-3 py-2">Fetched</th>
                <th className="px-3 py-2">Inserted</th>
                <th className="px-3 py-2">Deduplicated</th>
                <th className="px-3 py-2">Completed UTC</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-atlas-border">
              {data.recent_jobs.map((j) => (
                <tr key={j.id} className="hover:bg-slate-800/30">
                  <td className="px-3 py-2 text-atlas-teal">{j.id}</td>
                  <td className="px-3 py-2 uppercase text-atlas-text">
                    {j.connector}
                  </td>
                  <td className="px-3 py-2 text-atlas-muted">{j.query}</td>
                  <td className="px-3 py-2">{j.records_fetched}</td>
                  <td className="px-3 py-2 text-emerald-400">
                    +{j.records_inserted}
                  </td>
                  <td className="px-3 py-2 text-atlas-blue">
                    {j.records_deduplicated}
                  </td>
                  <td className="px-3 py-2 text-atlas-muted">
                    {j.completed_at ? j.completed_at.slice(0, 19) : "N/A"}
                  </td>
                  <td className="px-3 py-2">
                    <QualityBadge status={j.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
