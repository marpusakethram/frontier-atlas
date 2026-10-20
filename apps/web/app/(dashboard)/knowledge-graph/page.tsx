"use client";

import React, { useState } from "react";
import {
  Network,
  Search,
  Maximize2,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { useApiResource } from "@/hooks/useAtlasData";
import {
  KnowledgeGraphCanvas,
  GraphNodeData,
  GraphEdgeData,
} from "@/components/graph/KnowledgeGraphCanvas";
import { apiFetch } from "@/lib/api";

interface GraphPayload {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  analytics_summary: {
    total_nodes: number;
    total_edges: number;
    communities_detected: number;
    top_centrality_nodes: Array<{
      id: string;
      label: string;
      pagerank: number;
      betweenness: number;
    }>;
  };
}

export default function KnowledgeGraphPage() {
  const [sectorFilter, setSectorFilter] = useState("");
  const [relFilter, setRelFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [expandedNeighbors, setExpandedNeighbors] = useState<string[]>([]);

  const params = new URLSearchParams();
  if (sectorFilter) params.set("sector_id", sectorFilter);
  if (relFilter) params.set("relationship_type", relFilter);

  const queryPath = `/api/v1/graph?${params.toString()}`;
  const { data, loading, error } = useApiResource<GraphPayload>(queryPath, [
    queryPath,
  ]);

  const handleExpandNode = async (nodeId: string) => {
    try {
      const res = await apiFetch<{
        center_node_id: string;
        nodes: GraphNodeData[];
        edges: GraphEdgeData[];
      }>(`/api/v1/graph/expand?node_id=${encodeURIComponent(nodeId)}`);
      setExpandedNeighbors(res.nodes.map((n) => `${n.label} (${n.entity_type})`));
    } catch {
      setExpandedNeighbors(["No additional 1-hop neighbors found"]);
    }
  };

  if (loading && !data) {
    return (
      <div className="atlas-panel p-6 font-mono text-xs text-atlas-muted">
        Computing NetworkX Centrality, PageRank & Greedy Modularity Communities...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="atlas-panel p-6 text-xs text-rose-400">
        Error loading Knowledge Graph: {error}
      </div>
    );
  }

  const filteredNodes = searchTerm
    ? data.nodes.filter((n) =>
        n.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : data.nodes;

  const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = data.edges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  const selectedNodeEdges = selectedNode
    ? data.edges.filter(
        (e) => e.source === selectedNode.id || e.target === selectedNode.id
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="atlas-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-atlas-teal" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-atlas-teal">
              Phase 7 Knowledge Graph • NetworkX Centrality & Provenance Edges
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-atlas-text">
            Interactive Frontier Knowledge Graph
          </h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Every edge requires an evidence_source_id and confidence weight.
            Edges with confidence &lt; 0.70 are highlighted as provisional.
          </p>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs text-atlas-muted">
          <span>
            Nodes:{" "}
            <strong className="text-atlas-teal">
              {data.analytics_summary.total_nodes}
            </strong>
          </span>
          <span>
            Edges:{" "}
            <strong className="text-atlas-blue">
              {data.analytics_summary.total_edges}
            </strong>
          </span>
          <span>
            Communities:{" "}
            <strong className="text-emerald-400">
              {data.analytics_summary.communities_detected}
            </strong>
          </span>
        </div>
      </div>

      {/* Graph Controls */}
      <div className="atlas-panel grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-atlas-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search node label (e.g., SGLang, Figure, Solid-State)..."
            className="w-full rounded border border-atlas-border bg-atlas-bg py-1.5 pl-8 pr-3 text-xs text-atlas-text focus:border-atlas-teal focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-atlas-muted" />
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="w-full rounded border border-atlas-border bg-atlas-bg px-2.5 py-1.5 font-mono text-xs text-atlas-text"
          >
            <option value="">All Sectors</option>
            <option value="sec-ai-infra">AI Infrastructure</option>
            <option value="sec-robotics">Robotics & Autonomous Systems</option>
            <option value="sec-energy-storage">Energy Storage & Batteries</option>
          </select>
        </div>

        <select
          value={relFilter}
          onChange={(e) => setRelFilter(e.target.value)}
          className="rounded border border-atlas-border bg-atlas-bg px-2.5 py-1.5 font-mono text-xs text-atlas-text"
        >
          <option value="">All Relationship Types</option>
          <option value="technology_belongs_to_sector">
            technology_belongs_to_sector
          </option>
          <option value="paper_studies_technology">
            paper_studies_technology
          </option>
          <option value="researcher_affiliated_with_organization">
            researcher_affiliated_with_organization
          </option>
          <option value="company_commercializes_technology">
            company_commercializes_technology
          </option>
          <option value="repository_implements_technology">
            repository_implements_technology
          </option>
          <option value="company_spins_out_of_organization">
            company_spins_out_of_organization
          </option>
        </select>
      </div>

      {/* Main Canvas + Right Evidence & Node Inspector Drawer */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <KnowledgeGraphCanvas
            nodesData={filteredNodes}
            edgesData={filteredEdges}
            selectedNodeId={selectedNode?.id ?? null}
            onSelectNode={(n) => {
              setSelectedNode(n);
              setExpandedNeighbors([]);
            }}
          />
        </div>

        <div className="space-y-4">
          <div className="atlas-panel p-4">
            <h2 className="border-b border-atlas-border pb-2.5 text-xs font-semibold uppercase tracking-wider text-atlas-text">
              Node & Edge Provenance Inspector
            </h2>
            {!selectedNode ? (
              <p className="mt-3 text-xs text-atlas-muted">
                Click any node in the interactive graph canvas to inspect its
                NetworkX centrality metrics, 1-hop neighborhood, and edge
                evidence IDs.
              </p>
            ) : (
              <div className="mt-3 space-y-3 text-xs">
                <div>
                  <span className="rounded bg-atlas-teal/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-atlas-teal">
                    {selectedNode.entity_type}
                  </span>
                  <div className="mt-1.5 text-sm font-bold text-atlas-text">
                    {selectedNode.label}
                  </div>
                  <div className="font-mono text-[10px] text-atlas-muted">
                    ID: {selectedNode.id}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded border border-atlas-border bg-atlas-bg p-2.5 font-mono text-[11px]">
                  <div>
                    <div className="text-[9px] text-atlas-muted">PageRank</div>
                    <div className="font-bold text-atlas-teal">
                      {(selectedNode.pagerank ?? 0).toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-atlas-muted">
                      Betweenness
                    </div>
                    <div className="font-bold text-atlas-blue">
                      {(selectedNode.betweenness_centrality ?? 0).toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-atlas-muted">
                      Degree Cent.
                    </div>
                    <div className="font-bold text-emerald-400">
                      {(selectedNode.degree_centrality ?? 0).toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-atlas-muted">Community</div>
                    <div className="font-bold text-amber-400">
                      Cluster #{selectedNode.community_id ?? 0}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => void handleExpandNode(selectedNode.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded border border-atlas-teal/40 bg-atlas-teal/15 py-1.5 font-mono text-xs text-atlas-teal hover:bg-atlas-teal/25"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Expand 1-Hop Neighborhood
                </button>

                {expandedNeighbors.length > 0 && (
                  <div className="rounded border border-atlas-border bg-atlas-bg/60 p-2.5">
                    <div className="font-mono text-[10px] uppercase text-atlas-muted">
                      Connected Entities:
                    </div>
                    <ul className="mt-1 space-y-1 font-mono text-[11px] text-slate-300">
                      {expandedNeighbors.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1 font-mono text-[10px] uppercase text-atlas-teal">
                    <ShieldCheck className="h-3.5 w-3.5" /> Edge Evidence
                    Lineage ({selectedNodeEdges.length})
                  </div>
                  <div className="mt-1.5 space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedNodeEdges.map((edge) => (
                      <div
                        key={edge.id}
                        className="rounded border border-atlas-border bg-atlas-bg/70 p-2 font-mono text-[10px]"
                      >
                        <div className="text-atlas-text">
                          {edge.relationship_type}
                        </div>
                        <div className="mt-0.5 flex items-center justify-between text-atlas-muted">
                          <span>Evidence: [{edge.evidence_source_id}]</span>
                          <span>Conf: {(edge.confidence * 100).toFixed(0)}%</span>
                        </div>
                        {edge.notes && (
                          <div className="mt-1 text-slate-400">{edge.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="atlas-panel p-4">
            <h3 className="border-b border-atlas-border pb-2 text-xs font-semibold uppercase tracking-wider text-atlas-text">
              Top Centrality Bridge Nodes
            </h3>
            <div className="mt-2.5 space-y-2">
              {data.analytics_summary.top_centrality_nodes.map((node) => (
                <div
                  key={node.id}
                  className="flex items-center justify-between rounded border border-atlas-border bg-atlas-bg/50 px-2.5 py-1.5 text-xs"
                >
                  <span className="truncate font-medium text-atlas-text">
                    {node.label}
                  </span>
                  <span className="font-mono text-[11px] text-atlas-teal">
                    PR {node.pagerank.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
