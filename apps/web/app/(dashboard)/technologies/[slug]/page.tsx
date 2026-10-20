"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  Gauge,
  GitBranch,
  FileText,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useApiResource } from "@/hooks/useAtlasData";
import {
  Technology,
  TechnologyMetric,
  Paper,
  Breakthrough,
  InvestmentThesis,
} from "@/types/atlas";
import { QualityBadge, ProvenancePill } from "@/components/ui/Badge";
import { MomentumBreakdownCard } from "@/components/intelligence/MomentumBreakdownCard";

interface TechnologyDetailPayload {
  technology: Technology;
  metrics: TechnologyMetric[];
  trend_analytics: {
    growth_rate_pct: number;
    acceleration: number;
    rolling_z_score: number;
    cagr_pct: number;
    slope_per_period: number;
    r_squared: number;
    change_point_detected: boolean;
    change_point_index: number | null;
    summary: string;
  };
  papers: Paper[];
  repositories: Array<{
    id: string;
    full_name: string;
    html_url: string;
    stars_count: number;
    forks_count: number;
    contributors_count: number;
    growth: {
      status: string;
      stars_7d_delta: number | null;
      stars_30d_delta: number | null;
      stars_90d_delta: number | null;
      snapshot_count: number;
    };
  }>;
  breakthroughs: Breakthrough[];
  theses: InvestmentThesis[];
}

export default function TechnologyDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "humanoid-manipulation-whole-body-control";
  const { data, loading, error } = useApiResource<TechnologyDetailPayload>(
    `/api/v1/technologies/${slug}`,
    [slug]
  );

  if (loading && !data) {
    return (
      <div className="atlas-panel p-6 font-mono text-xs text-atlas-muted">
        Computing SciPy Trend Analytics & Momentum Breakdown for {slug}...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="atlas-panel p-6 text-xs text-rose-400">
        Error loading technology dossier: {error}
      </div>
    );
  }

  const {
    technology,
    metrics,
    trend_analytics,
    papers,
    repositories,
    breakthroughs,
    theses,
  } = data;

  return (
    <div className="space-y-6">
      <div className="atlas-panel p-5">
        <Link
          href="/technologies"
          className="inline-flex items-center gap-1 font-mono text-xs text-atlas-muted hover:text-atlas-teal"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All Tracked Technologies
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-300">
                {technology.technology_category}
              </span>
              <QualityBadge status={technology.quality_status} />
              <ProvenancePill source={technology.scoring_version} />
            </div>
            <h1 className="mt-2 text-2xl font-bold text-atlas-text">
              {technology.name}
            </h1>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-atlas-muted">
              {technology.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded border border-atlas-border bg-atlas-bg p-3 font-mono text-xs">
            <div>
              <div className="text-[10px] uppercase text-atlas-muted">
                Maturity Score
              </div>
              <div className="mt-0.5 text-lg font-bold text-atlas-blue">
                {technology.maturity_score ?? "N/A"}/100
              </div>
              <div className="text-[10px] text-slate-400">
                {technology.maturity_stage.replace(/_/g, " ")}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-atlas-muted">
                Momentum Score
              </div>
              <div className="mt-0.5 text-lg font-bold text-atlas-teal">
                {technology.momentum_score?.toFixed(1) ?? "INSUFFICIENT"}/100
              </div>
              <div className="text-[10px] text-slate-400">
                Coverage {(technology.momentum_coverage * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Momentum Breakdown + SciPy Trend Analytics */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MomentumBreakdownCard
          momentumScore={technology.momentum_score}
          coverage={technology.momentum_coverage}
          scoringVersion={technology.scoring_version}
          components={technology.momentum_components}
        />

        <div className="atlas-panel p-4">
          <div className="flex items-center justify-between border-b border-atlas-border pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-atlas-blue" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
                SciPy Statistical Trend & Change-Point Engine
              </h3>
            </div>
            <span className="font-mono text-[10px] text-emerald-400">
              R² = {trend_analytics.r_squared.toFixed(3)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 rounded border border-atlas-border bg-atlas-bg/60 p-2.5 font-mono text-xs">
            <div>
              <div className="text-[9px] uppercase text-atlas-muted">CAGR</div>
              <div className="font-bold text-atlas-teal">
                +{trend_analytics.cagr_pct}%
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase text-atlas-muted">
                Rolling Z
              </div>
              <div className="font-bold text-atlas-blue">
                {trend_analytics.rolling_z_score.toFixed(2)}σ
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase text-atlas-muted">
                Acceleration
              </div>
              <div className="font-bold text-emerald-400">
                {trend_analytics.acceleration > 0 ? "+" : ""}
                {trend_analytics.acceleration}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase text-atlas-muted">
                Change Point
              </div>
              <div className="font-bold text-amber-400">
                {trend_analytics.change_point_detected ? "DETECTED" : "Stable"}
              </div>
            </div>
          </div>

          <div className="mt-3 h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={technology.annual_publication_history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="year"
                  stroke="#64748B"
                  tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" }}
                />
                <YAxis
                  stroke="#64748B"
                  tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#1E293B",
                    fontSize: "11px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Publications"
                  stroke="#14B8A6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quantitative Benchmark Metrics */}
      <div className="atlas-panel p-4">
        <div className="mb-3 flex items-center gap-2 border-b border-atlas-border pb-2.5">
          <Gauge className="h-4 w-4 text-atlas-teal" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
            Normalized Quantitative Performance Metrics ({metrics.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-atlas-border bg-atlas-bg/60 text-[10px] font-semibold uppercase tracking-wider text-atlas-muted">
                <th className="px-3 py-2">Metric Name</th>
                <th className="px-3 py-2">Measured Value</th>
                <th className="px-3 py-2">Observed At</th>
                <th className="px-3 py-2">Method & Test Conditions</th>
                <th className="px-3 py-2">Source ID</th>
                <th className="px-3 py-2">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-atlas-border">
              {metrics.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/30">
                  <td className="px-3 py-2.5 font-medium text-atlas-text">
                    {m.metric_name}
                  </td>
                  <td className="px-3 py-2.5 font-mono font-bold text-atlas-teal">
                    {m.value} {m.unit}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-atlas-muted">
                    {m.observed_at}
                  </td>
                  <td className="px-3 py-2.5 text-atlas-muted">
                    {m.method} ({m.test_conditions})
                  </td>
                  <td className="px-3 py-2.5 font-mono text-atlas-blue">
                    [{m.source_id}]
                  </td>
                  <td className="px-3 py-2.5">
                    <QualityBadge status={m.verification_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GitHub Snapshot Growth + Competing Approaches & Economic Implications */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="atlas-panel p-4">
          <div className="mb-3 flex items-center gap-2 border-b border-atlas-border pb-2.5">
            <GitBranch className="h-4 w-4 text-cyan-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
              Open-Source Repository Snapshots (Strict Dated Deltas)
            </h2>
          </div>
          {repositories.length === 0 ? (
            <div className="py-6 text-center text-xs text-atlas-muted">
              No linked open-source repositories for this hardware/materials stack.
            </div>
          ) : (
            <div className="space-y-3">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="rounded border border-atlas-border bg-atlas-bg/60 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono font-semibold text-atlas-teal hover:underline"
                    >
                      {repo.full_name}
                    </a>
                    <span className="font-mono text-[11px] text-slate-300">
                      ★ {repo.stars_count.toLocaleString()} • Forks:{" "}
                      {repo.forks_count.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 rounded bg-slate-900/80 p-2 font-mono text-[11px]">
                    <div>
                      <span className="text-atlas-muted">7d Δ: </span>
                      <strong className="text-emerald-400">
                        {repo.growth.stars_7d_delta !== null
                          ? `+${repo.growth.stars_7d_delta}`
                          : "Insufficient history"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-atlas-muted">30d Δ: </span>
                      <strong className="text-emerald-400">
                        {repo.growth.stars_30d_delta !== null
                          ? `+${repo.growth.stars_30d_delta}`
                          : "Insufficient history"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-atlas-muted">90d Δ: </span>
                      <strong className="text-emerald-400">
                        {repo.growth.stars_90d_delta !== null
                          ? `+${repo.growth.stars_90d_delta}`
                          : "Insufficient history"}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="atlas-panel space-y-3 p-4">
          <h2 className="border-b border-atlas-border pb-2.5 text-xs font-semibold uppercase tracking-wider text-atlas-text">
            Commercialization Readiness, Barriers & Competing Approaches
          </h2>
          <div className="text-xs">
            <span className="font-semibold text-atlas-muted">
              Readiness Assessment:{" "}
            </span>
            <span className="text-atlas-text">
              {technology.commercialization_readiness}
            </span>
          </div>
          <div className="text-xs">
            <span className="font-semibold text-atlas-muted">
              Economic Implications:{" "}
            </span>
            <span className="text-atlas-text">
              {technology.economic_implications}
            </span>
          </div>
          <div className="text-xs">
            <span className="font-semibold text-atlas-muted">
              Competing Technologies:{" "}
            </span>
            <span className="text-slate-300">
              {technology.competing_technologies.join(" • ")}
            </span>
          </div>
          <div className="text-xs">
            <span className="font-semibold text-atlas-muted">
              Commercialization Barriers:{" "}
            </span>
            <span className="text-amber-300">
              {technology.commercialization_barriers.join(" • ")}
            </span>
          </div>
        </div>
      </div>

      {/* Linked Theses & Papers */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="atlas-panel p-4">
          <div className="mb-3 flex items-center gap-2 border-b border-atlas-border pb-2.5">
            <FileSpreadsheet className="h-4 w-4 text-atlas-teal" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
              Linked Investment Theses & Breakthroughs
            </h2>
          </div>
          <div className="space-y-2.5">
            {theses.map((th) => (
              <Link
                key={th.id}
                href="/theses"
                className="block rounded border border-atlas-border bg-atlas-bg/60 p-3 text-xs hover:border-atlas-teal/50"
              >
                <div className="font-semibold text-atlas-teal">{th.title}</div>
                <p className="mt-1 line-clamp-2 text-atlas-muted">
                  {th.executive_summary}
                </p>
              </Link>
            ))}
            {breakthroughs.map((b) => (
              <div
                key={b.id}
                className="rounded border border-atlas-border bg-atlas-bg/40 p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-semibold text-amber-300">
                    <Sparkles className="h-3.5 w-3.5" /> {b.title}
                  </span>
                  <span className="font-mono font-bold text-atlas-teal">
                    {b.score.toFixed(1)}
                  </span>
                </div>
                <p className="mt-1 text-atlas-muted">{b.economic_implications}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="atlas-panel p-4">
          <div className="mb-3 flex items-center gap-2 border-b border-atlas-border pb-2.5">
            <FileText className="h-4 w-4 text-atlas-blue" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
              Supporting Publications ({papers.length})
            </h2>
          </div>
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {papers.map((p) => (
              <div
                key={p.id}
                className="rounded border border-atlas-border bg-atlas-bg/50 p-3 text-xs"
              >
                <div className="flex items-center justify-between font-mono text-[10px] text-atlas-muted">
                  <span>
                    {p.publication_date} • {p.journal_or_venue}
                  </span>
                  <span>Citations: {p.citations_count}</span>
                </div>
                <div className="mt-1 font-medium text-atlas-text">{p.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
