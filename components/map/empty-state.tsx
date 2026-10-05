"use client";

import React, { useMemo } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { useMetroStore } from "@/store/use-metro-store";
import { getMetroData } from "@/lib/data";

export function EmptyFilterState() {
  const selectedCityId = useMetroStore((state) => state.selectedCityId);
  const selectedStatuses = useMetroStore((state) => state.selectedStatuses);
  const selectedPhases = useMetroStore((state) => state.selectedPhases);
  const searchQuery = useMetroStore((state) => state.searchQuery);
  const resetFilters = useMetroStore((state) => state.resetFilters);

  const dataset = useMemo(() => getMetroData(), []);

  const hasMatches = useMemo(() => {
    const activeCity = selectedCityId
      ? dataset.cities.find((c) => c.id === selectedCityId)
      : null;
    const query = searchQuery.trim().toLowerCase();

    const matchesSegment = dataset.segments.features.some((f) => {
      const props = f.properties;
      if (activeCity) {
        if (
          props.city.toLowerCase() !== activeCity.name.toLowerCase() &&
          props.city.toLowerCase() !== activeCity.id.toLowerCase()
        ) {
          return false;
        }
      }
      if (!selectedStatuses.includes(props.status)) return false;
      if (selectedPhases.length > 0 && !selectedPhases.includes(props.phase)) return false;
      if (query) {
        const matchesLine = props.line_name.toLowerCase().includes(query);
        const matchesCity = props.city.toLowerCase().includes(query);
        const matchesPhase = props.phase.toLowerCase().includes(query);
        if (!matchesLine && !matchesCity && !matchesPhase) return false;
      }
      return true;
    });

    return matchesSegment;
  }, [dataset, selectedCityId, selectedStatuses, selectedPhases, searchQuery]);

  if (hasMatches) {
    return null;
  }

  return (
    <div
      data-testid="empty-filter-state"
      className="pointer-events-auto absolute top-1/2 left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/95 p-6 text-center shadow-2xl backdrop-blur-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
        <AlertCircle className="h-5 w-5" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white">No metro lines match your filter</h3>
        <p className="mt-1 text-xs text-slate-400">
          Try selecting other statuses, phases, or clearing your search term.
        </p>
      </div>

      <button
        type="button"
        data-testid="empty-reset-btn"
        onClick={resetFilters}
        className="mt-1 flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span>Reset Filters</span>
      </button>
    </div>
  );
}

export default EmptyFilterState;
