"use client";

import React, { useMemo } from "react";
import { useMetroStore } from "@/store/use-metro-store";
import { getMetroData } from "@/lib/data";
import { matchesSegmentFilter } from "@/lib/filter-utils";

export function NetworkStats() {
  const selectedCityId = useMetroStore((state) => state.selectedCityId);
  const selectedStatuses = useMetroStore((state) => state.selectedStatuses);
  const selectedPhases = useMetroStore((state) => state.selectedPhases);
  const searchQuery = useMetroStore((state) => state.searchQuery);

  const dataset = useMemo(() => getMetroData(), []);

  const stats = useMemo(() => {
    const activeCity = selectedCityId
      ? dataset.cities.find((c) => c.id === selectedCityId)
      : null;

    const criteria = { activeCity, selectedStatuses, selectedPhases, searchQuery };

    const filteredSegments = dataset.segments.features.filter((f) =>
      matchesSegmentFilter(f.properties, criteria)
    );

    let operationalKm = 0;
    let constructionKm = 0;
    let plannedKm = 0;

    for (const seg of filteredSegments) {
      if (seg.properties.status === "operational") {
        operationalKm += seg.properties.length_km;
      } else if (seg.properties.status === "construction") {
        constructionKm += seg.properties.length_km;
      } else if (seg.properties.status === "planned") {
        plannedKm += seg.properties.length_km;
      }
    }

    return {
      operationalKm: Math.round(operationalKm * 10) / 10,
      constructionKm: Math.round(constructionKm * 10) / 10,
      plannedKm: Math.round(plannedKm * 10) / 10,
      totalSegments: filteredSegments.length,
    };
  }, [dataset, selectedCityId, selectedStatuses, selectedPhases, searchQuery]);

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
