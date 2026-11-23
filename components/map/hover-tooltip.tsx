"use client";

import React from "react";
import { useMetroStore } from "@/store/use-metro-store";
import { StatusBadge } from "@/components/panels/badge-indicators";

export function HoverTooltip() {
  const hoveredFeature = useMetroStore((state) => state.hoveredFeature);

  if (!hoveredFeature) {
    return null;
  }

  return (
    <div
      data-testid="hover-tooltip"
      className="pointer-events-none absolute z-30 flex flex-col gap-1 rounded-lg border border-slate-700/80 bg-slate-900/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-sm transition-opacity"
      style={{
        left: `${hoveredFeature.x + 12}px`,
        top: `${hoveredFeature.y + 12}px`,
      }}
    >
      <div className="flex items-center gap-2">
        {hoveredFeature.color && (
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: hoveredFeature.color }}
          />
        )}
        <span className="font-semibold text-slate-100">{hoveredFeature.name}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <span className="capitalize">{hoveredFeature.type}</span>
        <span>•</span>
        <StatusBadge status={hoveredFeature.status} className="scale-90 origin-left" />
      </div>
    </div>
  );
}
