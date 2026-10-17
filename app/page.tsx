"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BarChart3, Navigation, Building2, X } from "lucide-react";
import citiesJson from "@/data/cities.json";
import { MapSkeleton } from "@/components/map/map-skeleton";
import { FilterPanel } from "@/components/filters/filter-panel";
import { MetadataPanel } from "@/components/panels/metadata-panel";
import { NearestStationPanel } from "@/components/panels/nearest-station-panel";
import { MapLegend } from "@/components/legend/map-legend";
import { MockBanner } from "@/components/ui/mock-banner";
import { NetworkStats } from "@/components/filters/network-stats";
import { EmptyFilterState } from "@/components/map/empty-state";
import { OsmAttribution } from "@/components/map/osm-attribution";
import { TimelineSlider } from "@/components/timeline/timeline-slider";
import { BASEMAP_CONFIG } from "@/lib/map-config";
import { getDatasetMetadataSummary } from "@/lib/data";
import { useMetroStore } from "@/store/use-metro-store";

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
  const isNearestPanelOpen = useMetroStore((state) => state.isNearestPanelOpen);
  const setIsNearestPanelOpen = useMetroStore(
    (state) => state.setIsNearestPanelOpen
  );
  const [isCityDirectoryOpen, setIsCityDirectoryOpen] = React.useState(false);

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
          <button
            onClick={() => setIsNearestPanelOpen(!isNearestPanelOpen)}
            data-testid="find-nearest-btn"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              isNearestPanelOpen
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                : "border-slate-700 bg-slate-800/80 text-slate-200 hover:border-slate-500 hover:bg-slate-700 hover:text-white"
            }`}
            title="Find nearest metro station"
          >
            <Navigation className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Nearest</span>
          </button>
          <button
            onClick={() => setIsCityDirectoryOpen(!isCityDirectoryOpen)}
            data-testid="city-directory-btn"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              isCityDirectoryOpen
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                : "border-slate-700 bg-slate-800/80 text-slate-200 hover:border-slate-500 hover:bg-slate-700 hover:text-white"
            }`}
            title="Browse all city metro networks"
          >
            <Building2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Cities</span>
          </button>
          <Link
            href="/compare"
            data-testid="nav-to-compare"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700 hover:text-white"
            title="View Comparison Dashboard"
          >
            <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Compare</span>
          </Link>
          <span
            data-testid="data-last-updated"
            className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 md:px-2.5 md:text-xs"
          >
            {metadataSummary.badgeLabel}
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-slate-300">
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
        <NearestStationPanel />
        <EmptyFilterState />
        <TimelineSlider />
        <MapCanvas className="h-full w-full" />

        {/* City Directory Modal */}
        {isCityDirectoryOpen && (
          <div
            data-testid="city-directory-modal"
            className="absolute inset-x-4 top-4 z-30 mx-auto max-w-lg rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">
                  City Metro Directories ({citiesJson.length})
                </h2>
              </div>
              <button
                onClick={() => setIsCityDirectoryOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                title="Close directory"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3">
              {citiesJson.map((c) => (
                <Link
                  key={c.id}
                  href={`/city/${c.id}/`}
                  className="rounded-lg border border-slate-800 bg-slate-800/50 px-2.5 py-2 text-xs font-medium text-slate-200 hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Crawlable Semantic Nav for Search Engines */}
        <nav
          aria-label="City Directory"
          data-testid="crawlable-city-directory"
          className="sr-only"
        >
          <h2>City Metro Networks</h2>
          <ul>
            {citiesJson.map((city) => (
              <li key={city.id}>
                <Link href={`/city/${city.id}/`}>{city.name} Metro</Link>
              </li>
            ))}
          </ul>
        </nav>

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
