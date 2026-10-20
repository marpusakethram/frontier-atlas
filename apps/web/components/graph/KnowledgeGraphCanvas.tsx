"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export interface GraphNodeData {
  id: string;
  label: string;
  entity_type: string;
  sector_id?: string | null;
  degree_centrality?: number;
  pagerank?: number;
  betweenness_centrality?: number;
  community_id?: number;
  provisional?: boolean;
  metadata?: Record<string, unknown>;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  relationship_type: string;
  confidence: number;
  provisional: boolean;
  evidence_source_id?: string | null;
  notes?: string | null;
}

const ENTITY_COLORS: Record<string, { border: string; bg: string; badge: string }> = {
  sector: { border: "#14B8A6", bg: "#042F2E", badge: "SECTOR" },
  technology: { border: "#3B82F6", bg: "#172554", badge: "TECH" },
  paper: { border: "#8B5CF6", bg: "#2E1065", badge: "PAPER" },
  researcher: { border: "#10B981", bg: "#064E3B", badge: "RESEARCHER" },
  organization: { border: "#F59E0B", bg: "#451A03", badge: "INSTITUTION" },
  company: { border: "#EC4899", bg: "#500724", badge: "COMPANY" },
  repository: { border: "#06B6D4", bg: "#083344", badge: "REPO" },
};

export function KnowledgeGraphCanvas({
  nodesData,
  edgesData,
  selectedNodeId,
  onSelectNode,
}: {
  nodesData: GraphNodeData[];
  edgesData: GraphEdgeData[];
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNodeData) => void;
}) {
  const { flowNodes, flowEdges } = useMemo(() => {
    const typeGroups: Record<string, GraphNodeData[]> = {};
    nodesData.forEach((n) => {
      const t = n.entity_type || "other";
      if (!typeGroups[t]) typeGroups[t] = [];
      typeGroups[t].push(n);
    });

    const columns = [
      "sector",
      "technology",
      "organization",
      "company",
      "repository",
      "researcher",
      "paper",
    ];

    const computedNodes: Node[] = [];
    columns.forEach((colType, colIdx) => {
      const items = typeGroups[colType] || [];
      items.forEach((item, rowIdx) => {
        const stylePalette = ENTITY_COLORS[item.entity_type] || {
          border: "#64748B",
          bg: "#0F172A",
          badge: item.entity_type.toUpperCase(),
        };
        const isSelected = selectedNodeId === item.id;
        computedNodes.push({
          id: item.id,
          position: {
            x: colIdx * 255 + (rowIdx % 2) * 24,
            y: rowIdx * 96 + 30,
          },
          data: {
            label: (
              <div className="text-left">
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className="rounded px-1 py-0.5 font-mono text-[9px] font-bold"
                    style={{
                      backgroundColor: stylePalette.bg,
                      color: stylePalette.border,
                    }}
                  >
                    {stylePalette.badge}
                  </span>
                  {item.provisional && (
                    <span className="rounded bg-amber-950 px-1 py-0.5 font-mono text-[8px] text-amber-400">
                      PROVISIONAL
                    </span>
                  )}
                </div>
                <div className="mt-1 line-clamp-2 text-[11px] font-medium text-slate-100">
                  {item.label}
                </div>
                <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-slate-400">
                  <span>PR: {(item.pagerank ?? 0).toFixed(3)}</span>
                  <span>C#{item.community_id ?? 0}</span>
                </div>
              </div>
            ),
            raw: item,
          },
          style: {
            background: "#0F172A",
            border: `${isSelected ? "2px" : "1px"} solid ${
              isSelected ? "#F8FAFC" : stylePalette.border
            }`,
            borderRadius: "6px",
            padding: "8px",
            width: 205,
            boxShadow: isSelected ? "0 0 14px rgba(20,184,166,0.45)" : "none",
          },
        });
      });
    });

    const computedEdges: Edge[] = edgesData.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.relationship_type.replace(/_/g, " "),
      animated: e.provisional,
      labelStyle: {
        fill: "#94A3B8",
        fontSize: 9,
        fontFamily: "JetBrains Mono",
      },
      labelBgStyle: {
        fill: "#0B0F17",
        fillOpacity: 0.85,
      },
      style: {
        stroke: e.provisional ? "#F59E0B" : "#14B8A6",
        strokeWidth: Math.max(1.2, e.confidence * 2.2),
        strokeDasharray: e.provisional ? "4 4" : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: e.provisional ? "#F59E0B" : "#14B8A6",
      },
    }));

    return { flowNodes: computedNodes, flowEdges: computedEdges };
  }, [nodesData, edgesData, selectedNodeId]);

  return (
    <div className="h-[600px] w-full rounded-md border border-atlas-border bg-atlas-bg">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        fitView
        onNodeClick={(_, node) => {
          if (node.data?.raw) {
            onSelectNode(node.data.raw as GraphNodeData);
          }
        }}
      >
        <Background color="#1E293B" gap={20} />
        <Controls className="!bg-atlas-panel !border-atlas-border !text-atlas-text" />
        <MiniMap
          nodeColor="#14B8A6"
          maskColor="rgba(11, 15, 23, 0.7)"
          style={{ backgroundColor: "#0F172A", border: "1px solid #1E293B" }}
        />
      </ReactFlow>
    </div>
  );
}
