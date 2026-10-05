"use client";

import React, { useState } from "react";
import { useMetroStore } from "@/store/use-metro-store";
import { CitySelect } from "./city-select";
import { StatusFilter } from "./status-filter";
import { PhaseFilter } from "./phase-filter";
import { SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp, Search, X } from "lucide-react";

export function FilterPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const selectedCityId = useMetroStore((state) => state.selectedCityId);
  const selectedStatuses = useMetroStore((state) => state.selectedStatuses);
  const selectedPhases = useMetroStore((state) => state.selectedPhases);
  const searchQuery = useMetroStore((state) => state.searchQuery);
  const setSearchQuery = useMetroStore((state) => state.setSearchQuery);
  const resetFilters = useMetroStore((state) => state.resetFilters);

  // Compute number of non-default filters active
  const hasActiveFilters =
    selectedCityId !== null ||
    selectedStatuses.length < 3 ||
    selectedPhases.length > 0 ||
    searchQuery.trim().length > 0;

  return (
    <div
      data-testid="filter-panel"
      className="absolute top-4 left-4 z-20 w-[92vw] max-w-sm rounded-xl border border-slate-800 bg-slate-900/95 p-4 text-slate-100 shadow-2xl backdrop-blur-md transition-all sm:w-96"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">
            Filters & Network Controls
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              data-testid="reset-filters-btn"
              onClick={resetFilters}
              title="Reset all filters"
              className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            data-testid="collapse-filter-btn"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={isCollapsed ? "Expand filters" : "Collapse filters"}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="mt-3 flex flex-col gap-4 text-xs">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              data-testid="filter-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lines, phases, stations..."
              className="w-full rounded-md border border-slate-700/80 bg-slate-950/70 py-1.5 pl-8 pr-7 text-xs text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* City Selection */}
          <CitySelect />

          {/* Status Selection */}
          <StatusFilter />

          {/* Dynamic Phase Selection */}
          <PhaseFilter />
        </div>
      )}
    </div>
  );
}

export default FilterPanel;
