"use client";

import React, { useMemo } from "react";
import { useMetroStore } from "@/store/use-metro-store";
import { getMetroData } from "@/lib/data";
import { matchesSegmentFilter, buildFilterCriteria } from "@/lib/filter-utils";

export function NetworkStats() {
  const selectedCityId = useMetroStore((state) => state.selectedCityId);
  const selectedStatuses = useMetroStore((state) => state.selectedStatuses);
  const selectedPhases = useMetroStore((state) => state.selectedPhases);
  const searchQuery = useMetroStore((state) => state.searchQuery);
  const selectedYear = useMetroStore((state) => state.selectedYear);
  const includeFuture = useMetroStore((state) => state.includeFuture);

  const dataset = useMemo(() => getMetroData(), []);

  const stats = useMemo(() => {
    const criteria = buildFilterCriteria(
      dataset,
      selectedCityId,
      selectedStatuses,
      selectedPhases,
      searchQuery,
      selectedYear,
      includeFuture
    );

    const filteredSegments = dataset.segments.features.filter((f) =>
      matchesSegmentFilter(f.properties, criteria)
    );

    const km = { operational: 0, construction: 0, planned: 0 };
    for (const { properties } of filteredSegments) km[properties.status] += properties.length_km;

    return {
      operationalKm: Math.round(km.operational * 10) / 10,
      constructionKm: Math.round(km.construction * 10) / 10,
      plannedKm: Math.round(km.planned * 10) / 10,
      totalSegments: filteredSegments.length,
    };
  }, [
    dataset,
    selectedCityId,
    selectedStatuses,
    selectedPhases,
    searchQuery,
    selectedYear,
    includeFuture,
  ]);

  return (
    <div
      data-testid="network-stats-bar"
      className="hidden items-center gap-3 text-xs md:flex"
    >
      <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/40 px-2.5 py-0.5 text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span>{stats.operationalKm} km open</span>
      </div>

      <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-950/40 px-2.5 py-0.5 text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span>{stats.constructionKm} km under constr.</span>
      </div>

      <div className="flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-950/40 px-2.5 py-0.5 text-violet-300">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        <span>{stats.plannedKm} km planned</span>
      </div>
    </div>
  );
}
