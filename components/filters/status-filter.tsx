"use client";

import React from "react";
import { useMetroStore } from "@/store/use-metro-store";
import type { Status } from "@/types/schema";
import { getMetroData } from "@/lib/data";

interface StatusOption {
  id: Status;
  label: string;
  patternLabel: string;
  description: string;
  lineStyle: "solid" | "dashed" | "dotted";
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    id: "operational",
    label: "Operational",
    patternLabel: "Solid",
    description: "In-service lines",
    lineStyle: "solid",
  },
  {
    id: "construction",
    label: "Under Construction",
    patternLabel: "Dashed",
    description: "Actively building",
    lineStyle: "dashed",
  },
  {
    id: "planned",
    label: "Planned / Proposed",
    patternLabel: "Dotted",
    description: "Approved & DPRs",
    lineStyle: "dotted",
  },
];

export function StatusFilter() {
  const selectedCityId = useMetroStore((state) => state.selectedCityId);
  const selectedStatuses = useMetroStore((state) => state.selectedStatuses);
  const toggleStatus = useMetroStore((state) => state.toggleStatus);

  const dataset = getMetroData();

  // Calculate segment count per status in current city scope
  const getCountForStatus = (status: Status) => {
    return dataset.segments.features.filter((f) => {
      if (f.properties.status !== status) return false;
      if (selectedCityId) {
        const city = dataset.cities.find((c) => c.id === selectedCityId);
        if (
          city &&
          f.properties.city.toLowerCase() !== city.name.toLowerCase() &&
          f.properties.city.toLowerCase() !== city.id.toLowerCase()
        ) {
          return false;
        }
      }
      return true;
    }).length;
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Status & Line Style
        </label>
        <span className="text-[11px] text-slate-500">Non-color encoded</span>
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = selectedStatuses.includes(opt.id);
          const count = getCountForStatus(opt.id);

          return (
            <button
              key={opt.id}
              type="button"
              data-testid={`status-toggle-${opt.id}`}
              onClick={() => toggleStatus(opt.id)}
              aria-pressed={isActive}
              aria-label={`Toggle ${opt.label} lines (${opt.patternLabel} style)`}
              className={`flex flex-col gap-1 rounded-md border p-2 text-left transition-all ${
                isActive
                  ? "border-emerald-500/50 bg-slate-900/90 shadow-sm ring-1 ring-emerald-500/20"
                  : "border-slate-800 bg-slate-950/60 opacity-60 hover:opacity-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200">
                  {opt.label}
                </span>
                <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono text-slate-300">
                  {count}
                </span>
              </div>

              {/* Visual Pattern Indicator */}
              <div className="flex items-center gap-2">
                <div className="h-2 w-14 flex items-center">
                  {opt.lineStyle === "solid" && (
                    <div className="h-[3px] w-full rounded-full bg-emerald-400" />
                  )}
                  {opt.lineStyle === "dashed" && (
                    <div className="h-[3px] w-full border-b-[3px] border-dashed border-amber-400" />
                  )}
                  {opt.lineStyle === "dotted" && (
                    <div className="h-[3px] w-full border-b-[3px] border-dotted border-violet-400" />
                  )}
                </div>
                <span className="text-[10px] text-slate-400">
                  {opt.patternLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
