import type { SegmentProperties, StationProperties } from "@/types/schema";

export const MIN_DATASET_YEAR = 1984; // Kolkata Metro opening
export const MAX_DATASET_YEAR = new Date().getFullYear();

/**
 * Extracts a 4-digit calendar year from date strings like YYYY-MM-DD or YYYY.
 */
export function extractYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})/);
  if (!match) return null;
  const yr = parseInt(match[1], 10);
  return Number.isNaN(yr) ? null : yr;
}

export interface YearKmPoint {
  year: number;
  operationalKm: number;
}

/**
 * Computes cumulative operational length (km) over time for each year from minYear to maxYear.
 * Uses segment length_km and inaugurated_on.
 */
export function computeCumulativeOperationalKm(
  segments: SegmentProperties[],
  minYear: number = MIN_DATASET_YEAR,
  maxYear: number = MAX_DATASET_YEAR
): YearKmPoint[] {
  const datedSegments = segments
    .filter((segment) => segment.status === "operational")
    .map(({ length_km, inaugurated_on }) => ({
      lengthKm: length_km,
      openedYear: extractYear(inaugurated_on),
    }))
    .filter(
      (segment): segment is { lengthKm: number; openedYear: number } =>
        segment.openedYear !== null
    );

  return Array.from(
    { length: Math.max(0, maxYear - minYear + 1) },
    (_, index) => {
      const year = minYear + index;
      const km = datedSegments.reduce(
        (total, segment) =>
          total + (segment.openedYear <= year ? segment.lengthKm : 0),
        0
      );
      return { year, operationalKm: Math.round(km * 10) / 10 };
    }
  );
}

export interface UndatedCounts {
  undatedOperationalSegments: number;
  undatedOperationalStations: number;
}

/**
 * Counts operational records that have no inauguration/opening date.
 */
export function countUndatedOperationalRecords(
  segments: SegmentProperties[],
  stations: StationProperties[]
): UndatedCounts {
  return {
    undatedOperationalSegments: segments.filter(
      (segment) => segment.status === "operational" && !segment.inaugurated_on
    ).length,
    undatedOperationalStations: stations.filter(
      (station) => station.status === "operational" && !station.opened_on
    ).length,
  };
}
