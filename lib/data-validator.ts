import { z } from "zod";
import {
  CitySchema,
  LineSchema,
  SegmentFeatureCollectionSchema,
  StationFeatureCollectionSchema,
} from "../types/schema";
import type { City, Line, MetroDataset } from "../types/metro";
import {
  calculateLineStringLengthKm,
  checkLengthMismatch,
  haversineDistanceM,
  nearestPointOnPolyline,
} from "./geo";

const INDIA_COORDINATE_ENVELOPE = {
  minLng: 68,
  maxLng: 98,
  minLat: 6,
  maxLat: 38,
} as const;

const BBOX_MARGIN_DEG = 0.05;

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
  const stationsById = new Map(
    stations.features.map((feature) => [feature.properties.station_id, feature])
  );

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

    if (props.geometry_quality === "schematic") {
      const coordinates = feature.geometry.coordinates as [number, number][];
      const ends = [coordinates[0], coordinates[coordinates.length - 1]];
      const endStations = ends.map((end) =>
        stations.features
          .filter((station) => station.properties.line_ids.includes(props.line_id))
          .map((station) => ({
            station,
            distanceM: haversineDistanceM(
              end,
              station.geometry.coordinates as [number, number]
            ),
          }))
          .sort((a, b) => a.distanceM - b.distanceM)[0]
      );

      if (
        endStations.some((entry) => !entry || entry.distanceM > 300) ||
        endStations[0]?.station.properties.station_id ===
          endStations[1]?.station.properties.station_id
      ) {
        errors.push(
          `Schematic segment '${props.segment_id}' must end at two distinct mapped stations on line '${props.line_id}' within 300 m`
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
    if (props.geometry_quality !== "schematic") {
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

    // Coordinate Envelope and City Bounding Box checks
    let segmentHasBboxWarning = false;
    for (const [lng, lat] of feature.geometry.coordinates) {
      if (
        lng < INDIA_COORDINATE_ENVELOPE.minLng ||
        lng > INDIA_COORDINATE_ENVELOPE.maxLng ||
        lat < INDIA_COORDINATE_ENVELOPE.minLat ||
        lat > INDIA_COORDINATE_ENVELOPE.maxLat
      ) {
        errors.push(
          `Segment '${props.segment_id}' coordinate [${lng}, ${lat}] is outside the valid India coordinate envelope (lng 68–98, lat 6–38) - possible swapped lat/lng`
        );
      } else if (city && !segmentHasBboxWarning) {
        const [minLng, minLat, maxLng, maxLat] = city.bbox;
        if (
          lng < minLng - BBOX_MARGIN_DEG ||
          lng > maxLng + BBOX_MARGIN_DEG ||
          lat < minLat - BBOX_MARGIN_DEG ||
          lat > maxLat + BBOX_MARGIN_DEG
        ) {
          segmentHasBboxWarning = true;
          warnings.push(
            `Segment '${props.segment_id}' (city: ${city.name}) has coordinate [${lng}, ${lat}] outside city bounding box margin [${city.bbox.join(", ")}] (+/-${BBOX_MARGIN_DEG}°)`
          );
        }
      }
    }
  }

  const segmentById = new Map(
    segments.features.map((feature) => [feature.properties.segment_id, feature])
  );
  for (const feature of segments.features) {
    const corridor = feature.properties.shared_corridor;
    if (!corridor) continue;
    const segmentId = feature.properties.segment_id;
    const peerId = corridor.segment_ids.find((id) => id !== segmentId);
    const peer = peerId ? segmentById.get(peerId) : undefined;
    if (
      corridor.segment_ids[0] === corridor.segment_ids[1] ||
      !corridor.segment_ids.includes(segmentId) ||
      !peer
    ) {
      errors.push(
        `Shared corridor on '${segmentId}' must name this segment and one compiled peer segment`
      );
      continue;
    }
    const peerCorridor = peer.properties.shared_corridor;
    if (
      !peerCorridor ||
      JSON.stringify([...corridor.segment_ids].sort()) !==
        JSON.stringify([...peerCorridor.segment_ids].sort()) ||
      JSON.stringify(corridor.shared_station_ids) !==
        JSON.stringify(peerCorridor.shared_station_ids) ||
      corridor.reason !== peerCorridor.reason ||
      corridor.source !== peerCorridor.source
    ) {
      errors.push(
        `Shared corridor on '${segmentId}' must be declared identically on both segments`
      );
      continue;
    }

    const pair = [feature, peer];
    const stationRange = corridor.shared_station_ids.map((id) => stationsById.get(id));
    if (
      stationRange.some(
        (station) =>
          !station ||
          pair.some(
            (segment) =>
              !station.properties.line_ids.includes(segment.properties.line_id)
          )
      )
    ) {
      errors.push(
        `Shared corridor on '${segmentId}' names missing stations or stations outside the paired lines`
      );
      continue;
    }

    const positionsFor = (segment: (typeof pair)[number]) => {
      const coords = segment.geometry.coordinates as [number, number][];
      const positions = stationRange.map((station) => {
        const projection = nearestPointOnPolyline(
          station!.geometry.coordinates as [number, number],
          coords
        );
        return { position: projection.segmentIndex + projection.t, distanceM: projection.distanceM };
      });
      if (positions.some((position) => position.distanceM > 300)) return undefined;
      const increasing = positions.every(
        (position, index) => index === 0 || position.position > positions[index - 1].position
      );
      const decreasing = positions.every(
        (position, index) => index === 0 || position.position < positions[index - 1].position
      );
      return increasing || decreasing ? positions : undefined;
    };
    const segmentPositions = pair.map(positionsFor);
    let orderedOnBothSegments = segmentPositions.every(Boolean);
    if (orderedOnBothSegments) {
      const declaredIds = new Set(corridor.shared_station_ids);
      const positionRanges = segmentPositions.map((positions) => {
        const values = positions!.map((item) => item.position);
        return [Math.min(...values), Math.max(...values)] as const;
      });
      const sharedIntermediateStation = stations.features.some((station) => {
        if (
          declaredIds.has(station.properties.station_id) ||
          pair.some((segment) => !station.properties.line_ids.includes(segment.properties.line_id))
        ) {
          return false;
        }
        return pair.every((segment, index) => {
          const projected = nearestPointOnPolyline(
            station.geometry.coordinates as [number, number],
            segment.geometry.coordinates as [number, number][]
          );
          const position = projected.segmentIndex + projected.t;
          const [min, max] = positionRanges[index];
          return projected.distanceM <= 300 && position > min && position < max;
        });
      });
      if (sharedIntermediateStation) orderedOnBothSegments = false;
    }
    if (!orderedOnBothSegments) {
      errors.push(
        `Shared corridor stations on '${segmentId}' must form the same consecutive route range on both segments`
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

    // Verify segment_id exists if specified
    if (props.segment_id && !seenSegmentIds.has(props.segment_id)) {
      errors.push(
        `Station "${props.station_id}" references unknown segment_id "${props.segment_id}"`
      );
    }

    // Coordinate Envelope and City Bounding Box checks
    const [stLng, stLat] = feature.geometry.coordinates;
    if (
      stLng < INDIA_COORDINATE_ENVELOPE.minLng ||
      stLng > INDIA_COORDINATE_ENVELOPE.maxLng ||
      stLat < INDIA_COORDINATE_ENVELOPE.minLat ||
      stLat > INDIA_COORDINATE_ENVELOPE.maxLat
    ) {
      errors.push(
        `Station '${props.station_id}' coordinate [${stLng}, ${stLat}] is outside the valid India coordinate envelope (lng 68–98, lat 6–38) - possible swapped lat/lng`
      );
    } else if (city) {
      const [minLng, minLat, maxLng, maxLat] = city.bbox;
      if (
        stLng < minLng - BBOX_MARGIN_DEG ||
        stLng > maxLng + BBOX_MARGIN_DEG ||
        stLat < minLat - BBOX_MARGIN_DEG ||
        stLat > maxLat + BBOX_MARGIN_DEG
      ) {
        warnings.push(
          `Station '${props.station_id}' (city: ${city.name}) coordinate [${stLng}, ${stLat}] is outside city bounding box margin [${city.bbox.join(", ")}] (+/-${BBOX_MARGIN_DEG}°)`
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
