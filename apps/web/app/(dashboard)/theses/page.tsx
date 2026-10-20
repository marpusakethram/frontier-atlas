"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  FileDown,
  ShieldAlert,
  Save,
  Plus,
  History,
  CheckCircle2,
} from "lucide-react";
import { InvestmentThesis } from "@/types/atlas";
import { QualityBadge } from "@/components/ui/Badge";
import { apiFetch, getApiBaseUrl } from "@/lib/api";

export default function ThesisStudioPage() {
  const [theses, setTheses] = useState<InvestmentThesis[]>([]);
  const [selected, setSelected] = useState<InvestmentThesis | null>(null);
  const [activeSectionKey, setActiveSectionKey] = useState<string>(
    "1_executive_summary"
  );
  const [sectionDraft, setSectionDraft] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadTheses = async () => {
    const list = await apiFetch<InvestmentThesis[]>("/api/v1/theses");
    setTheses(list);
    const firstThesis = list[0];
    if (firstThesis && !selected) {
      setSelected(firstThesis);
      setSectionDraft(
        firstThesis.sections_22["1_executive_summary"] ||
          firstThesis.executive_summary
      );
    }
  };

  useEffect(() => {
    void loadTheses();
  }, []);

  const handleSelectThesis = (th: InvestmentThesis) => {
    setSelected(th);
    const keys = Object.keys(th.sections_22);
    const firstKey = keys[0] || "1_executive_summary";
    setActiveSectionKey(firstKey);
    setSectionDraft(th.sections_22[firstKey] || "");
  };

  const handleSelectSection = (key: string) => {
    setActiveSectionKey(key);
    if (selected) {
      setSectionDraft(selected.sections_22[key] || "");
    }
  };

  const handleSaveSection = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updatedSections = {
        ...selected.sections_22,
        [activeSectionKey]: sectionDraft,
      };
      const updated = await apiFetch<InvestmentThesis>(
        `/api/v1/theses/${selected.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            sections_22: updatedSections,
            revision_summary: `Edited section ${activeSectionKey}`,
          }),
        }
      );
      setSelected(updated);
      setTheses((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setStatusMsg(
        `Saved revision v${updated.revision_history.length} at ${new Date().toISOString().slice(11, 19)} UTC`
      );
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDraft = async () => {
    const created = await apiFetch<InvestmentThesis>("/api/v1/theses", {
      method: "POST",
      body: JSON.stringify({
        title: `New Deep-Tech Investment Memo (${new Date().toISOString().slice(0, 10)})`,
        sector_id: "sec-ai-infra",
        technology_id: "tech-inference-serving",
        executive_summary:
          "Deterministic investment memo draft initialized with 22 institutional sections and falsification guardrails.",
      }),
    });
    setTheses((prev) => [created, ...prev]);
    handleSelectThesis(created);
  };

  const baseUrl = getApiBaseUrl();

  return (
    <div className="space-y-6">
      <div className="atlas-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-atlas-teal" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-atlas-teal">
              Phase 10 & 12.9 • 22-Section Institutional Investment Thesis Studio
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-atlas-text">
            Investment Thesis & Falsification Studio
          </h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Every thesis enforces 22 structured IC sections, explicit
            falsification thresholds (≥3 verifiable conditions), revision
            lineage, and Markdown/PDF export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void handleCreateDraft()}
            className="inline-flex items-center gap-1.5 rounded border border-atlas-teal/50 bg-atlas-teal/15 px-3 py-1.5 font-mono text-xs font-semibold text-atlas-teal hover:bg-atlas-teal/25"
          >
            <Plus className="h-3.5 w-3.5" /> New 22-Section Thesis Draft
          </button>

          {selected && (
            <>
              <a
                href={`${baseUrl}/api/v1/theses/${selected.id}/export/markdown`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded border border-atlas-border bg-atlas-bg px-3 py-1.5 font-mono text-xs text-atlas-text hover:border-atlas-teal/50"
              >
                <Download className="h-3.5 w-3.5 text-atlas-teal" /> Export .MD
              </a>
              <a
                href={`${baseUrl}/api/v1/theses/${selected.id}/export/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded border border-atlas-border bg-atlas-bg px-3 py-1.5 font-mono text-xs text-atlas-text hover:border-atlas-teal/50"
              >
                <FileDown className="h-3.5 w-3.5 text-atlas-blue" /> Export .PDF
              </a>
            </>
          )}
        </div>
      </div>

      {/* Thesis Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {theses.map((th) => (
          <button
            key={th.id}
            onClick={() => handleSelectThesis(th)}
            className={`rounded border px-3.5 py-2 text-left text-xs transition-colors ${
              selected?.id === th.id
                ? "border-atlas-teal bg-atlas-teal/15 text-atlas-text"
                : "border-atlas-border bg-atlas-panel text-atlas-muted hover:text-atlas-text"
            }`}
          >
            <div className="font-semibold">{th.title}</div>
            <div className="mt-0.5 font-mono text-[10px] text-atlas-teal">
              {th.id} • {Object.keys(th.sections_22).length} Sections •{" "}
              {th.falsification_conditions.length} Falsification Rules
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <>
          {/* 22-Section Studio Editor */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Left Column: 22 Sections Navigation */}
            <div className="atlas-panel p-3 lg:col-span-4">
              <div className="mb-2 border-b border-atlas-border pb-2 font-mono text-[11px] font-semibold uppercase text-atlas-muted">
                22 Mandatory IC Memo Sections
              </div>
              <div className="space-y-1 max-h-[440px] overflow-y-auto pr-1">
                {Object.keys(selected.sections_22).map((secKey) => (
                  <button
                    key={secKey}
                    onClick={() => handleSelectSection(secKey)}
                    className={`w-full rounded px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors ${
                      activeSectionKey === secKey
                        ? "bg-atlas-teal/20 font-semibold text-atlas-teal"
                        : "text-atlas-muted hover:bg-slate-800/60 hover:text-atlas-text"
                    }`}
                  >
                    {secKey.replace(/_/g, " ").toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Active Section Editor & Revision Log */}
            <div className="space-y-4 lg:col-span-8">
              <div className="atlas-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-atlas-border pb-3">
                  <div>
                    <span className="font-mono text-[10px] uppercase text-atlas-teal">
                      Editing Section
                    </span>
                    <h2 className="text-sm font-bold uppercase text-atlas-text">
                      {activeSectionKey.replace(/_/g, " ")}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <QualityBadge status={selected.status} />
                    <button
                      onClick={() => void handleSaveSection()}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded border border-atlas-teal/50 bg-atlas-teal/20 px-3 py-1.5 font-mono text-xs font-semibold text-atlas-teal hover:bg-atlas-teal/30 disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saving ? "Saving..." : "Save Revision"}
                    </button>
                  </div>
                </div>

                {statusMsg && (
                  <div className="mt-2.5 flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-950/40 px-3 py-1.5 font-mono text-xs text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {statusMsg}
                  </div>
                )}

                <textarea
                  rows={10}
                  value={sectionDraft}
                  onChange={(e) => setSectionDraft(e.target.value)}
                  className="mt-3 w-full rounded border border-atlas-border bg-atlas-bg p-3 font-sans text-xs leading-relaxed text-atlas-text focus:border-atlas-teal focus:outline-none"
                />

                <div className="mt-3 flex flex-wrap items-center justify-between font-mono text-[11px] text-atlas-muted">
                  <span>
                    Cited Evidence IDs:{" "}
                    <strong className="text-atlas-teal">
                      {selected.evidence_ids.join(", ")}
                    </strong>
                  </span>
                  <span>Updated: {selected.updated_at.slice(0, 19)} UTC</span>
                </div>
              </div>

              {/* Revision History */}
              <div className="atlas-panel p-4">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-atlas-text">
                  <History className="h-3.5 w-3.5 text-atlas-blue" /> Audit &
                  Revision History ({selected.revision_history.length})
                </div>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto font-mono text-[11px]">
                  {selected.revision_history.map((rev) => (
                    <div
                      key={`${rev.version}-${rev.timestamp}`}
                      className="flex items-center justify-between rounded border border-atlas-border bg-atlas-bg/50 px-3 py-1.5"
                    >
                      <span className="text-atlas-teal">
                        v{rev.version} • {rev.summary}
                      </span>
                      <span className="text-atlas-muted">
                        {rev.author} ({rev.timestamp.slice(0, 16)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 10.2 Falsification Engine Table */}
          <div className="atlas-panel p-5">
            <div className="mb-3 flex items-center justify-between border-b border-atlas-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
                    Phase 10.2 Falsification Engine — Disconfirming Thresholds &
                    Monitoring Triggers
                  </h2>
                  <p className="text-[11px] text-atlas-muted">
                    Explicit empirical conditions that would invalidate this
                    investment thesis
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs text-amber-400">
                {selected.falsification_conditions.length} Active Conditions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-atlas-border bg-atlas-bg/60 text-[10px] font-semibold uppercase tracking-wider text-atlas-muted">
                    <th className="px-3 py-2">Condition ID</th>
                    <th className="px-3 py-2">Core Thesis Claim</th>
                    <th className="px-3 py-2">Underlying Assumption</th>
                    <th className="px-3 py-2">Target Falsification Threshold</th>
                    <th className="px-3 py-2">Tracked Metric & Evidence</th>
                    <th className="px-3 py-2">Eval Date</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-atlas-border">
                  {selected.falsification_conditions.map((fc) => (
                    <tr key={fc.id} className="hover:bg-slate-800/30">
                      <td className="px-3 py-2.5 font-mono text-atlas-teal">
                        {fc.id}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-atlas-text">
                        {fc.claim}
                      </td>
                      <td className="px-3 py-2.5 text-atlas-muted">
                        {fc.assumption}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-amber-300">
                        {fc.target_threshold}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-300">
                        {fc.related_metric} ({fc.evidence})
                      </td>
                      <td className="px-3 py-2.5 font-mono text-atlas-muted">
                        {fc.evaluation_date}
                      </td>
                      <td className="px-3 py-2.5">
                        <QualityBadge status={fc.current_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
