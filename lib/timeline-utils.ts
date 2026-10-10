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
  const points: YearKmPoint[] = [];

  for (let yr = minYear; yr <= maxYear; yr++) {
    let km = 0;
    for (const seg of segments) {
      if (seg.status === "operational") {
        const openedYear = extractYear(seg.inaugurated_on);
        if (openedYear !== null && openedYear <= yr) {
          km += seg.length_km;
        }
      }
    }
    points.push({
      year: yr,
      operationalKm: Math.round(km * 10) / 10,
    });
  }

  return points;
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
  let segs = 0;
  for (const seg of segments) {
    if (seg.status === "operational" && !seg.inaugurated_on) {
      segs++;
    }
  }

  let stns = 0;
  for (const stn of stations) {
    if (stn.status === "operational" && !stn.opened_on) {
      stns++;
    }
  }

  return {
    undatedOperationalSegments: segs,
    undatedOperationalStations: stns,
  };
}
