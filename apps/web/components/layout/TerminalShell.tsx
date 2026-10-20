"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Activity,
  Bookmark,
  BookOpen,
  Bot,
  Building2,
  Calculator,
  Compass,
  Cpu,
  FileSpreadsheet,
  FlaskConical,
  GitFork,
  Layers,
  Menu,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
  Users,
  X,
} from "lucide-react";
import { apiFetch, useAtlasStore } from "@/lib/api";
import type { Sector } from "@/types/atlas";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: Compass },
  { href: "/sectors", label: "Sectors", icon: Layers },
  { href: "/technologies", label: "Technologies", icon: Cpu },
  { href: "/breakthroughs", label: "Breakthroughs", icon: Sparkles },
  { href: "/papers", label: "Research Papers", icon: BookOpen },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/companies", label: "Companies", icon: FlaskConical },
  { href: "/researchers", label: "Researchers", icon: Users },
  { href: "/knowledge-graph", label: "Knowledge Graph", icon: GitFork },
  { href: "/economics", label: "Economics Lab", icon: Calculator },
  { href: "/theses", label: "Investment Theses", icon: FileSpreadsheet },
  { href: "/research-agent", label: "Research Agent", icon: Bot },
  { href: "/watchlists", label: "Watchlists", icon: Bookmark },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TerminalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [queryClient] = useState(() => new QueryClient());
  const {
    activeSectorId,
    setActiveSectorId,
    dateRange,
    setDateRange,
    lightMode,
    toggleLightMode,
  } = useAtlasStore();

  const [sectors, setSectors] = useState<Sector[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Record<string, Array<Record<string, unknown>>> | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<{
    operating_mode?: string;
    table_counts?: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    apiFetch<Sector[]>("/api/v1/sectors")
      .then(setSectors)
      .catch(() => {});
    apiFetch<{ operating_mode?: string; table_counts?: Record<string, number> }>(
      "/api/v1/system/status"
    )
      .then(setSystemStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      apiFetch<Record<string, Array<Record<string, unknown>>>>(
        `/api/v1/search?q=${encodeURIComponent(searchQuery)}`
      )
        .then((res) => {
          setSearchResults(res);
          setSearchOpen(true);
        })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <QueryClientProvider client={queryClient}>
      <div
        className={`min-h-screen flex flex-col lg:flex-row ${
          lightMode
            ? "theme-light bg-slate-50 text-slate-900"
            : "bg-[#0B0F14] text-[#F1F5F9]"
        }`}
      >
        {/* Left Institutional Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800/80 bg-[#111820] flex flex-col transition-transform lg:translate-x-0 lg:static ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800/80">
            <Link href="/overview" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[#49A5F6]/15 border border-[#49A5F6]/40 flex items-center justify-center text-[#49A5F6] font-mono font-bold text-xs">
                FA
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight text-[#F1F5F9]">
                  FRONTIER ATLAS
                </div>
                <div className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider">
                  Deep-Tech Terminal
                </div>
              </div>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#17212B] text-[#49A5F6] border border-[#49A5F6]/30"
                      : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#17212B]/60"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-800/80 bg-[#0B0F14]/60 text-[11px] text-[#94A3B8] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono uppercase text-[10px]">Provenance Engine</span>
              <span className="inline-flex items-center gap-1 text-[#34D399] font-mono text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                VERIFIED
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {systemStatus?.operating_mode || "Deterministic + Free-Tier Gemini"}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              {systemStatus?.table_counts?.papers ?? 111} Papers •{" "}
              {systemStatus?.table_counts?.sectors ?? 13} Verticals
            </div>
          </div>
        </aside>

        {/* Main Content Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Navigation Bar */}
          <header className="h-14 border-b border-slate-800/80 bg-[#111820]/95 backdrop-blur sticky top-0 z-30 px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 max-w-xl relative">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-1.5 rounded bg-[#17212B] text-slate-300"
                aria-label="Open menu"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults && setSearchOpen(true)}
                  placeholder="Search technologies, papers (DOI / arXiv), companies, researchers..."
                  className="w-full bg-[#0B0F14] border border-slate-800 rounded-md pl-8 pr-8 py-1.5 text-xs text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none focus:border-[#49A5F6]"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSearchOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {searchOpen && searchResults && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-[#17212B] border border-slate-700 rounded-md shadow-2xl p-3 z-50 max-h-96 overflow-y-auto space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[#94A3B8] border-b border-slate-700/80 pb-1">
                      <span>Global Provenance Search</span>
                      <button
                        onClick={() => setSearchOpen(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        ESC
                      </button>
                    </div>
                    {(searchResults.technologies || []).map((t) => (
                      <div
                        key={String(t.id)}
                        onClick={() => {
                          setSearchOpen(false);
                          router.push(`/technologies/${t.slug || t.id}`);
                        }}
                        className="p-1.5 rounded hover:bg-[#111820] cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-medium text-[#F1F5F9]">
                          {String(t.name)}
                        </span>
                        <span className="text-[10px] font-mono text-[#49A5F6]">
                          Technology • Score {String(t.momentum_score ?? "N/A")}
                        </span>
                      </div>
                    ))}
                    {(searchResults.papers || []).map((p) => (
                      <div
                        key={String(p.id)}
                        onClick={() => {
                          setSearchOpen(false);
                          router.push(`/papers?q=${encodeURIComponent(String(p.title).slice(0, 32))}`);
                        }}
                        className="p-1.5 rounded hover:bg-[#111820] cursor-pointer flex items-center justify-between gap-2"
                      >
                        <span className="truncate text-slate-200">
                          {String(p.title)}
                        </span>
                        <span className="text-[10px] font-mono text-[#34D399] shrink-0">
                          Paper • {String(p.citations)} cites
                        </span>
                      </div>
                    ))}
                    {(searchResults.companies || []).map((c) => (
                      <div
                        key={String(c.id)}
                        onClick={() => {
                          setSearchOpen(false);
                          router.push("/companies");
                        }}
                        className="p-1.5 rounded hover:bg-[#111820] cursor-pointer flex items-center justify-between"
                      >
                        <span className="text-slate-200">{String(c.name)}</span>
                        <span className="text-[10px] font-mono text-amber-400">
                          Company • {String(c.country)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              {/* Active Sector Filter */}
              <select
                aria-label="Active sector filter"
                value={activeSectorId}
                onChange={(e) => setActiveSectorId(e.target.value)}
                className="bg-[#0B0F14] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#49A5F6]"
              >
                <option value="all">All 13 Frontier Verticals</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Date Range Selector */}
              <select
                aria-label="Date range selector"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="hidden md:block bg-[#0B0F14] border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-[#94A3B8]"
              >
                <option value="2021-2026">2021–2026 Cohort</option>
                <option value="2023-2026">2023–2026 Inflection</option>
                <option value="2024-2026">Last 24 Months</option>
              </select>

              {/* Jobs / Freshness Badge */}
              <Link
                href="/settings"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#17212B] border border-slate-800 text-[11px] font-mono text-[#34D399]"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Jobs: Healthy</span>
              </Link>

              {/* Launch Research Agent CTA */}
              <Link
                href="/research-agent"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#49A5F6] hover:bg-[#49A5F6]/90 text-[#0B0F14] font-semibold text-xs transition"
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Run Research</span>
              </Link>

              {/* Theme Toggle */}
              <button
                onClick={toggleLightMode}
                className="p-1.5 rounded bg-[#17212B] border border-slate-800 text-[#94A3B8] hover:text-white"
                title="Toggle Dark / Light Terminal Theme"
              >
                {lightMode ? (
                  <Moon className="w-3.5 h-3.5" />
                ) : (
                  <Sun className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </header>

          {/* Main Workspace Body */}
          <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
