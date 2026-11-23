import React from "react";
import type { SegmentProperties } from "@/types/schema";
import { StatusBadge, PhaseBadge } from "./badge-indicators";

interface SegmentDetailProps {
  segment: SegmentProperties;
}

export function SegmentDetail({ segment }: SegmentDetailProps) {
  return (
    <div data-testid="segment-detail" className="flex flex-col gap-4 text-slate-200">
      {/* Line header & Color swatch */}
      <div className="flex items-center gap-3">
        <div
          data-testid="segment-color-indicator"
          className="h-9 w-3 rounded-full shrink-0 shadow"
          style={{ backgroundColor: segment.color }}
        />
        <div className="flex-1 overflow-hidden">
          <h3 className="text-lg font-bold tracking-tight text-white truncate">
            {segment.line_name}
          </h3>
          <p className="text-xs text-slate-400 font-mono truncate">
            {segment.segment_id}
          </p>
        </div>
      </div>

      {/* Badges row: Status & Phase */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={segment.status} />
        <PhaseBadge phase={segment.phase} />
      </div>

      {/* Detailed properties grid */}
      <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
        <div>
          <span className="text-slate-400">City</span>
          <p className="font-semibold text-slate-100">{segment.city}</p>
        </div>

        <div>
          <span className="text-slate-400">Operator</span>
          <p className="font-semibold text-slate-100">{segment.operator}</p>
        </div>

        <div>
          <span className="text-slate-400">Length</span>
          <p className="font-semibold text-slate-100">{segment.length_km} km</p>
        </div>

        <div>
          <span className="text-slate-400">Stations</span>
          <p className="font-semibold text-slate-100">{segment.stations_count} stations</p>
        </div>

        <div>
          <span className="text-slate-400">Track Gauge</span>
          <p className="font-semibold capitalize text-slate-100">{segment.gauge}</p>
        </div>

        <div>
          <span className="text-slate-400">
            {segment.status === "operational" ? "Inaugurated On" : "Expected Completion"}
          </span>
          <p className="font-semibold text-slate-100">
            {segment.status === "operational"
              ? segment.inaugurated_on || "N/A"
              : segment.expected_completion || "TBD"}
          </p>
        </div>
      </div>

      {/* References links */}
      {segment.references && segment.references.length > 0 && (
        <div data-testid="segment-references" className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
          <span className="text-slate-400 font-medium block mb-1.5">References & Citations</span>
          <ul className="flex flex-col gap-1">
            {segment.references.map((url, idx) => (
              <li key={idx} className="truncate">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 underline underline-offset-2 hover:text-sky-300 break-all"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Provenance footer */}
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span>Source:</span>
          <span
            className={`rounded px-1.5 py-0.5 font-medium ${
              segment.source === "mock"
                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {segment.source}
          </span>
        </span>
        <span>Verified: {segment.last_verified}</span>
      </div>
    </div>
  );
}
