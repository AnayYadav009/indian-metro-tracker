"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import { useMetroStore } from "@/store/use-metro-store";
import { getMetroData } from "@/lib/data";
import { BASEMAP_CONFIG } from "@/lib/map-config";

interface MapLegendProps {
  className?: string;
}

export function MapLegend({ className = "" }: MapLegendProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const selectedCityId = useMetroStore((state) => state.selectedCityId);

  const dataset = useMemo(() => getMetroData(), []);

  // Filter lines to display in legend based on active city
  const activeLines = useMemo(() => {
    if (!selectedCityId) {
      return [];
    }
    return dataset.lines.filter((l) => l.city_id === selectedCityId);
  }, [selectedCityId, dataset.lines]);

  const activeCityName = useMemo(() => {
    if (!selectedCityId) return "All Networks";
    return dataset.cities.find((c) => c.id === selectedCityId)?.name || "City";
  }, [selectedCityId, dataset.cities]);

  return (
    <div
      data-testid="map-legend"
      className={`relative z-20 flex flex-col rounded-xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md transition-all duration-200 pointer-events-auto ${
        isExpanded ? "w-64 sm:w-72" : "w-auto"
      } ${className}`}
    >
      {/* Header bar / Toggle Button */}
      <button
        type="button"
        data-testid="toggle-legend-btn"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:text-white"
        aria-expanded={isExpanded}
        aria-label="Toggle map legend"
      >
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-sky-400" />
          <span>Map Legend</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="text-[10px] uppercase tracking-wider hidden sm:inline">
            {isExpanded ? "Collapse" : "Expand"}
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expanded Legend Content */}
      {isExpanded && (
        <div
          data-testid="legend-content"
          className="flex flex-col gap-3.5 border-t border-slate-800/80 p-3.5 pt-3 text-xs text-slate-300"
        >
          {/* Section 1: Line Status Symbology (Never relies on color alone) */}
          <div>
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Line Status Styles
            </h4>
            <div className="flex flex-col gap-2">
              {/* Operational: Solid */}
              <div
                data-testid="legend-status-operational"
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-3 w-10 items-center justify-center">
                    <span className="h-1 w-full rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-slate-200">Operational</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Solid</span>
              </div>

              {/* Construction: Dashed [4, 2] */}
              <div
                data-testid="legend-status-construction"
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-3 w-10 items-center justify-between">
                    <span className="h-1 w-2.5 rounded-sm bg-amber-400" />
                    <span className="h-1 w-2.5 rounded-sm bg-amber-400" />
                    <span className="h-1 w-2.5 rounded-sm bg-amber-400" />
                  </div>
                  <span className="text-slate-200">Under Construction</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Dashed</span>
              </div>

              {/* Planned: Dotted [0.1, 2] round */}
              <div
                data-testid="legend-status-planned"
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-3 w-10 items-center justify-around">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  </div>
                  <span className="text-slate-200">Planned / Proposed</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Dotted</span>
              </div>
            </div>
          </div>

          {/* Section 2: Station Nodes Symbology */}
          <div className="border-t border-slate-800/80 pt-2.5">
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Station Markers
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div
                data-testid="legend-station-interchange"
                className="flex items-center gap-2"
              >
                <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-amber-400 bg-white shadow">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                </div>
                <span>Interchange</span>
              </div>

              <div
                data-testid="legend-station-standard"
                className="flex items-center gap-2"
              >
                <div className="flex h-3 w-3 items-center justify-center rounded-full border border-slate-400 bg-white" />
                <span>Standard Station</span>
              </div>
            </div>
          </div>

          {/* Section 3: Active Line Colors for Selected City */}
          {selectedCityId && activeLines.length > 0 && (
            <div className="border-t border-slate-800/80 pt-2.5">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {activeCityName} Lines
                </h4>
                <span className="text-[10px] text-slate-400">
                  {activeLines.length} lines
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                {activeLines.map((line) => (
                  <div
                    key={line.id}
                    data-testid={`legend-line-${line.id}`}
                    className="flex items-center gap-2 truncate text-[11px]"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                      style={{ backgroundColor: line.color }}
                    />
                    <span className="truncate text-slate-200">{line.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!selectedCityId && (
            <div className="border-t border-slate-800/80 pt-2 text-[11px] text-slate-400 italic">
              Select a city to view its line color palette.
            </div>
          )}

          {/* Data Last Updated & Licence Note */}
          <div
            data-testid="legend-last-updated"
            className="border-t border-slate-800/80 pt-2 text-[10px] text-slate-400 flex flex-col gap-1"
          >
            <div className="flex items-center justify-between">
              <span>Updated: Oct 2026</span>
              <a
                href={BASEMAP_CONFIG.dataLicenseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-emerald-400 hover:text-emerald-300 underline"
              >
                {BASEMAP_CONFIG.dataLicense}
              </a>
            </div>
            <div className="text-[9px] text-slate-500">
              Data {BASEMAP_CONFIG.osmAttribution}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapLegend;
