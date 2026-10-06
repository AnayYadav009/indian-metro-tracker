import { z } from "zod";
import citiesJson from "@/data/cities.json";
import linesJson from "@/data/lines.json";
import segmentsGeoJson from "@/data/segments.geojson";
import stationsGeoJson from "@/data/stations.geojson";

import {
  CitySchema,
  LineSchema,
  SegmentFeatureCollectionSchema,
  StationFeatureCollectionSchema,
} from "@/types/schema";
import type {
  City,
  Line,
  MetroDataset,
  SegmentFeature,
  SegmentFilterOptions,
  StationFeature,
  StationFilterOptions,
} from "@/types/metro";
import { calculateLineStringLengthKm, checkLengthMismatch } from "./geo";

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
  segmentsGeoJson as any,
  stationsGeoJson as any,
  linesJson as any,
  process.env.NEXT_PUBLIC_DATA_SOURCE
);



import { validateMetroDataset, type ValidationResult } from "./data-validator";
export { validateMetroDataset, type ValidationResult };

let cachedDataset: MetroDataset | null = null;

/**
 * Loads, validates, and returns the full metro dataset.
 * Throws an error if data validation fails.
 */
export function getMetroData(): MetroDataset {
  if (cachedDataset) {
    return cachedDataset;
  }

  const result = validateMetroDataset({
    cities: citiesJson,
    lines: linesJson,
    segments: segmentsGeoJson,
    stations: stationsGeoJson,
  });

  if (!result.valid || !result.dataset) {
    throw new Error(
      `Metro dataset validation failed with ${result.errors.length} error(s):\n${result.errors.join("\n")}`
    );
  }

  if (result.warnings.length > 0) {
    console.warn(`Metro dataset warnings (${result.warnings.length}):\n${result.warnings.join("\n")}`);
  }

  cachedDataset = result.dataset;
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
export function getLines(city?: string): Line[] {
  const { lines, cities } = getMetroData();
  if (!city) return lines;

  const targetCity = cities.find(
    (c) => c.id.toLowerCase() === city.toLowerCase() || c.name.toLowerCase() === city.toLowerCase()
  );
  if (!targetCity) return [];

  return lines.filter(
    (l) => l.city.toLowerCase() === targetCity.name.toLowerCase() || l.city.toLowerCase() === targetCity.id.toLowerCase()
  );
}

/**
 * Get segments with optional filter parameters.
 */
export function getSegments(options: SegmentFilterOptions = {}): SegmentFeature[] {
  const { segments } = getMetroData();

  return segments.features.filter((feature) => {
    const props = feature.properties;
    if (options.city && props.city.toLowerCase() !== options.city.toLowerCase()) {
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
    if (options.city && props.city.toLowerCase() !== options.city.toLowerCase()) {
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
 * Find a segment by its unique segment_id.
 */
export function getSegmentById(segmentId: string): SegmentFeature | undefined {
  const { segments } = getMetroData();
  return segments.features.find((f) => f.properties.segment_id === segmentId);
}

/**
 * Find a station by its unique station_id.
 */
export function getStationById(stationId: string): StationFeature | undefined {
  const { stations } = getMetroData();
  return stations.features.find((f) => f.properties.station_id === stationId);
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
