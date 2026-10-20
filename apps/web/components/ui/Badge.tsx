import React from "react";

interface QualityBadgeProps {
  status: string;
  className?: string;
}

export function QualityBadge({ status, className = "" }: QualityBadgeProps) {
  const s = (status || "Source-backed").toLowerCase();
  let colorClasses =
    "bg-[#49A5F6]/15 text-[#49A5F6] border-[#49A5F6]/30";

  if (s.includes("verified") || s.includes("accepted") || s.includes("complete")) {
    colorClasses = "bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30";
  } else if (s.includes("unverified") || s.includes("pending") || s.includes("monitor") || s.includes("stale")) {
    colorClasses = "bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30";
  } else if (s.includes("conflicting") || s.includes("rejected") || s.includes("unavailable") || s.includes("insufficient")) {
    colorClasses = "bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${colorClasses} ${className}`}
    >
      {status}
    </span>
  );
}

export function ProvenancePill({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center rounded border border-atlas-border bg-atlas-bg px-2 py-0.5 font-mono text-[10px] font-medium text-atlas-muted">
      Source: {source}
    </span>
  );
}

