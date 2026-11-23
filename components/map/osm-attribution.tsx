"use client";

import React from "react";
import { BASEMAP_CONFIG } from "@/lib/map-config";

interface OsmAttributionProps {
  className?: string;
  "data-testid"?: string;
}

export function OsmAttribution({
  className = "",
  "data-testid": dataTestId = "osm-attribution",
}: OsmAttributionProps) {
  return (
    <div
      data-testid={dataTestId}
      className={`rounded border border-slate-800 bg-slate-950/90 px-2.5 py-1 text-[11px] text-slate-300 shadow backdrop-blur-sm pointer-events-auto ${className}`}
    >
      <span>Basemap: </span>
      <a
        href={BASEMAP_CONFIG.providerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-300 underline underline-offset-2 hover:text-white"
      >
        {BASEMAP_CONFIG.provider}
      </a>
      <span className="mx-1.5 text-slate-600">|</span>
      <a
        href={BASEMAP_CONFIG.osmAttributionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-300 underline underline-offset-2 hover:text-white"
      >
        {BASEMAP_CONFIG.osmAttribution}
      </a>
    </div>
  );
}
