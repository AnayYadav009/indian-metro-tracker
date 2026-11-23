import type { Status } from "@/types/schema";

export const STATION_STYLE = {
  fill: "#ffffff",
  stroke: {
    operational: "#0f172a",
    construction: "#f59e0b",
    planned: "#8b5cf6",
  } satisfies Record<Status, string>,
  strokeWidth: {
    standard: 1.5,
    interchange: 3,
  },
  radius: {
    standard: 4,
    interchange: 8,
  },
} as const;

export function stationStrokeExpression(): any[] {
  return [
    "case",
    ["==", ["get", "status"], "operational"],
    STATION_STYLE.stroke.operational,
    ["==", ["get", "status"], "construction"],
    STATION_STYLE.stroke.construction,
    STATION_STYLE.stroke.planned,
  ];
}
