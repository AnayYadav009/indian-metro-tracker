"use client";

import React from "react";
import { useMetroStore } from "@/store/use-metro-store";
import { getMetroData } from "@/lib/data";
import { formatPhaseLabel } from "@/lib/phase-utils";

export function PhaseFilter() {
  const selectedCityId = useMetroStore((state) => state.selectedCityId);
  const selectedPhases = useMetroStore((state) => state.selectedPhases);
  const togglePhase = useMetroStore((state) => state.togglePhase);
  const setPhases = useMetroStore((state) => state.setPhases);

  const dataset = getMetroData();

  // Determine active city
  const activeCity = selectedCityId
    ? dataset.cities.find((c) => c.id === selectedCityId)
    : null;

  if (!activeCity) {
    return (
      <div className="flex flex-col gap-1.5" data-testid="phase-filter-container">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Phases
        </label>
        <p
          className="text-xs italic text-slate-400"
          data-testid="phase-filter-empty-hint"
        >
          Select a city to filter by phase
        </p>
      </div>
    );
  }

  const availablePhases = activeCity.phases || [];

  if (availablePhases.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5" data-testid="phase-filter-container">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Phases ({activeCity.name})
        </label>
        {selectedPhases.length > 0 && (
          <button
            type="button"
            onClick={() => setPhases([])}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
          >
            Clear ({selectedPhases.length})
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          data-testid="phase-pill-all"
          onClick={() => setPhases([])}
          aria-pressed={selectedPhases.length === 0}
          aria-label="Filter network to all phases"
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
            selectedPhases.length === 0
              ? "bg-slate-700 text-white ring-1 ring-slate-500"
              : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          All Phases
        </button>

        {availablePhases.map((phase) => {
          const isSelected = selectedPhases.includes(phase);
          const formattedLabel = formatPhaseLabel(phase);
          return (
            <button
              key={phase}
              type="button"
              data-testid={`phase-pill-${phase}`}
              onClick={() => togglePhase(phase)}
              aria-pressed={isSelected}
              aria-label={`Filter network to ${formattedLabel}`}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                isSelected
                  ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400"
                  : "bg-slate-900/80 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white"
              }`}
            >
              {formattedLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
