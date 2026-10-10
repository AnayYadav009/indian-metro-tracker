import type { LayerProps } from "react-map-gl/maplibre";
import type { Status } from "@/types/schema";
import { STATION_STYLE, stationStrokeExpression } from "@/lib/station-style";
import { buildVisibilityExpression } from "@/lib/filter-utils";

/**
 * Layer IDs that receive pointer events (click, hover).
 */
export const INTERACTIVE_LAYER_IDS = [
  "interchange-points",
  "station-points",
  "operational-lines",
  "construction-lines",
  "planned-lines",
];

/**
 * Standard data-driven zoom-based line width interpolation across all statuses.
 */
export const LINE_WIDTH_ZOOM_EXPRESSION: unknown[] = [
  "interpolate",
  ["linear"],
  ["zoom"],
  6,
  2.5,
  10,
  4,
  14,
  6,
];

const FUTURE_LINE_WIDTH_EXPRESSION: unknown[] = [
  "case",
  ["==", ["get", "geometry_quality"], "schematic"],
  2,
  4,
];

/**
 * 1. Operational Lines Layer:
 * Solid stroke, data-driven line-color based on segment's color.
 */
export const operationalLineLayer: LayerProps = {
  id: "operational-lines",
  type: "line",
  source: "metro-segments",
  filter: ["==", ["get", "status"], "operational"],
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-color": ["get", "color"],
    "line-width": LINE_WIDTH_ZOOM_EXPRESSION as any,
    "line-opacity": 0.95,
  },
};

/**
 * 2. Construction Lines Layer:
 * Dashed stroke [4, 2], data-driven line-color.
 */
export const constructionLineLayer: LayerProps = {
  id: "construction-lines",
  type: "line",
  source: "metro-segments",
  filter: ["==", ["get", "status"], "construction"],
  layout: {
    "line-cap": "butt",
    "line-join": "round",
  },
  paint: {
    "line-color": ["get", "color"],
    "line-width": FUTURE_LINE_WIDTH_EXPRESSION as any,
    "line-dasharray": [4, 2],
    "line-opacity": 0.9,
  },
};

/**
 * 3. Planned Lines Layer:
 * Dotted stroke [0.1, 2] with line-cap: round (renders as distinct dots).
 */
export const plannedLineLayer: LayerProps = {
  id: "planned-lines",
  type: "line",
  source: "metro-segments",
  filter: ["==", ["get", "status"], "planned"],
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-color": ["get", "color"],
    "line-width": LINE_WIDTH_ZOOM_EXPRESSION as any,
    "line-dasharray": [0.1, 2],
    "line-opacity": 0.85,
  },
};

/**
 * Selection Highlight Layer for Segments:
 * Renders an accent casing / glow outline around the currently selected segment.
 */
export const getSelectedSegmentLayer = (selectedId: string | null): LayerProps => ({
  id: "selected-segment-glow",
  type: "line",
  source: "metro-segments",
  filter: ["==", ["get", "segment_id"], selectedId || "__NONE__"],
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-color": "#38bdf8", // Sky-400 accent glow
    "line-width": [
      "interpolate",
      ["linear"],
      ["zoom"],
      6,
      5.5,
      10,
      8,
      14,
      12,
    ],
    "line-opacity": 0.8,
  },
});

/**
 * 4. Station Points Layer:
 * Circle markers with larger radius & prominent stroke for interchange stations.
 */
export const stationCircleLayer: LayerProps = {
  id: "station-points",
  type: "circle",
  source: "metro-stations",
  minzoom: 8,
  paint: {
    "circle-radius": [
      "case",
      ["get", "is_interchange"],
      STATION_STYLE.radius.interchange,
      STATION_STYLE.radius.standard,
    ],
    "circle-color": STATION_STYLE.fill,
    "circle-stroke-width": [
      "case",
      ["get", "is_interchange"],
      STATION_STYLE.strokeWidth.interchange,
      STATION_STYLE.strokeWidth.standard,
    ],
    "circle-stroke-color": stationStrokeExpression() as any,
  },
};

/**
 * 4a. Interchange Station Layer:
 * Larger white-filled ring with prominent border, rendered above plain station dots.
 * Only visible for stations where is_interchange=true.
 * Uses a shape-distinct marker (double ring) that does not depend on line colour.
 */
export const interchangeStationLayer: LayerProps = {
  id: "interchange-points",
  type: "circle",
  source: "metro-stations",
  minzoom: 8,
  filter: ["==", ["get", "is_interchange"], true],
  paint: {
    "circle-radius": STATION_STYLE.radius.interchange,
    "circle-color": STATION_STYLE.fill,
    "circle-stroke-width": STATION_STYLE.strokeWidth.interchange,
    "circle-stroke-color": stationStrokeExpression() as any,
    "circle-opacity": 1,
  },
};

/**
 * Selection Highlight Layer for Stations:
 * Outer glowing ring around the currently selected station.
 */
export const getSelectedStationLayer = (selectedId: string | null): LayerProps => ({
  id: "selected-station-highlight",
  type: "circle",
  source: "metro-stations",
  filter: ["==", ["get", "station_id"], selectedId || "__NONE__"],
  paint: {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      8,
      8,
      13,
      13,
    ],
    "circle-color": "transparent",
    "circle-stroke-width": 3,
    "circle-stroke-color": "#38bdf8", // Sky-400 highlight ring
  },
});

/**
 * 5. Station Text Labels:
 * Visible at zoom >= 11.5 for context.
 */
export const stationLabelsLayer: LayerProps = {
  id: "station-labels",
  type: "symbol",
  source: "metro-stations",
  minzoom: 11.5,
  layout: {
    "text-field": ["get", "name"],
    "text-size": 11,
    "text-anchor": "top",
    "text-offset": [0, 0.8],
  },
  paint: {
    "text-color": "#e2e8f0",
    "text-halo-color": "#020617",
    "text-halo-width": 1.5,
  },
};

export function withVisibility<T extends LayerProps>(layer: T, visible: boolean): T {
  const layout = "layout" in layer ? layer.layout : undefined;
  return {
    ...layer,
    layout: {
      ...layout,
      visibility: visible ? "visible" : "none",
    },
  } as T;
}

/**
 * Strongly typed helper to apply dynamic runtime filter expressions to MapLibre LayerProps without casting.
 */
export function withFilter<T extends LayerProps>(layer: T, filter?: unknown): T {
  if (!filter) return layer;
  return {
    ...layer,
    filter,
  } as T;
}

/**
 * Builds WebGL filter condition for a segment status layer based on store state and timeline scrubber.
 */
export function buildStatusFilter(
  status: "operational" | "construction" | "planned",
  selectedStatuses: Status[],
  selectedCityId: string | null,
  selectedPhases: string[],
  selectedYear: number | null = null,
  includeFuture: boolean = true
): unknown[] {
  if (!selectedStatuses.includes(status)) {
    return ["==", ["get", "status"], "__NONE__"];
  }

  return buildVisibilityExpression(status, {
    year: selectedYear,
    includeFuture,
    cityId: selectedCityId,
    phases: selectedPhases,
  });
}

/**
 * Builds WebGL filter condition for the station points layer based on store state and timeline scrubber.
 */
export function buildStationFilter(
  selectedStatuses: Status[],
  selectedCityId: string | null,
  selectedPhases: string[],
  selectedYear: number | null = null,
  includeFuture: boolean = true
): unknown[] {
  const filters = selectedStatuses.map((status) =>
    buildVisibilityExpression(status, {
      year: selectedYear,
      includeFuture,
      cityId: selectedCityId,
      phases: selectedPhases,
    })
  );
  return filters.length === 1 ? filters[0] : ["any", ...filters];
}
