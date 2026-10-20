"use client";

import React, { useState } from "react";
import {
  FileText,
  Search,
  ExternalLink,
  Sparkles,
  Filter,
} from "lucide-react";
import { useApiResource } from "@/hooks/useAtlasData";
import { Paper } from "@/types/atlas";
import { QualityBadge, ProvenancePill } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api";

interface PapersPayload {
  total: number;
  items: Paper[];
}

export default function PapersExplorerPage() {
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [minCitations, setMinCitations] = useState<number>(0);
  const [yearFrom, setYearFrom] = useState<string>("");
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (sectorFilter) params.set("sector_id", sectorFilter);
  if (sourceFilter) params.set("source", sourceFilter);
  if (minCitations > 0) params.set("min_citations", String(minCitations));
  if (yearFrom) params.set("year_from", yearFrom);

  const queryPath = `/api/v1/papers?${params.toString()}`;
  const { data, loading, error } = useApiResource<PapersPayload>(queryPath, [
    queryPath,
  ]);

  const handleSummarize = async (paperId: string) => {
    setSummarizingId(paperId);
    try {
      const res = await apiFetch<{ paper_id: string; ai_summary: string }>(
        `/api/v1/papers/${paperId}/summarize`,
        { method: "POST" }
      );
      setSummaries((prev) => ({ ...prev, [paperId]: res.ai_summary }));
    } catch (err) {
      setSummaries((prev) => ({
        ...prev,
        [paperId]: `Summary failed: ${err instanceof Error ? err.message : String(err)}`,
      }));
    } finally {
      setSummarizingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="atlas-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-atlas-teal" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-atlas-teal">
              Normalized Research Corpus • OpenAlex + arXiv
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-atlas-text">
            Publications & Preprints Explorer
          </h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Deduplicated by DOI, arXiv ID, OpenAlex ID, and RapidFuzz normalized
            title matching.
          </p>
        </div>
        <div className="font-mono text-xs text-atlas-muted">
          Matching Papers:{" "}
          <strong className="text-atlas-teal">{data?.total ?? 0}</strong>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="atlas-panel grid grid-cols-1 gap-3 p-4 md:grid-cols-5">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-atlas-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by title, author, institution, topic..."
            className="w-full rounded border border-atlas-border bg-atlas-bg py-1.5 pl-8 pr-3 text-xs text-atlas-text focus:border-atlas-teal focus:outline-none"
          />
        </div>

        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="rounded border border-atlas-border bg-atlas-bg px-2.5 py-1.5 font-mono text-xs text-atlas-text focus:border-atlas-teal focus:outline-none"
        >
          <option value="">All Sectors</option>
          <option value="sec-ai-infra">AI Infrastructure</option>
          <option value="sec-robotics">Robotics & Autonomy</option>
          <option value="sec-energy-storage">Energy Storage & Batteries</option>
          <option value="sec-semiconductors">Semiconductors</option>
          <option value="sec-biotech">Biotechnology</option>
          <option value="sec-quantum">Quantum Computing</option>
          <option value="sec-fusion">Nuclear & Fusion</option>
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded border border-atlas-border bg-atlas-bg px-2.5 py-1.5 font-mono text-xs text-atlas-text focus:border-atlas-teal focus:outline-none"
        >
          <option value="">All Sources</option>
          <option value="openalex">OpenAlex</option>
          <option value="arxiv">arXiv</option>
        </select>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-atlas-muted" />
          <input
            type="number"
            min={0}
            value={minCitations}
            onChange={(e) => setMinCitations(Number(e.target.value) || 0)}
            placeholder="Min Citations"
            className="w-1/2 rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 font-mono text-xs text-atlas-text"
          />
          <input
            type="number"
            min={2018}
            max={2026}
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
            placeholder="From Year"
            className="w-1/2 rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 font-mono text-xs text-atlas-text"
          />
        </div>
      </div>

      {loading && !data ? (
        <div className="atlas-panel p-6 font-mono text-xs text-atlas-muted">
          Querying publications corpus...
        </div>
      ) : error || !data ? (
        <div className="atlas-panel p-6 text-xs text-rose-400">
          Failed to query papers: {error}
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((paper) => {
            const summaryText = summaries[paper.id] || paper.ai_summary;
            return (
              <div key={paper.id} className="atlas-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-atlas-teal">
                      {paper.publication_date}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                      {paper.journal_or_venue}
                    </span>
                    <ProvenancePill source={paper.source} />
                    {paper.doi && (
                      <span className="font-mono text-[10px] text-atlas-muted">
                        DOI: {paper.doi}
                      </span>
                    )}
                    {paper.arxiv_id && (
                      <span className="font-mono text-[10px] text-atlas-muted">
                        arXiv:{paper.arxiv_id}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-atlas-blue/15 px-2 py-0.5 font-mono text-xs font-bold text-atlas-blue">
                      Citations: {paper.citations_count.toLocaleString()}
                    </span>
                    <QualityBadge status={paper.quality_status} />
                  </div>
                </div>

                <h2 className="mt-2 text-sm font-bold text-atlas-text">
                  {paper.title}
                </h2>

                <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-atlas-muted">
                  <span>
                    <strong>Authors:</strong>{" "}
                    {paper.authors_list.length > 0
                      ? paper.authors_list.join(", ")
                      : "Listed in OpenAlex work record"}
                  </span>
                  {paper.institutions_list.length > 0 && (
                    <span>
                      <strong>Institutions:</strong>{" "}
                      {paper.institutions_list.join(", ")}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  {paper.abstract}
                </p>

                {summaryText && (
                  <div className="mt-3 rounded border border-atlas-teal/30 bg-atlas-teal/10 p-3 text-xs text-slate-200">
                    <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase text-atlas-teal">
                      <Sparkles className="h-3 w-3" /> Evidence-Grounded Technical
                      Synthesis
                    </div>
                    {summaryText}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-atlas-border pt-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {paper.topics.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-atlas-border bg-atlas-bg px-2 py-0.5 font-mono text-[10px] text-atlas-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => void handleSummarize(paper.id)}
                      disabled={summarizingId === paper.id}
                      className="inline-flex items-center gap-1 rounded border border-atlas-teal/40 bg-atlas-teal/15 px-2.5 py-1 font-mono text-[11px] text-atlas-teal hover:bg-atlas-teal/25 disabled:opacity-50"
                    >
                      <Sparkles className="h-3 w-3" />
                      {summarizingId === paper.id
                        ? "Synthesizing..."
                        : summaryText
                          ? "Refresh Summary"
                          : "On-Demand Technical Summary"}
                    </button>

                    {(paper.open_access_url || paper.publisher_url) && (
                      <a
                        href={paper.open_access_url || paper.publisher_url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-atlas-blue hover:underline"
                      >
                        Source PDF / Record <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
