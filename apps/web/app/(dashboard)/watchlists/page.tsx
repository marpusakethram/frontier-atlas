"use client";

import React, { useState } from "react";
import { Bookmark, Bell, Plus, CheckCircle2 } from "lucide-react";
import { useApiResource } from "@/hooks/useAtlasData";
import { apiFetch } from "@/lib/api";

interface WatchlistItemRecord {
  id?: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  label?: string;
  alert_threshold_note?: string;
  alert_threshold?: string;
}

interface WatchlistAlertRecord {
  id: string;
  watchlist_id?: string;
  severity: string;
  title: string;
  detail?: string;
  message?: string;
  source_id?: string | null;
  evidence_source_id?: string | null;
  triggered_at: string;
}

interface WatchlistRecord {
  id: string;
  name: string;
  owner_role: string;
  description: string;
  items: WatchlistItemRecord[];
  alerts?: WatchlistAlertRecord[];
  created_at: string;
}

export default function WatchlistsPage() {
  const { data: rawData, loading, error, reload } =
    useApiResource<WatchlistRecord[] | { watchlists: WatchlistRecord[]; alerts: WatchlistAlertRecord[] }>("/api/v1/watchlists");
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [newWatchlistDesc, setNewWatchlistDesc] = useState("");
  const [itemLabel, setItemLabel] = useState("");
  const [itemThreshold, setItemThreshold] = useState("");
  const [creating, setCreating] = useState(false);

  const watchlists: WatchlistRecord[] = Array.isArray(rawData)
    ? rawData
    : rawData?.watchlists || [];
  const alerts: WatchlistAlertRecord[] = Array.isArray(rawData)
    ? rawData.flatMap((w) => w.alerts || [])
    : rawData?.alerts || [];

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim() && !itemLabel.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/v1/watchlists", {
        method: "POST",
        body: JSON.stringify({
          watchlist_id: watchlists[0]?.id || "wl-frontier-inflections",
          entity_type: "technology",
          entity_id: "tech-clinical-foundation-models",
          entity_name: itemLabel || newWatchlistName,
          alert_threshold_note:
            itemThreshold || newWatchlistDesc || "Momentum delta > +5.0 or new replication",
        }),
      });
      setNewWatchlistName("");
      setNewWatchlistDesc("");
      setItemLabel("");
      setItemThreshold("");
      await reload();
    } finally {
      setCreating(false);
    }
  };

  if (loading && !rawData) {
    return (
      <div className="atlas-panel p-6 font-mono text-xs text-atlas-muted">
        Loading Partner IC Watchlists & Threshold Alerts...
      </div>
    );
  }

  if (error || !rawData) {
    return (
      <div className="atlas-panel p-6 text-xs text-rose-400">
        Error loading watchlists: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="atlas-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-atlas-teal" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-atlas-teal">
              Phase 12.11 • Continuous IC Signal Monitoring & Alerting
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-atlas-text">
            Partner IC Watchlists & Falsification Alerts
          </h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Track specific technologies, labs, companies, and empirical
            falsification thresholds across scheduled ingestion runs.
          </p>
        </div>
        <div className="font-mono text-xs text-atlas-muted">
          Active Watchlists:{" "}
          <strong className="text-atlas-teal">{watchlists.length}</strong>{" "}
          • Triggered Alerts:{" "}
          <strong className="text-amber-400">{alerts.length}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Active Watchlists & Add Form */}
        <div className="space-y-5 lg:col-span-7">
          {watchlists.map((wl) => (
            <div key={wl.id} className="atlas-panel p-5">
              <div className="flex items-center justify-between border-b border-atlas-border pb-3">
                <div>
                  <span className="rounded bg-atlas-teal/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-atlas-teal">
                    {wl.owner_role}
                  </span>
                  <h2 className="mt-1.5 text-base font-bold text-atlas-text">
                    {wl.name}
                  </h2>
                  <p className="text-xs text-atlas-muted">{wl.description}</p>
                </div>
                <span className="font-mono text-xs text-atlas-muted">
                  {wl.items.length} Monitored Entities
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {wl.items.map((it) => (
                  <div
                    key={`${it.id || it.entity_id}-${it.entity_name || it.label}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-atlas-border bg-atlas-bg/60 p-3 text-xs"
                  >
                    <div>
                      <span className="font-mono text-[10px] uppercase text-atlas-teal">
                        [{it.entity_type}]
                      </span>{" "}
                      <strong className="text-atlas-text">
                        {it.entity_name || it.label}
                      </strong>
                    </div>
                    <div className="font-mono text-[11px] text-amber-300">
                      Trigger: {it.alert_threshold_note || it.alert_threshold}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Create New Watchlist Form */}
          <form
            onSubmit={(e) => void handleCreateWatchlist(e)}
            className="atlas-panel space-y-3 p-5"
          >
            <h3 className="flex items-center gap-1.5 border-b border-atlas-border pb-2 text-xs font-semibold uppercase tracking-wider text-atlas-text">
              <Plus className="h-3.5 w-3.5 text-atlas-teal" /> Add Tracked IC
              Watchlist Signal
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                required
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                placeholder="Entity / Initiative Name (e.g., CONCH Pathology VLM)"
                className="rounded border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text"
              />
              <input
                type="text"
                value={newWatchlistDesc}
                onChange={(e) => setNewWatchlistDesc(e.target.value)}
                placeholder="Mandate / Description"
                className="rounded border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text"
              />
              <input
                type="text"
                value={itemLabel}
                onChange={(e) => setItemLabel(e.target.value)}
                placeholder="Tracked Entity Label (e.g., Skild AI Omni-Brain)"
                className="rounded border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text"
              />
              <input
                type="text"
                value={itemThreshold}
                onChange={(e) => setItemThreshold(e.target.value)}
                placeholder="Alert Threshold (e.g., MHBHI > 20h or FDA 510(k))"
                className="rounded border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded border border-atlas-teal/50 bg-atlas-teal/20 px-4 py-2 font-mono text-xs font-semibold text-atlas-teal hover:bg-atlas-teal/30"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Save Watchlist Signal
            </button>
          </form>
        </div>

        {/* Right: Alert Feed */}
        <div className="atlas-panel p-5 lg:col-span-5">
          <div className="mb-3 flex items-center gap-2 border-b border-atlas-border pb-3">
            <Bell className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
              Real-Time Threshold & Replication Alerts ({alerts.length})
            </h2>
          </div>

          <div className="space-y-3">
            {alerts.map((al) => (
              <div
                key={al.id}
                className="rounded border border-atlas-border bg-atlas-bg/60 p-3.5 text-xs"
              >
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span
                    className={`rounded px-1.5 py-0.5 font-bold uppercase ${
                      al.severity.toLowerCase() === "high"
                        ? "bg-amber-950 text-amber-400 border border-amber-700/50"
                        : "bg-slate-800 text-atlas-teal"
                    }`}
                  >
                    {al.severity} severity
                  </span>
                  <span className="text-atlas-muted">
                    {al.triggered_at.slice(0, 16)} UTC
                  </span>
                </div>
                <div className="mt-1.5 font-semibold text-atlas-text">
                  {al.title}
                </div>
                <p className="mt-1 text-slate-300">
                  {al.detail || al.message}
                </p>
                {(al.source_id || al.evidence_source_id) && (
                  <div className="mt-1.5 font-mono text-[10px] text-atlas-teal">
                    Evidence ID: [{al.source_id || al.evidence_source_id}]
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
