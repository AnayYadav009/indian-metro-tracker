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

/**
 * Global DATA_SOURCE flag.
 * In v1, defaults to "mock" for mock datasets.
 */
const rawSegments = segmentsGeoJson as { features?: Array<{ properties?: { source?: string } }> };

export const DATA_SOURCE: "mock" | "real" =
  (process.env.NEXT_PUBLIC_DATA_SOURCE as "mock" | "real") ||
  (rawSegments?.features?.some((f) => f.properties?.source !== "mock") ? "real" : "mock");



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
