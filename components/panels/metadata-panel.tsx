"use client";

import React from "react";
import { X } from "lucide-react";
import { useMetroStore } from "@/store/use-metro-store";
import { SegmentDetail } from "./segment-detail";
import { StationDetail } from "./station-detail";
import { OsmAttribution } from "@/components/map/osm-attribution";

export function MetadataPanel() {
  const selectedFeature = useMetroStore((state) => state.selectedFeature);
  const clearSelectedFeature = useMetroStore(
    (state) => state.clearSelectedFeature
  );

  if (!selectedFeature) {
    return null;
  }

  const isSegment = selectedFeature.type === "segment";
  const title = isSegment ? "Metro Segment Details" : "Metro Station Details";

  return (
    <div
      data-testid="metadata-panel"
      className="fixed inset-x-0 bottom-0 z-30 flex max-h-[80vh] flex-col rounded-t-2xl border-t border-slate-800 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-md transition-all duration-200 md:absolute md:top-4 md:right-14 md:bottom-auto md:inset-x-auto md:w-96 md:max-h-[calc(100vh-6rem)] md:rounded-xl md:border md:border-slate-800"
    >
      {/* Mobile drag / swipe pill indicator */}
      <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-slate-700 md:hidden" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-sky-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
            {title}
          </h2>
        </div>

        <button
          type="button"
          data-testid="close-metadata-panel"
          onClick={clearSelectedFeature}
          aria-label="Close details"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/80 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body content */}
      <div className="overflow-y-auto pt-4 pr-1">
        {isSegment ? (
          <SegmentDetail segment={selectedFeature.data} />
        ) : (
          <StationDetail station={selectedFeature.data} />
        )}
      </div>

      {/* Mobile-only visible attribution docked at the bottom of the open sheet */}
      <div className="mt-3 pt-2 border-t border-slate-800/60 md:hidden">
        <OsmAttribution
          data-testid="osm-attribution-mobile"
          className="border-0 bg-transparent px-0 py-0 shadow-none text-[10px]"
        />
      </div>
    </div>
  );
}

export default MetadataPanel;
