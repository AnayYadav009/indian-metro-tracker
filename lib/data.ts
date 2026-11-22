import citiesJson from "@/data/cities.json";
import linesJson from "@/data/lines.json";
import segmentsGeoJson from "@/data/segments.geojson";
import stationsGeoJson from "@/data/stations.geojson";
import faresJson from "@/data/fares.json";
import timingsJson from "@/data/timings.json";

import type {
  City,
  Line,
  MetroDataset,
  SegmentFeature,
  SegmentFeatureCollection,
  SegmentFilterOptions,
  StationFeature,
  StationFeatureCollection,
  StationFilterOptions,
  FareRule,
  ServiceHours,
} from "@/types/metro";

export type DataSourceState = "mock" | "real" | "mixed";

/**
 * Pure function to determine the dataset source state across all entities.
 * Returns:
 * - "mock" if every record is mock
 * - "real" if every record has a non-mock source
 * - "mixed" if some records are mock and some are real
 * Overridden if envOverride ("mock" | "real" | "mixed") is provided.
 */
export function determineDataSourceState(
  segments: { features?: Array<{ properties?: { source?: string } }> },
  stations: { features?: Array<{ properties?: { source?: string } }> },
  lines: Array<{ source?: string }>,
  envOverride?: string
): DataSourceState {
  if (envOverride === "mock" || envOverride === "real" || envOverride === "mixed") {
    return envOverride;
  }

  const segs = segments?.features ?? [];
  const stas = stations?.features ?? [];
  const lns = Array.isArray(lines) ? lines : [];

  const isMock = (s?: string) => !!s && s.toLowerCase() === "mock";
  const isReal = (s?: string) => !!s && s.toLowerCase() !== "mock";

  const hasMock =
    segs.some((f) => isMock(f?.properties?.source)) ||
    stas.some((f) => isMock(f?.properties?.source)) ||
    lns.some((l) => isMock(l?.source));

  const hasReal =
    segs.some((f) => isReal(f?.properties?.source)) ||
    stas.some((f) => isReal(f?.properties?.source)) ||
    lns.some((l) => isReal(l?.source));

  if (hasMock && hasReal) return "mixed";
  if (hasReal) return "real";
  return "mock";
}

export const DATA_SOURCE: DataSourceState = determineDataSourceState(
  segmentsGeoJson as unknown as SegmentFeatureCollection,
  stationsGeoJson as unknown as StationFeatureCollection,
  linesJson as unknown as Line[],
  process.env.NEXT_PUBLIC_DATA_SOURCE
);

let cachedDataset: MetroDataset | null = null;
let segmentsById: Map<string, SegmentFeature> | null = null;
let stationsById: Map<string, StationFeature> | null = null;

/**
 * Loads and returns the full metro dataset.
 * Data is validated at build/prebuild time, avoiding client-side runtime overhead.
 */
export function getMetroData(): MetroDataset {
  if (cachedDataset) {
    return cachedDataset;
  }

  cachedDataset = {
    cities: citiesJson as City[],
    lines: linesJson as Line[],
    segments: segmentsGeoJson as unknown as SegmentFeatureCollection,
    stations: stationsGeoJson as unknown as StationFeatureCollection,
    fareRules: faresJson as FareRule[],
    serviceHours: timingsJson as ServiceHours[],
  };

  // Build O(1) indexed lookup maps for performance
  segmentsById = new Map();
  for (const seg of cachedDataset.segments.features) {
    segmentsById.set(seg.properties.segment_id, seg);
  }

  stationsById = new Map();
  for (const st of cachedDataset.stations.features) {
    stationsById.set(st.properties.station_id, st);
  }

  return cachedDataset;
}

/**
 * Get all available cities.
 */
export function getCities(): City[] {
  return getMetroData().cities;
}

/**
 * Get all lines, optionally filtered by city name or id.
 */
export function getLines(cityId?: string): Line[] {
  const { lines, cities } = getMetroData();
  if (!cityId) return lines;

  const targetCity = cities.find(
    (c) => c.id.toLowerCase() === cityId.toLowerCase() || c.name.toLowerCase() === cityId.toLowerCase()
  );
  if (!targetCity) return [];

  return lines.filter((l) => l.city_id === targetCity.id);
}

/** Shared predicate for city/status/phase filter options used by getSegments and getStations. */
function matchesBaseFilterOptions(
  props: { city_id: string; status: string; phase: string },
  options: { cityId?: string; status?: string; phase?: string }
): boolean {
  if (options.cityId && props.city_id.toLowerCase() !== options.cityId.toLowerCase()) {
    return false;
  }
  if (options.status && props.status !== options.status) {
    return false;
  }
  if (options.phase && props.phase !== options.phase) {
    return false;
  }
  return true;
}

/**
 * Get segments with optional filter parameters.
 */
export function getSegments(options: SegmentFilterOptions = {}): SegmentFeature[] {
  const { segments } = getMetroData();

  return segments.features.filter((feature) => {
    const props = feature.properties;
    if (!matchesBaseFilterOptions(props, options)) return false;
    if (options.lineId && props.line_id !== options.lineId) {
      return false;
    }
    return true;
  });
}

/**
 * Get stations with optional filter parameters.
 */
export function getStations(options: StationFilterOptions = {}): StationFeature[] {
  const { stations } = getMetroData();

  return stations.features.filter((feature) => {
    const props = feature.properties;
    if (!matchesBaseFilterOptions(props, options)) return false;
    if (options.lineId && !props.line_ids.includes(options.lineId)) {
      return false;
    }
    if (
      options.isInterchange !== undefined &&
      props.is_interchange !== options.isInterchange
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Find a segment by its unique segment_id (O(1) indexed lookup).
 */
export function getSegmentById(segmentId: string): SegmentFeature | undefined {
  if (!segmentsById) {
    getMetroData();
  }
  return segmentsById?.get(segmentId);
}

/**
 * Find a station by its unique station_id (O(1) indexed lookup).
 */
export function getStationById(stationId: string): StationFeature | undefined {
  if (!stationsById) {
    getMetroData();
  }
  return stationsById?.get(stationId);
}

/**
 * Returns names of cities that contain any mock data records.
 */
export function getMockCityNames(): string[] {
  const { segments, stations } = getMetroData();
  return [...new Set([...segments.features, ...stations.features]
    .filter(({ properties }) => properties.source?.toLowerCase() === "mock")
    .map(({ properties }) => properties.city))];
}

/**
 * Derives a formatted summary of the active dataset:
 * - Formats the latest last_verified date (e.g., "Oct 2026")
 * - Extracts and formats unique source organizations (e.g., "OSM, DMRC, BMRCL, MMRDA")
 */
export function getDatasetMetadataSummary(): {
  lastVerifiedFormatted: string;
  badgeLabel: string;
} {
  const { lines, segments, stations } = getMetroData();

  let latestDateStr = "";

  const checkDate = (r?: { retrieved_at?: string | null }) => {
    if (r?.retrieved_at && r.retrieved_at > latestDateStr) {
      latestDateStr = r.retrieved_at;
    }
  };

  for (const l of lines) checkDate(l);
  for (const f of segments.features) checkDate(f.properties);
  for (const f of stations.features) checkDate(f.properties);

  let dateFormatted = "";
  if (latestDateStr) {
    try {
      const [year, month] = latestDateStr.split("-");
      if (year && month) {
        const monthNames = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        const monthIdx = parseInt(month, 10) - 1;
        dateFormatted = `${monthNames[monthIdx] || month} ${year}`;
      } else {
        dateFormatted = latestDateStr;
      }
    } catch {
      dateFormatted = latestDateStr;
    }
  }

  return {
    lastVerifiedFormatted: dateFormatted,
    badgeLabel: dateFormatted ? `Data retrieved: ${dateFormatted}` : "Data date not recorded",
  };
}
