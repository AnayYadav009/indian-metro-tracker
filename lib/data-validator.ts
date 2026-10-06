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
export function validateMetroDataset(
  rawData: {
    cities: unknown;
    lines: unknown;
    segments: unknown;
    stations: unknown;
  },
  options?: { currentDate?: string }
): ValidationResult {
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
  const cityById = new Map<string, City>();
  const cityByNameOrId = new Map<string, City>();
  const seenCityIds = new Set<string>();
  cities.forEach((c) => {
    if (seenCityIds.has(c.id.toLowerCase())) {
      errors.push(`Duplicate city ID '${c.id}' found`);
    }
    seenCityIds.add(c.id.toLowerCase());
    cityById.set(c.id, c);
    cityByNameOrId.set(c.id.toLowerCase(), c);
    cityByNameOrId.set(c.name.toLowerCase(), c);
  });

  const lineById = new Map<string, Line>();
  const seenLineIds = new Set<string>();
  lines.forEach((l) => {
    if (seenLineIds.has(l.id)) {
      errors.push(`Duplicate line ID '${l.id}' found`);
    }
    seenLineIds.add(l.id);
    lineById.set(l.id, l);

    const lineCity = cityById.get(l.city_id);
    if (!lineCity) {
      errors.push(`Line '${l.id}' references unknown city_id '${l.city_id}'`);
    } else if (l.city !== lineCity.name) {
      errors.push(
        `Line '${l.id}' city '${l.city}' must match city name '${lineCity.name}' for city_id '${l.city_id}'`
      );
    }
  });

  // Track segment ID uniqueness
  const seenSegmentIds = new Set<string>();
  // 5. Relational validation for Segments
  for (const feature of segments.features) {
    const props = feature.properties;

    if (seenSegmentIds.has(props.segment_id)) {
      errors.push(
        `Duplicate segment ID '${props.segment_id}' found across segments collection`
      );
    }
    seenSegmentIds.add(props.segment_id);

    // Verify city_id and city exist
    const segCity = cityById.get(props.city_id);
    if (!segCity) {
      errors.push(
        `Segment '${props.segment_id}' references unknown city_id '${props.city_id}'`
      );
    } else if (props.city !== segCity.name) {
      errors.push(
        `Segment '${props.segment_id}' city '${props.city}' must match city name '${segCity.name}' for city_id '${props.city_id}'`
      );
    }

    const city = segCity || cityByNameOrId.get(props.city.toLowerCase());
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

    // 1.1 References required for non-mock segments with source !== "osm"
    const isNonMock = props.source.toLowerCase() !== "mock";
    const isNotPureOsm = props.source.toLowerCase() !== "osm";
    const missingRefs = !props.references || props.references.length === 0;

    if (isNonMock && isNotPureOsm && missingRefs) {
      if (props.status === "construction" || props.status === "planned") {
        errors.push(
          `Segment '${props.segment_id}' (${props.status}) has source '${props.source}' but missing or empty references array`
        );
      } else if (props.status === "operational") {
        warnings.push(
          `Operational segment '${props.segment_id}' has non-osm source '${props.source}' without references citations`
        );
      }
    }

    // 1.2 Staleness check for construction segments
    if (props.status === "construction" && props.expected_completion) {
      const currentDate = options?.currentDate || new Date().toISOString().slice(0, 10);
      let isPast = false;
      if (props.expected_completion.length === 4) {
        isPast = `${props.expected_completion}-12-31` < currentDate;
      } else {
        const [year, month] = props.expected_completion.split("-");
        const lastDayOfMonth = new Date(Number(year), Number(month), 0).getDate();
        const formattedMonthEnd = `${props.expected_completion}-${String(lastDayOfMonth).padStart(2, "0")}`;
        isPast = formattedMonthEnd < currentDate;
      }

      if (isPast) {
        warnings.push(
          `Construction segment '${props.segment_id}' has stale expected_completion '${props.expected_completion}' earlier than current date '${currentDate}'`
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

  // Track station ID uniqueness
  const seenStationIds = new Set<string>();
  // 6. Relational validation for Stations
  for (const feature of stations.features) {
    const props = feature.properties;

    if (seenStationIds.has(props.station_id)) {
      errors.push(
        `Duplicate station ID '${props.station_id}' found across stations collection`
      );
    }
    seenStationIds.add(props.station_id);

    // Verify city_id and city exist
    const stCity = cityById.get(props.city_id);
    if (!stCity) {
      errors.push(
        `Station '${props.station_id}' references unknown city_id '${props.city_id}'`
      );
    } else if (props.city !== stCity.name) {
      errors.push(
        `Station '${props.station_id}' city '${props.city}' must match city name '${stCity.name}' for city_id '${props.city_id}'`
      );
    }

    const city = stCity || cityByNameOrId.get(props.city.toLowerCase());
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
