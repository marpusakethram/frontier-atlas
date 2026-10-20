"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";

interface ResearchTrendsChartProps {
  data: Array<Record<string, number>>;
}

export function ResearchTrendsChart({ data }: ResearchTrendsChartProps) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradAi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradHealthcare" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EC4899" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#EC4899" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradPhysical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradConsumer" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradRobotics" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradEnergy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
              color: "#F8FAFC",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }} />
          <Area
            type="monotone"
            dataKey="healthcare-clinical-ai"
            name="Healthcare & Clinical AI"
            stroke="#EC4899"
            fill="url(#gradHealthcare)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="physical-ai"
            name="Physical AI & Embodied"
            stroke="#8B5CF6"
            fill="url(#gradPhysical)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="everything-consumer-ai"
            name="Everything Consumer AI"
            stroke="#10B981"
            fill="url(#gradConsumer)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="ai-infrastructure"
            name="AI Infrastructure"
            stroke="#14B8A6"
            fill="url(#gradAi)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="robotics-autonomous-systems"
            name="Robotics & Autonomy"
            stroke="#3B82F6"
            fill="url(#gradRobotics)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="energy-storage-batteries"
            name="Energy Storage & Batteries"
            stroke="#F59E0B"
            fill="url(#gradEnergy)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface LandscapeSignal {
  id: string;
  slug: string;
  name: string;
  sector_name: string;
  maturity_score: number | null;
  momentum_score: number | null;
  momentum_coverage: number;
}

export function FrontierLandscapeScatter({
  signals,
}: {
  signals: LandscapeSignal[];
}) {
  const plotData = signals.map((s) => ({
    name: s.name,
    sector: s.sector_name,
    maturity: s.maturity_score ?? 45,
    momentum: s.momentum_score ?? 65,
    coverage: Math.round((s.momentum_coverage ?? 0.8) * 100),
  }));

  const colors = ["#14B8A6", "#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899"];

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 16, bottom: 16, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis
            type="number"
            dataKey="maturity"
            name="Maturity Score"
            unit="/100"
            domain={[20, 100]}
            stroke="#64748B"
            tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "JetBrains Mono" }}
            label={{
              value: "Commercialization Maturity Score (0-100)",
              position: "insideBottom",
              offset: -8,
              fill: "#64748B",
              fontSize: 10,
            }}
          />
          <YAxis
            type="number"
            dataKey="momentum"
            name="Momentum Score"
            unit="/100"
            domain={[40, 100]}
            stroke="#64748B"
            tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "JetBrains Mono" }}
          />
          <ZAxis type="number" dataKey="coverage" range={[80, 260]} name="Coverage %" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{
              backgroundColor: "#0F172A",
              borderColor: "#1E293B",
              fontSize: "12px",
              color: "#F8FAFC",
            }}
          />
          <Scatter name="Technologies" data={plotData}>
            {plotData.map((entry, idx) => (
              <Cell key={`cell-${entry.name}`} fill={colors[idx % colors.length]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
