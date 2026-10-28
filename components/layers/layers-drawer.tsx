"use client";

import { X } from "lucide-react";
import { FilterPanel } from "@/components/filters/filter-panel";
import { MapLegend } from "@/components/legend/map-legend";
import { TimelineSlider } from "@/components/timeline/timeline-slider";
import { OsmAttribution } from "@/components/map/osm-attribution";
import { BASEMAP_CONFIG } from "@/lib/map-config";
import { getDatasetMetadataSummary } from "@/lib/data";

interface LayersDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function LayersDrawer({ open, onClose }: LayersDrawerProps) {
  const metadata = open ? getDatasetMetadataSummary() : null;

  return (
    <aside
      hidden={!open}
      id="layers-drawer"
      data-testid="layers-drawer"
      aria-label="Layers and settings"
      className="absolute inset-x-2 top-2 z-40 flex max-h-[calc(100vh_-_5rem)] flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:right-4 sm:w-[min(28rem,calc(100%_-_2rem))]"
      style={{ display: open ? "flex" : "none" }}
    >
      {open && (
        <>
          <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-semibold">Layers &amp; Settings</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close layers and settings"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain p-3">
            <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs text-slate-400">
              <h3 className="mb-2 font-semibold text-slate-300">Data &amp; Credits</h3>
              <p data-testid="data-last-updated">{metadata?.badgeLabel}</p>
              <p>Basemap: {BASEMAP_CONFIG.name}</p>
              <OsmAttribution />
            </section>
            <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-2">
              <h3 className="px-2 pb-2 text-xs font-semibold text-slate-300">Timeline</h3>
              <TimelineSlider embedded />
            </section>
            <FilterPanel embedded />
            <MapLegend />
          </div>
        </>
      )}
    </aside>
  );
}
