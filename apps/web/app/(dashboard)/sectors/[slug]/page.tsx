"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Cpu,
  FileText,
  Sparkles,
  Building2,
  Landmark,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useApiResource } from "@/hooks/useAtlasData";
import {
  Sector,
  Technology,
  Paper,
  Organization,
  Company,
  Breakthrough,
} from "@/types/atlas";
import { QualityBadge, ProvenancePill } from "@/components/ui/Badge";

interface SectorDetailPayload {
  sector: Sector;
  technologies: Technology[];
  papers: Paper[];
  organizations: Organization[];
  companies: Company[];
  breakthroughs: Breakthrough[];
}

export default function SectorDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "ai-infrastructure";
  const { data, loading, error } = useApiResource<SectorDetailPayload>(
    `/api/v1/sectors/${slug}`,
    [slug]
  );

  if (loading && !data) {
    return (
      <div className="atlas-panel p-6 font-mono text-xs text-atlas-muted">
        Loading vertical intelligence dossier for {slug}...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="atlas-panel p-6 text-xs text-rose-400">
        Vertical not found or error loading: {error}
      </div>
    );
  }

  const { sector, technologies, papers, organizations, companies, breakthroughs } =
    data;

  return (
    <div className="space-y-6">
      <div className="atlas-panel p-5">
        <Link
          href="/sectors"
          className="inline-flex items-center gap-1 font-mono text-xs text-atlas-muted hover:text-atlas-teal"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All 10 Frontier Verticals
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-atlas-teal/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-atlas-teal">
                Priority Tier {sector.priority_tier}
              </span>
              <QualityBadge status={sector.quality_status} />
              <ProvenancePill source="OpenAlex + arXiv" />
            </div>
            <h1 className="mt-2 text-2xl font-bold text-atlas-text">
              {sector.name}
            </h1>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-atlas-muted">
              {sector.description}
            </p>
          </div>
          <div className="rounded border border-atlas-border bg-atlas-bg p-3 text-right font-mono text-xs">
            <div className="text-[10px] uppercase text-atlas-muted">
              Maturity Assessment
            </div>
            <div className="mt-1 text-atlas-teal font-semibold">
              {sector.maturity_summary}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {sector.subcategories.map((sub) => (
            <span
              key={sub}
              className="rounded border border-atlas-border bg-atlas-bg px-2.5 py-1 font-mono text-[11px] text-slate-200"
            >
              {sub}
            </span>
          ))}
        </div>
      </div>

      {/* Historical Trends + Inflection Points & Barriers */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="atlas-panel p-4 lg:col-span-2">
          <h2 className="mb-3 border-b border-atlas-border pb-2 text-xs font-semibold uppercase tracking-wider text-atlas-text">
            Historical Publication & Citation Trajectory (2021–2026)
          </h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sector.historical_trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="year"
                  stroke="#64748B"
                  tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "JetBrains Mono" }}
                />
                <YAxis
                  stroke="#64748B"
                  tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "JetBrains Mono" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#1E293B",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="publications"
                  name="Annual Publications"
                  fill="#14B8A6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="atlas-panel space-y-4 p-4">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" /> Technical Inflection Points
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
              {sector.technical_inflection_points.map((pt) => (
                <li
                  key={pt}
                  className="rounded border border-atlas-border bg-atlas-bg/60 p-2"
                >
                  {pt}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" /> Commercialization Barriers
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
              {sector.commercialization_barriers.map((b) => (
                <li
                  key={b}
                  className="rounded border border-atlas-border bg-atlas-bg/60 p-2"
                >
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-atlas-teal">
              <Sparkles className="h-3.5 w-3.5" /> Venture Opportunities
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
              {sector.investment_opportunities.map((opp) => (
                <li
                  key={opp}
                  className="rounded border border-atlas-border bg-atlas-bg/60 p-2"
                >
                  {opp}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Related Technologies */}
      <div className="atlas-panel p-4">
        <div className="mb-3 flex items-center justify-between border-b border-atlas-border pb-2.5">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-atlas-teal" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
              Tracked Technologies in {sector.name} ({technologies.length})
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {technologies.map((tech) => (
            <Link
              key={tech.id}
              href={`/technologies/${tech.slug}`}
              className="rounded border border-atlas-border bg-atlas-bg/60 p-4 transition-colors hover:border-atlas-teal/50"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-atlas-text">
                  {tech.name}
                </span>
                <span className="rounded bg-atlas-teal/15 px-2 py-0.5 font-mono text-xs font-bold text-atlas-teal">
                  Momentum: {tech.momentum_score?.toFixed(1) ?? "N/A"}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-atlas-muted line-clamp-2">
                {tech.description}
              </p>
              <div className="mt-2.5 flex items-center justify-between font-mono text-[11px] text-slate-400">
                <span>Stage: {tech.maturity_stage.replace(/_/g, " ")}</span>
                <span>Readiness: {tech.commercialization_readiness}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Breakthroughs, Companies, Institutions & Papers */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="atlas-panel p-4">
          <div className="mb-3 flex items-center gap-2 border-b border-atlas-border pb-2.5">
            <Building2 className="h-4 w-4 text-purple-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
              Associated Companies & Research Institutions
            </h2>
          </div>
          <div className="space-y-2.5">
            {companies.map((c) => (
              <div
                key={c.id}
                className="rounded border border-atlas-border bg-atlas-bg/50 p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-atlas-text">{c.name}</span>
                  <span className="font-mono text-[11px] text-amber-300">
                    {c.funding_display}
                  </span>
                </div>
                <p className="mt-1 text-atlas-muted">{c.description}</p>
              </div>
            ))}
            {organizations.slice(0, 4).map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded border border-atlas-border bg-atlas-bg/30 p-2.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Landmark className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-atlas-text">{o.name}</span>
                </div>
                <span className="font-mono text-[11px] text-atlas-muted">
                  {o.organization_type} • {o.country}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="atlas-panel p-4">
          <div className="mb-3 flex items-center gap-2 border-b border-atlas-border pb-2.5">
            <FileText className="h-4 w-4 text-atlas-blue" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
              Key Publications & Preprints ({papers.length})
            </h2>
          </div>
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {papers.slice(0, 10).map((p) => (
              <div
                key={p.id}
                className="rounded border border-atlas-border bg-atlas-bg/50 p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-atlas-teal">
                    {p.publication_date} • {p.journal_or_venue}
                  </span>
                  <span className="font-mono text-[10px] text-atlas-muted">
                    Citations: {p.citations_count}
                  </span>
                </div>
                <div className="mt-1 font-medium text-atlas-text">{p.title}</div>
                <div className="mt-1 text-[11px] text-atlas-muted">
                  {p.authors_list.slice(0, 4).join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {breakthroughs.length > 0 && (
        <div className="atlas-panel p-4">
          <div className="mb-3 flex items-center gap-2 border-b border-atlas-border pb-2.5">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
              Verified Sector Breakthrough Candidates
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {breakthroughs.map((b) => (
              <div
                key={b.id}
                className="rounded border border-atlas-border bg-atlas-bg/60 p-3.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-atlas-text">{b.title}</span>
                  <span className="font-mono font-bold text-atlas-teal">
                    {b.score.toFixed(1)}/100
                  </span>
                </div>
                <p className="mt-1 text-atlas-muted">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
