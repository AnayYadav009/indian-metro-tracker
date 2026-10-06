"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { MapSkeleton } from "@/components/map/map-skeleton";
import { FilterPanel } from "@/components/filters/filter-panel";
import { MetadataPanel } from "@/components/panels/metadata-panel";
import { MapLegend } from "@/components/legend/map-legend";
import { MockBanner } from "@/components/ui/mock-banner";
import { NetworkStats } from "@/components/filters/network-stats";
import { EmptyFilterState } from "@/components/map/empty-state";
import { OsmAttribution } from "@/components/map/osm-attribution";
import { BASEMAP_CONFIG } from "@/lib/map-config";
import { getDatasetMetadataSummary } from "@/lib/data";

import { useUrlSync } from "@/hooks/use-url-sync";

const MapCanvas = dynamic(
  () => import("@/components/map/map-canvas").then((mod) => mod.MapCanvas),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  }
);

export default function HomePage() {
  useUrlSync();
  const metadataSummary = useMemo(() => getDatasetMetadataSummary(), []);

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Header bar */}
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-sm font-bold text-emerald-400">
            IM
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-100 md:text-base">
              Indian Metro Network Tracker
            </h1>
          </div>
        </div>

        {/* Live Network Metric Stats */}
        <NetworkStats />

        <div className="flex items-center gap-2">
          <span
            data-testid="data-last-updated"
            className="hidden items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300 md:inline-flex"
          >
            {metadataSummary.badgeLabel}
          </span>
          <span className="hidden items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300 sm:inline-flex">
            {BASEMAP_CONFIG.name}
          </span>
        </div>
      </header>

      {/* Mandatory Mock Data Warning Banner whenever DATA_SOURCE === "mock" */}
      <MockBanner />

      {/* Interactive Map Area with Floating Filter Panel, Legend, and Metadata Panel */}
      <main className="relative h-full w-full flex-1 overflow-hidden">
        <FilterPanel />
        <MetadataPanel />
        <EmptyFilterState />
        <MapCanvas className="h-full w-full" />

        {/* Bottom-right unified container: Legend stacked above Attribution */}
        <div
          data-testid="bottom-right-container"
          className="absolute bottom-2 right-2 z-20 flex flex-col items-end gap-1.5 pointer-events-none"
        >
          <MapLegend />
          <OsmAttribution />
        </div>
      </main>
    </div>
  );
}
