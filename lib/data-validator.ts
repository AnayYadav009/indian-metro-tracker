import { z } from "zod";
import {
  CitySchema,
  LineSchema,
  SegmentFeatureCollectionSchema,
  StationFeatureCollectionSchema,
} from "../types/schema";
import type { City, Line, MetroDataset } from "../types/metro";
import { calculateLineStringLengthKm, checkLengthMismatch } from "./geo";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  dataset?: MetroDataset;
}

/**
 * Validates raw metro data against Zod schemas and relational consistency rules.
 * Zero-code-change requirement: Cities, lines, and phases are dynamically checked
 * based on data files, allowing any new city to be added with zero code modifications.
 */
export function validateMetroDataset(rawData: {
  cities: unknown;
  lines: unknown;
  segments: unknown;
  stations: unknown;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validate Cities schema
  const citiesParsed = z.array(CitySchema).safeParse(rawData.cities);
  if (!citiesParsed.success) {
    errors.push(
      ...citiesParsed.error.issues.map(
        (i) => `City schema error at ${i.path.join(".")}: ${i.message}`
      )
    );
  }

  // 2. Validate Lines schema
  const linesParsed = z.array(LineSchema).safeParse(rawData.lines);
  if (!linesParsed.success) {
    errors.push(
      ...linesParsed.error.issues.map(
        (i) => `Line schema error at ${i.path.join(".")}: ${i.message}`
      )
    );
  }

  // 3. Validate Segments schema
  const segmentsParsed = SegmentFeatureCollectionSchema.safeParse(
    rawData.segments
  );
  if (!segmentsParsed.success) {
    errors.push(
      ...segmentsParsed.error.issues.map(
        (i) => `Segment schema error at ${i.path.join(".")}: ${i.message}`
      )
    );
  }

  // 4. Validate Stations schema
  const stationsParsed = StationFeatureCollectionSchema.safeParse(
    rawData.stations
  );
  if (!stationsParsed.success) {
    errors.push(
      ...stationsParsed.error.issues.map(
        (i) => `Station schema error at ${i.path.join(".")}: ${i.message}`
      )
    );
  }

  if (
    !citiesParsed.success ||
    !linesParsed.success ||
    !segmentsParsed.success ||
    !stationsParsed.success
  ) {
    return { valid: false, errors, warnings };
  }

  const cities = citiesParsed.data;
  const lines = linesParsed.data;
  const segments = segmentsParsed.data;
  const stations = stationsParsed.data;

  // Build lookup maps for relational validation
  const cityByNameOrId = new Map<string, City>();
  cities.forEach((c) => {
    cityByNameOrId.set(c.id.toLowerCase(), c);
    cityByNameOrId.set(c.name.toLowerCase(), c);
  });

  const lineById = new Map<string, Line>();
  lines.forEach((l) => lineById.set(l.id, l));

  // 5. Relational validation for Segments
  for (const feature of segments.features) {
    const props = feature.properties;

    // Verify city exists
    const city = cityByNameOrId.get(props.city.toLowerCase());
    if (!city) {
      errors.push(
        `Segment "${props.segment_id}" references unknown city "${props.city}"`
      );
    } else {
      // Validate dynamic phase constraint per city
      if (!city.phases.includes(props.phase)) {
        errors.push(
          `Segment "${props.segment_id}" has phase "${props.phase}", but city "${city.name}" only allows phases: [${city.phases.join(", ")}]`
        );
      }
    }

    // Verify line_id exists
    if (!lineById.has(props.line_id)) {
      errors.push(
        `Segment "${props.segment_id}" references unknown line_id "${props.line_id}"`
      );
    }

    // Geometry length sanity check (flag >10% mismatch)
    const computedKm = calculateLineStringLengthKm(
      feature.geometry.coordinates as [number, number][]
    );
    const lengthCheck = checkLengthMismatch(props.length_km, computedKm, 10);
    if (lengthCheck.isMismatch) {
      warnings.push(
        `Segment "${props.segment_id}" length mismatch: declared ${props.length_km} km vs computed ${lengthCheck.computedKm} km (${lengthCheck.mismatchPct}% difference)`
      );
    }
  }

  // 6. Relational validation for Stations
  for (const feature of stations.features) {
    const props = feature.properties;

    // Verify city exists
    const city = cityByNameOrId.get(props.city.toLowerCase());
    if (!city) {
      errors.push(
        `Station "${props.station_id}" references unknown city "${props.city}"`
      );
    } else {
      // Validate dynamic phase constraint per city
      if (!city.phases.includes(props.phase)) {
        errors.push(
          `Station "${props.station_id}" has phase "${props.phase}", but city "${city.name}" only allows phases: [${city.phases.join(", ")}]`
        );
      }
    }

    // Verify every line_id exists
    for (const lineId of props.line_ids) {
      if (!lineById.has(lineId)) {
        errors.push(
          `Station "${props.station_id}" references unknown line_id "${lineId}"`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    dataset: errors.length === 0 ? { cities, lines, segments, stations } : undefined,
  };
}
