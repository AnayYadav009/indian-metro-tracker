import React from "react";
import type { SegmentProperties } from "@/types/schema";
import { StatusBadge, PhaseBadge } from "./badge-indicators";
import { ReportIssueButton } from "./report-issue-button";
import { ProvenanceFooter } from "./provenance-footer";
import { getKnownIssueNotice } from "@/lib/known-issue-notices";
import { getMetroData } from "@/lib/data";

interface SegmentDetailProps {
  segment: SegmentProperties;
}

export function SegmentDetail({ segment }: SegmentDetailProps) {
  const knownIssueNotice = getKnownIssueNotice([segment.line_id]);
  const dataset = getMetroData();
  const line = dataset.lines.find((l) => l.id === segment.line_id);

  return (
    <div data-testid="segment-detail" className="flex flex-col gap-2.5 text-slate-200">
      {/* Line header & Color swatch */}
      <div className="flex items-center gap-3">
        <div
          data-testid="segment-color-indicator"
          className="h-7 w-2.5 rounded-full shrink-0 shadow"
          style={{ backgroundColor: segment.color }}
        />
        <div className="flex-1 min-w-0">
          <h3
            title={segment.line_name}
            className="text-sm font-bold tracking-tight text-white leading-snug break-words"
          >
            {segment.line_name}
          </h3>
          <p className="text-xs text-slate-400 font-mono truncate mt-0.5">
            {segment.segment_id}
          </p>
        </div>
      </div>

      {/* Badges row: Status & Phase */}
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={segment.status} />
        <PhaseBadge phase={segment.phase} />
        {segment.geometry_quality === "schematic" && (
          <span
            data-testid="schematic-route-note"
            className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[10px] font-medium text-violet-300"
          >
            Approximate alignment.
          </span>
        )}
      </div>

      {knownIssueNotice && (
        <p
          data-testid="known-issue-notice"
          role="status"
          className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-100"
        >
          {knownIssueNotice}
        </p>
      )}

      {/* Detailed properties grid */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-[11px]">
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
          <p className="font-semibold text-slate-100">
            {segment.stations_not_published ||
            ((segment.status === "construction" || segment.status === "planned") &&
              segment.stations_count === 0)
              ? "Stations not yet published"
              : segment.stations_count === 1
              ? "1 station"
              : `${segment.stations_count} stations`}
          </p>
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
              ? segment.inaugurated_on || "Date not recorded"
              : segment.expected_completion || "TBD"}
          </p>
        </div>
      </div>

      {/* References links */}
      {segment.references && segment.references.length > 0 && (
        <div data-testid="segment-references" className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-[11px]">
          <span className="text-slate-400 font-medium block mb-1">References & Citations</span>
          <ul className="flex flex-col gap-0.5">
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

      {/* Segment Feature Source */}
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-400">
         <span className="flex items-center gap-1.5">
           <span>Feature source:</span>
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
         <span>
           {segment.last_verified
             ? `Feature data date: ${segment.last_verified}`
             : "Feature data date: Unrecorded (OSM data)"}
         </span>
       </div>

      {/* Report an Issue Button */}
      <ReportIssueButton target={{ type: "segment", data: segment }} />

      {/* Provenance footer */}
      <ProvenanceFooter
        items={[
          { label: "Line", provenance: line?.provenance },
        ]}
      />
    </div>
  );
}
