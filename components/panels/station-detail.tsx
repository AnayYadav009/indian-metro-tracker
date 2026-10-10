"use client";

import React, { useMemo, useCallback } from "react";
import type { StationProperties } from "@/types/schema";
import { getMetroData, getSegments } from "@/lib/data";
import { useMetroStore } from "@/store/use-metro-store";
import {
  StatusBadge,
  PhaseBadge,
  LayoutBadge,
  InterchangeBadge,
} from "./badge-indicators";
import { ReportIssueButton } from "./report-issue-button";

interface StationDetailProps {
  station: StationProperties;
  coordinates?: [number, number];
}

export function StationDetail({ station, coordinates }: StationDetailProps) {
  const dataset = useMemo(() => getMetroData(), []);
  const setSelectedFeature = useMetroStore((s) => s.setSelectedFeature);

  // Map line_ids to full line info (names and colors)
  const connectedLines = useMemo(() => {
    return station.line_ids.map((lineId) => {
      const line = dataset.lines.find((l) => l.id === lineId);
      return {
        id: lineId,
        name: line?.name || lineId,
        color: line?.color || "#94a3b8",
      };
    });
  }, [station.line_ids, dataset.lines]);

  /** Clicking a line chip selects the first operational segment of that line */
  const handleLineChipClick = useCallback(
    (lineId: string) => {
      const segments = getSegments({ lineId });
      if (segments.length === 0) return;
      // Prefer an operational segment; fall back to any
      const seg =
        segments.find((s) => s.properties.status === "operational") ||
        segments[0];
      setSelectedFeature({ type: "segment", data: seg.properties });
    },
    [setSelectedFeature]
  );

  const isInterchange =
    station.is_interchange || station.interchange_id !== undefined;

  return (
    <div data-testid="station-detail" className="flex flex-col gap-4 text-slate-200">
      {/* Station Name Header & Interchange Badge */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-white">
            {station.name}
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            {station.station_id}
          </p>
        </div>
        {isInterchange && <InterchangeBadge />}
      </div>

      {/* Badges row: Status, Phase, Layout */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={station.status} />
        <PhaseBadge phase={station.phase} />
        <LayoutBadge layout={station.layout} />
      </div>

      {/* Connected Lines section — interchange stations show clickable chips */}
      {isInterchange && connectedLines.length > 1 ? (
        <div
          data-testid="interchange-lines-section"
          className="flex flex-col gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs"
        >
          <span className="text-amber-300 font-semibold">
            Interchange — connects
          </span>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {connectedLines.map((line) => (
              <button
                key={line.id}
                type="button"
                data-testid={`connected-line-${line.id}`}
                onClick={() => handleLineChipClick(line.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-100 shadow-sm transition-all hover:border-slate-500 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <span
                  data-testid={`interchange-line-chip-${line.id}`}
                  className="inline-flex items-center gap-1.5"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: line.color }}
                  />
                  {line.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
          <span className="text-slate-400 font-medium">Connected Lines</span>
          <div className="flex flex-wrap gap-2 pt-1">
            {connectedLines.map((line) => (
              <span
                key={line.id}
                data-testid={`connected-line-${line.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-100 shadow-sm"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: line.color }}
                />
                {line.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grid metadata */}
      <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
        <div>
          <span className="text-slate-400">City</span>
          <p className="font-semibold text-slate-100">{station.city}</p>
        </div>

        <div>
          <span className="text-slate-400">
            {station.status === "operational" ? "Opened On" : "Expected Completion"}
          </span>
          <p className="font-semibold text-slate-100">
            {station.status === "operational"
              ? station.opened_on || "N/A"
              : station.expected_completion || "TBD"}
          </p>
        </div>

        {coordinates && (
          <div className="col-span-2">
            <span className="text-slate-400">Coordinates</span>
            <p className="font-mono text-slate-200">
              {coordinates[1].toFixed(4)}° N, {coordinates[0].toFixed(4)}° E
            </p>
          </div>
        )}
      </div>

      {/* Report an Issue Button */}
      <ReportIssueButton target={{ type: "station", data: station, coordinates }} />

      {/* Provenance footer */}
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span>Source:</span>
          <span
            className={`rounded px-1.5 py-0.5 font-medium ${
              station.source === "mock"
                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {station.source}
          </span>
        </span>
        <span>Verified: {station.last_verified}</span>
      </div>
    </div>
  );
}
