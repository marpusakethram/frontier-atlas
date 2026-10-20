"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  Play,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Clock,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { EvidenceDrawer } from "@/components/research/EvidenceDrawer";

interface AgentWorkflowResult {
  run_id: string;
  question: string;
  sector_id: string | null;
  status: string;
  stage_timeline: Array<{
    stage: string;
    status: string;
    timestamp: string;
    detail: string;
  }>;
  plan: {
    sub_questions: string[];
    required_sources: string[];
    evaluation_criteria: string[];
  };
  evidence_bundle: Array<{
    id: string;
    source_type: string;
    title: string;
    url: string | null;
    snippet: string;
    confidence_score: number;
    quality_status: string;
  }>;
  claims: Array<{
    claim_text: string;
    evidence_ids: string[];
    confidence: string;
    claim_status: string;
  }>;
  report: {
    executive_answer: string;
    key_findings: string[];
    contradictions_and_risks: string[];
    open_questions: string[];
    recommended_diligence: string[];
  };
  gemini_metadata: {
    used_gemini: boolean;
    model: string;
    fallback_reason: string | null;
  };
}

interface AgentRunSummary {
  id: string;
  question: string;
  sector_id: string | null;
  status: string;
  model_used: string;
  used_deterministic_fallback: boolean;
  started_at: string;
}

export default function ResearchAgentWorkspacePage() {
  const [question, setQuestion] = useState(
    "What empirical evidence supports humanoid robotic manipulation reaching <$10/hr warehouse task parity, and what are the primary failure modes?"
  );
  const [sectorId, setSectorId] = useState("sec-robotics");
  const [depth, setDepth] = useState("institutional");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentWorkflowResult | null>(null);
  const [history, setHistory] = useState<AgentRunSummary[]>([]);

  const loadHistory = async () => {
    const runs = await apiFetch<AgentRunSummary[]>("/api/v1/agent/runs");
    setHistory(runs);
  };

  useEffect(() => {
    void loadHistory();
    void handleExecuteQuery();
  }, []);

  const handleExecuteQuery = async () => {
    setRunning(true);
    try {
      const res = await apiFetch<AgentWorkflowResult>("/api/v1/agent/query", {
        method: "POST",
        body: JSON.stringify({
          question,
          sector_id: sectorId || null,
          depth,
          date_range: "2021-2026",
        }),
      });
      setResult(res);
      await loadHistory();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="atlas-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-atlas-teal" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-atlas-teal">
              Phase 9 & 12.10 • Controlled 5-Stage Research Agent System
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-atlas-text">
            Evidence-Grounded Research Agent Workspace
          </h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Workflow: Query Planner → Hybrid Evidence Retriever → Technical
            Analyst → Skeptical Verifier → Report Synthesizer. Unverified claims
            are rejected.
          </p>
        </div>

        {result && (
          <div className="rounded border border-atlas-border bg-atlas-bg px-3 py-2 font-mono text-xs">
            <div className="text-[10px] uppercase text-atlas-muted">
              Inference Provenance
            </div>
            <div className="font-semibold text-atlas-teal">
              Model: {result.gemini_metadata.model}
            </div>
          </div>
        )}
      </div>

      {/* Query Input & Controls */}
      <div className="atlas-panel space-y-3 p-4">
        <label className="block font-mono text-[11px] font-semibold uppercase text-atlas-muted">
          Deep-Tech Diligence Question
        </label>
        <textarea
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full rounded border border-atlas-border bg-atlas-bg p-3 text-xs text-atlas-text focus:border-atlas-teal focus:outline-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
              className="rounded border border-atlas-border bg-atlas-bg px-2.5 py-1.5 font-mono text-xs text-atlas-text"
            >
              <option value="sec-robotics">Robotics & Autonomous Systems</option>
              <option value="sec-ai-infra">AI Infrastructure</option>
              <option value="sec-energy-storage">
                Energy Storage & Batteries
              </option>
              <option value="">All Sectors</option>
            </select>

            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              className="rounded border border-atlas-border bg-atlas-bg px-2.5 py-1.5 font-mono text-xs text-atlas-text"
            >
              <option value="institutional">
                Depth: Institutional IC Diligence
              </option>
              <option value="rapid">Depth: Rapid Signal Triage</option>
            </select>
          </div>

          <button
            onClick={() => void handleExecuteQuery()}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded border border-atlas-teal/50 bg-atlas-teal/20 px-4 py-2 font-mono text-xs font-semibold text-atlas-teal hover:bg-atlas-teal/30 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            {running
              ? "Executing 5-Stage Pipeline..."
              : "Run Controlled Research Workflow"}
          </button>
        </div>
      </div>

      {result && (
        <>
          {/* 5-Stage Workflow Progress Timeline */}
          <div className="atlas-panel p-4">
            <h2 className="mb-3 border-b border-atlas-border pb-2 text-xs font-semibold uppercase tracking-wider text-atlas-text">
              Deterministic 5-Stage Agent Execution Trace
            </h2>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-5">
              {result.stage_timeline.map((st, idx) => (
                <div
                  key={st.stage}
                  className="rounded border border-atlas-teal/30 bg-atlas-bg/70 p-3 text-xs"
                >
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="font-bold text-atlas-teal">
                      STAGE {idx + 1}: {st.stage.toUpperCase()}
                    </span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-300">
                    {st.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Split-Screen: Left Synthesized Report & Claims | Right Retrieved Evidence & Run History */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-7">
              <div className="atlas-panel space-y-4 p-5">
                <div className="border-b border-atlas-border pb-3">
                  <span className="font-mono text-[10px] uppercase text-atlas-teal">
                    Stage 5 Output • Sourced Investment Brief
                  </span>
                  <h2 className="mt-1 text-base font-bold text-atlas-text">
                    Executive Synthesis
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-200">
                    {result.report.executive_answer}
                  </p>
                </div>

                <div>
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> Key Empirical
                    Findings
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
                    {result.report.key_findings.map((f) => (
                      <li
                        key={f}
                        className="rounded border border-atlas-border bg-atlas-bg/50 p-2.5"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" /> Contradictions &
                      Risks
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
                      {result.report.contradictions_and_risks.map((c) => (
                        <li
                          key={c}
                          className="rounded border border-atlas-border bg-atlas-bg/50 p-2"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-atlas-blue">
                      <HelpCircle className="h-3.5 w-3.5" /> Open Diligence
                      Questions
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
                      {result.report.open_questions.map((oq) => (
                        <li
                          key={oq}
                          className="rounded border border-atlas-border bg-atlas-bg/50 p-2"
                        >
                          {oq}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Stage 4 Skeptical Verifier Claims Ledger */}
              <div className="atlas-panel p-4">
                <h3 className="mb-3 border-b border-atlas-border pb-2 text-xs font-semibold uppercase tracking-wider text-atlas-text">
                  Stage 4 Skeptical Verifier — Claim-to-Evidence Audit
                </h3>
                <div className="space-y-2.5">
                  {result.claims.map((cl) => (
                    <div
                      key={cl.claim_text}
                      className="rounded border border-atlas-border bg-atlas-bg/60 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="text-emerald-400 font-semibold uppercase">
                          Status: {cl.claim_status} • Confidence:{" "}
                          {cl.confidence}
                        </span>
                        <span className="text-atlas-teal">
                          Evidence IDs: [{cl.evidence_ids.join(", ")}]
                        </span>
                      </div>
                      <p className="mt-1.5 text-slate-200">{cl.claim_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5 lg:col-span-5">
              <EvidenceDrawer
                evidence={result.evidence_bundle}
                title="Stage 2 Retrieved Evidence Bundle"
              />

              <div className="atlas-panel p-4">
                <div className="mb-2.5 flex items-center gap-1.5 border-b border-atlas-border pb-2 text-xs font-semibold uppercase tracking-wider text-atlas-text">
                  <Clock className="h-3.5 w-3.5 text-atlas-muted" /> Recent
                  Agent Run History
                </div>
                <div className="space-y-2 max-h-[220px] overflow-y-auto text-xs">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="rounded border border-atlas-border bg-atlas-bg/50 p-2.5"
                    >
                      <div className="truncate font-medium text-atlas-text">
                        {h.question}
                      </div>
                      <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-atlas-muted">
                        <span>{h.model_used}</span>
                        <span>{h.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
