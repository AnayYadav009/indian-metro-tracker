import citiesJson from "@/data/cities.json";
import linesJson from "@/data/lines.json";
import segmentsGeoJson from "@/data/segments.geojson";
import stationsGeoJson from "@/data/stations.geojson";

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

  const allSources: string[] = [];
  if (segments?.features) {
    for (const f of segments.features) {
      if (f.properties?.source) allSources.push(f.properties.source);
    }
  }
  if (stations?.features) {
    for (const f of stations.features) {
      if (f.properties?.source) allSources.push(f.properties.source);
    }
  }
  if (Array.isArray(lines)) {
    for (const l of lines) {
      if (l?.source) allSources.push(l.source);
    }
  }

  if (allSources.length === 0) return "mock";

  const allMock = allSources.every((s) => s.toLowerCase() === "mock");
  if (allMock) return "mock";

  const allReal = allSources.every((s) => s.toLowerCase() !== "mock");
  if (allReal) return "real";

  return "mixed";
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

/**
 * Get segments with optional filter parameters.
 */
export function getSegments(options: SegmentFilterOptions = {}): SegmentFeature[] {
  const { segments } = getMetroData();

  return segments.features.filter((feature) => {
    const props = feature.properties;
    if (options.cityId && props.city_id.toLowerCase() !== options.cityId.toLowerCase()) {
      return false;
    }
    if (options.status && props.status !== options.status) {
      return false;
    }
    if (options.phase && props.phase !== options.phase) {
      return false;
    }
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
    if (options.cityId && props.city_id.toLowerCase() !== options.cityId.toLowerCase()) {
      return false;
    }
    if (options.status && props.status !== options.status) {
      return false;
    }
    if (options.phase && props.phase !== options.phase) {
      return false;
    }
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
  const mockCityNames = new Set<string>();

  for (const seg of segments.features) {
    if (seg.properties.source?.toLowerCase() === "mock") {
      mockCityNames.add(seg.properties.city);
    }
  }

  for (const stn of stations.features) {
    if (stn.properties.source?.toLowerCase() === "mock") {
      mockCityNames.add(stn.properties.city);
    }
  }

  return Array.from(mockCityNames);
}

/**
 * Derives a formatted summary of the active dataset:
 * - Formats the latest last_verified date (e.g., "Oct 2026")
 * - Extracts and formats unique source organizations (e.g., "OSM, DMRC, BMRCL, MMRDA")
 */
export function getDatasetMetadataSummary(): {
  lastVerifiedFormatted: string;
  sourcesFormatted: string;
  badgeLabel: string;
} {
  const { segments, stations } = getMetroData();

  let latestDateStr = "";
  const sourceTokens = new Set<string>();

  const processRecord = (props?: { source?: string; last_verified?: string | null }) => {
    if (!props) return;
    if (props.last_verified && props.last_verified > latestDateStr) {
      latestDateStr = props.last_verified;
    }
    if (props.source) {
      const parts = props.source.split(/[+,]/).map((p) => p.trim().toLowerCase());
      for (const part of parts) {
        if (part) sourceTokens.add(part);
      }
    }
  };

  for (const seg of segments.features) {
    processRecord(seg.properties);
  }
  for (const stn of stations.features) {
    processRecord(stn.properties);
  }

  let dateFormatted = "Unknown";
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

  const formattedSources = Array.from(sourceTokens).map((tok) => {
    switch (tok) {
      case "osm":
        return "OSM";
      case "dmrc":
        return "DMRC";
      case "bmrcl":
        return "BMRCL";
      case "mmrda":
        return "MMRDA";
      case "mock":
        return "Mock";
      default:
        return tok.toUpperCase();
    }
  });

  const sourcesStr = formattedSources.length > 0 ? formattedSources.join(", ") : "OSM";
  const badgeLabel = `Data: ${dateFormatted} (${sourcesStr})`;

  return {
    lastVerifiedFormatted: dateFormatted,
    sourcesFormatted: sourcesStr,
    badgeLabel,
  };
}
