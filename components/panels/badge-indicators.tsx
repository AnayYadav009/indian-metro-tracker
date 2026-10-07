import React from "react";
import type { Status, Layout } from "@/types/schema";
import { STATUS_DEFINITIONS, LAYOUT_DEFINITIONS } from "@/lib/metro-styles";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  if (status === "operational") {
    return (
      <span
        data-testid="status-badge-operational"
        className={`${STATUS_DEFINITIONS.operational.badgeClass} ${className}`}
      >
        <span className="inline-block h-1.5 w-3.5 rounded-full bg-emerald-400" />
        Operational
      </span>
    );
  }

  if (status === "construction") {
    return (
      <span
        data-testid="status-badge-construction"
        className={`${STATUS_DEFINITIONS.construction.badgeClass} ${className}`}
      >
        <span className="inline-flex gap-0.5">
          <span className="h-1.5 w-1.5 rounded-sm bg-amber-400" />
          <span className="h-1.5 w-1.5 rounded-sm bg-amber-400" />
        </span>
        Under Construction
      </span>
    );
  }

  return (
    <span
      data-testid="status-badge-planned"
      className={`${STATUS_DEFINITIONS.planned.badgeClass} ${className}`}
    >
      <span className="inline-flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-violet-400" />
        <span className="h-1 w-1 rounded-full bg-violet-400" />
        <span className="h-1 w-1 rounded-full bg-violet-400" />
      </span>
      Planned
    </span>
  );
}

export function PhaseBadge({ phase }: { phase: string }) {
  return (
    <span
      data-testid="phase-badge"
      className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-xs font-medium text-slate-300"
    >
      Phase {phase}
    </span>
  );
}

export function LayoutBadge({ layout }: { layout: Layout }) {
  const current = LAYOUT_DEFINITIONS[layout] || LAYOUT_DEFINITIONS.elevated;

  return (
    <span
      data-testid="layout-badge"
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${current.badgeClass}`}
    >
      {current.label}
    </span>
  );
}

export function InterchangeBadge() {
  return (
    <span
      data-testid="interchange-badge"
      className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300"
    >
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
        />
      </svg>
      Interchange
    </span>
  );
}
