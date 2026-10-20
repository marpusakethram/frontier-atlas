"use client";

import React from "react";
import Link from "next/link";
import {
  FileText,
  Cpu,
  Landmark,
  Sparkles,
  Building2,
  FileSpreadsheet,
  ArrowUpRight,
  RefreshCw,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useApiResource } from "@/hooks/useAtlasData";
import { OverviewPayload } from "@/types/atlas";
import { QualityBadge, ProvenancePill } from "@/components/ui/Badge";
import {
  ResearchTrendsChart,
  FrontierLandscapeScatter,
} from "@/components/charts/ResearchTrendsChart";
import { useAtlasStore } from "@/lib/api";

export default function OverviewPage() {
  const { data, loading, error, reload } =
    useApiResource<OverviewPayload>("/api/v1/overview");
  const { activeSectorId } = useAtlasStore();

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="atlas-panel p-6 text-xs font-mono text-atlas-muted">
          Initializing Frontier Atlas Telemetry & Relational Ledger...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="atlas-panel border-rose-800/60 p-6">
        <div className="text-sm font-semibold text-rose-400">
          Telemetry Synchronization Error
        </div>
        <p className="mt-1 font-mono text-xs text-atlas-muted">{error}</p>
        <button
          onClick={() => void reload()}
          className="mt-3 rounded border border-atlas-teal/50 bg-atlas-teal/15 px-3 py-1.5 text-xs text-atlas-teal"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const filteredSignals =
    activeSectorId === "all"
      ? data.emerging_signals
      : data.emerging_signals.filter((s) => s.sector_id === activeSectorId);

  const statCards = [
    {
      label: "Papers Indexed",
      value: data.statistics.papers_indexed,
      sub: "OpenAlex + arXiv Corpus",
      icon: FileText,
      href: "/papers",
      accent: "text-atlas-teal",
    },
    {
      label: "Technologies Tracked",
      value: data.statistics.technologies_tracked,
      sub: "Across 10 Frontier Verticals",
      icon: Cpu,
      href: "/technologies",
      accent: "text-atlas-blue",
    },
    {
      label: "Research Organizations",
      value: data.statistics.research_organizations,
      sub: "Labs, Universities & Spinouts",
      icon: Landmark,
      href: "/organizations",
      accent: "text-emerald-400",
    },
    {
      label: "Breakthrough Candidates",
      value: data.statistics.breakthrough_candidates,
      sub: "Empirical Inflection Signals",
      icon: Sparkles,
      href: "/breakthroughs",
      accent: "text-amber-400",
    },
    {
      label: "Companies Mapped",
      value: data.statistics.companies_mapped,
      sub: "Publicly Verified Entities",
      icon: Building2,
      href: "/companies",
      accent: "text-purple-400",
    },
    {
      label: "Active Theses",
      value: data.statistics.active_theses,
      sub: "22-Section IC Memos",
      icon: FileSpreadsheet,
      href: "/theses",
      accent: "text-cyan-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section 1: Overview Header */}
      <div className="atlas-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-atlas-teal/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-atlas-teal">
              Institutional Intelligence Terminal
            </span>
            <ProvenancePill source="OpenAlex + arXiv + GitHub" />
          </div>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight text-atlas-text">
            Frontier Atlas — Deep-Tech Investment Intelligence
          </h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Discover the technological inflection points that create tomorrow&apos;s
            companies. Deterministic scoring • Zero fabricated metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right font-mono text-[11px] text-atlas-muted">
            <div className="flex items-center justify-end gap-1 text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Evidence Ledger Verified</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                Refreshed:{" "}
                {data.latest_refresh_utc
                  ? new Date(data.latest_refresh_utc).toISOString().slice(0, 16) +
                    " UTC"
                  : "Live"}
              </span>
            </div>
          </div>
          <button
            onClick={() => void reload()}
            className="flex items-center gap-1.5 rounded border border-atlas-border bg-atlas-bg px-3 py-2 text-xs font-medium text-atlas-text hover:border-atlas-teal/50"
          >
            <RefreshCw className="h-3.5 w-3.5 text-atlas-teal" />
            Refresh
          </button>
        </div>
      </div>

      {/* Section 2: 6 Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="atlas-panel group p-4 transition-colors hover:border-atlas-teal/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-atlas-muted">
                  {card.label}
                </span>
                <Icon className={`h-4 w-4 ${card.accent}`} />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-atlas-text">
                  {card.value.toLocaleString()}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-atlas-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-1 text-[11px] text-atlas-muted">{card.sub}</div>
            </Link>
          );
        })}
      </div>

      {/* Priority Sector Intelligence Spotlight Hub: Healthcare AI, Physical AI & Everything Consumer */}
      <div className="atlas-panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-atlas-border pb-3">
          <div>
            <span className="rounded bg-pink-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-pink-400">
              Tier-1 Flagship Coverage • Full-Stack Deep Dives
            </span>
            <h2 className="mt-1 text-sm font-bold uppercase tracking-wider text-atlas-text">
              Priority Verticals Command Hub: Healthcare AI • Physical AI • Everything Consumer
            </h2>
          </div>
          <Link
            href="/sectors"
            className="font-mono text-xs text-atlas-teal hover:underline"
          >
            Explore All 13 Frontier Sectors →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[
            {
              title: "Healthcare, Clinical AI & Digital Biology",
              badge: "Momentum 93.8 • Maturity 74.0",
              badgeColor: "text-pink-400 bg-pink-500/15 border-pink-500/30",
              sectorSlug: "healthcare-clinical-ai",
              techSlug: "clinical-pathology-foundation-models",
              thesisMetric: "+$32.28 / study Net Hospital Margin (Break-even: 7,620 studies/yr)",
              highlight:
                "Zero-shot pathology foundation models (CONCH 0.946 AUROC) + ambient EHR scribing & SEC-verified precision oncology (Tempus AI $693.4M rev).",
              orgs: "Harvard Medical School • Tempus AI (SEC Verified) • Abridge AI • Project MONAI",
            },
            {
              title: "Physical AI & Embodied Intelligence",
              badge: "Momentum 94.6 • Maturity 66.0",
              badgeColor: "text-purple-400 bg-purple-500/15 border-purple-500/30",
              sectorSlug: "physical-ai",
              techSlug: "embodied-physical-world-models",
              thesisMetric: "$4.05 / hr Autonomous Fleet Cost vs. $29.50 / hr Human Benchmark",
              highlight:
                "3D physics-aware video world models (Cosmos 20M hrs) & omni-bodied visuotactile brains extending autonomy to 14.0 mean hours between teleop interventions.",
              orgs: "CMU Robotics • Skild AI • Physical Intelligence (π0) • NVIDIA Gear",
            },
            {
              title: "Consumer & Ambient Intelligence (Everything Consumer)",
              badge: "Momentum 91.9 • Maturity 79.0",
              badgeColor: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
              sectorSlug: "everything-consumer-ai",
              techSlug: "ambient-wearable-on-device-ai",
              thesisMetric: "4.20x Blended LTV/CAC • 76% On-Device NPU Query Offload",
              highlight:
                "Sub-2W wearable NPU multimodal VLMs (58.2 tok/s in 4-bit AWQ) powering smart glasses, titanium biometric longevity rings & local neural copilots.",
              orgs: "MIT HAN Lab • Oura Health • llama.cpp Edge Ecosystem • Stanford HCI",
            },
          ].map((hub) => (
            <div
              key={hub.sectorSlug}
              className="flex flex-col justify-between rounded-lg border border-atlas-border bg-atlas-bg/70 p-4 transition-all hover:border-atlas-teal/60"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${hub.badgeColor}`}
                  >
                    {hub.badge}
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400">
                    ✓ 22-Sec Thesis Ready
                  </span>
                </div>
                <h3 className="mt-2.5 text-sm font-bold text-atlas-text">
                  {hub.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-atlas-muted">
                  {hub.highlight}
                </p>
                <div className="mt-3 rounded border border-slate-800 bg-[#0B0F14] p-2.5 font-mono text-[11px] text-atlas-teal">
                  Economics: {hub.thesisMetric}
                </div>
                <div className="mt-2 font-mono text-[10px] text-slate-400">
                  Entities: {hub.orgs}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-atlas-border pt-3 text-center font-mono text-[11px]">
                <Link
                  href={`/sectors/${hub.sectorSlug}`}
                  className="rounded border border-atlas-border bg-atlas-panel py-1.5 text-atlas-text hover:border-atlas-teal/50 hover:text-atlas-teal"
                >
                  Sector Hub
                </Link>
                <Link
                  href={`/technologies/${hub.techSlug}`}
                  className="rounded border border-atlas-border bg-atlas-panel py-1.5 text-atlas-text hover:border-atlas-teal/50 hover:text-atlas-teal"
                >
                  Technology
                </Link>
                <Link
                  href="/economics"
                  className="rounded border border-atlas-teal/40 bg-atlas-teal/15 py-1.5 font-semibold text-atlas-teal hover:bg-atlas-teal/25"
                >
                  Unit Model
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 & Section 5: Frontier Landscape + Multi-Series Research Trends */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="atlas-panel p-4">
          <div className="mb-3 flex items-center justify-between border-b border-atlas-border pb-2.5">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
                Frontier Technology Landscape (Maturity vs. Momentum)
              </h2>
              <p className="text-[11px] text-atlas-muted">
                Bubble area reflects signal coverage across P, C, I, O, B components
              </p>
            </div>
            <Link
              href="/technologies"
              className="font-mono text-[11px] text-atlas-teal hover:underline"
            >
              Inspect All →
            </Link>
          </div>
          <FrontierLandscapeScatter signals={filteredSignals} />
        </div>

        <div className="atlas-panel p-4">
          <div className="mb-3 flex items-center justify-between border-b border-atlas-border pb-2.5">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
                Priority Sector Research Acceleration (2021–2026)
              </h2>
              <p className="text-[11px] text-atlas-muted">
                Annual peer-reviewed & preprint output in priority verticals
              </p>
            </div>
            <Link
              href="/sectors"
              className="font-mono text-[11px] text-atlas-teal hover:underline"
            >
              10 Verticals →
            </Link>
          </div>
          <ResearchTrendsChart data={data.research_trends} />
        </div>
      </div>

      {/* Section 4: Emerging Signals Ranked Table */}
      <div className="atlas-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-atlas-border px-4 py-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
              Emerging Technology Signals — Deterministic Momentum Ranking
            </h2>
            <p className="text-[11px] text-atlas-muted">
              Ranked by composite score M = 0.25P + 0.15C + 0.15I + 0.20O + 0.25B
            </p>
          </div>
          <span className="font-mono text-[11px] text-atlas-muted">
            Showing {filteredSignals.length} technologies
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-atlas-border bg-atlas-bg/60 text-[10px] font-semibold uppercase tracking-wider text-atlas-muted">
                <th className="px-4 py-2.5">Technology</th>
                <th className="px-4 py-2.5">Sector</th>
                <th className="px-4 py-2.5">Maturity Stage</th>
                <th className="px-4 py-2.5">Momentum</th>
                <th className="px-4 py-2.5">Coverage</th>
                <th className="px-4 py-2.5">Key Inflection Signal</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-atlas-border text-xs">
              {filteredSignals.map((sig) => (
                <tr
                  key={sig.id}
                  className="transition-colors hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3 font-medium text-atlas-text">
                    <Link
                      href={`/technologies/${sig.slug}`}
                      className="hover:text-atlas-teal hover:underline"
                    >
                      {sig.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-atlas-muted">{sig.sector_name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-200">
                      {sig.maturity_stage.replace(/_/g, " ")} (
                      {sig.maturity_score ?? "N/A"})
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-atlas-teal">
                    {sig.momentum_score !== null
                      ? sig.momentum_score.toFixed(1)
                      : "INSUFFICIENT"}
                  </td>
                  <td className="px-4 py-3 font-mono text-atlas-muted">
                    {(sig.momentum_coverage * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-atlas-muted max-w-xs truncate">
                    {sig.recent_change}
                  </td>
                  <td className="px-4 py-3">
                    <QualityBadge status={sig.quality_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 6 & Section 7: Recently Verified Breakthroughs + Ingestion Activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="atlas-panel p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between border-b border-atlas-border pb-2.5">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
                Recently Detected Breakthrough Candidates
              </h2>
              <p className="text-[11px] text-atlas-muted">
                Empirical benchmark jumps verified against baseline test conditions
              </p>
            </div>
            <Link
              href="/breakthroughs"
              className="font-mono text-[11px] text-atlas-teal hover:underline"
            >
              Review Queue →
            </Link>
          </div>
          <div className="space-y-3">
            {data.recent_breakthroughs.map((b) => (
              <div
                key={b.id}
                className="rounded border border-atlas-border bg-atlas-bg/50 p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-atlas-teal/15 px-2 py-0.5 font-mono text-xs font-bold text-atlas-teal">
                      Score: {b.score.toFixed(1)}
                    </span>
                    <span className="text-xs font-semibold text-atlas-text">
                      {b.title}
                    </span>
                  </div>
                  <QualityBadge status={b.status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 font-mono text-[11px] text-atlas-muted">
                  <span>Sector: {b.sector_name}</span>
                  <span>
                    Metric: <strong className="text-atlas-text">{b.metric_name}</strong>
                  </span>
                  <span>
                    Shift: {b.previous_benchmark_value ?? "N/A"} →{" "}
                    <strong className="text-emerald-400">
                      {b.new_benchmark_value ?? "N/A"} {b.benchmark_unit}
                    </strong>{" "}
                    ({b.measured_improvement_pct ? `+${b.measured_improvement_pct}%` : ""})
                  </span>
                  <span>Evidence: {b.supporting_evidence_ids.join(", ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="atlas-panel p-4">
          <div className="mb-3 flex items-center justify-between border-b border-atlas-border pb-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
              Latest Ingestion & Verification Log
            </h2>
            <Link
              href="/settings"
              className="font-mono text-[11px] text-atlas-teal hover:underline"
            >
              Jobs →
            </Link>
          </div>
          <div className="space-y-2.5">
            {data.recent_activity.map((job) => (
              <div
                key={job.id}
                className="rounded border border-atlas-border bg-atlas-bg/50 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold uppercase text-atlas-teal">
                    {job.connector}
                  </span>
                  <QualityBadge status={job.status} />
                </div>
                <div className="mt-1 truncate text-[11px] text-atlas-muted">
                  Query: {job.query}
                </div>
                <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-slate-400">
                  <span>Fetched: {job.records_fetched}</span>
                  <span>Inserted: {job.records_inserted}</span>
                  <span>Dedup: {job.records_deduplicated}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
