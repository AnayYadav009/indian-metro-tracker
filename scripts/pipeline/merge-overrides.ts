import {
  calculateLineStringLengthKm,
  pointToPolylineDistanceM,
  haversineDistanceKm,
  haversineDistanceM,
  nearestPointOnPolyline,
  lineSlice,
} from "../../lib/geo";
import {
  slugify,
  type NormalizedCityData,
  type NormalizedSegment,
} from "./normalize";
import type { SegmentFeature, StationFeature } from "../../types/metro";

type Coordinate = [number, number];

function removeAdjacentDuplicateCoords(coords: Coordinate[]): Coordinate[] {
  return coords.filter(
    (coord, index) =>
      index === 0 ||
      coord[0] !== coords[index - 1][0] ||
      coord[1] !== coords[index - 1][1]
  );
}

function segmentsCross(
  a: Coordinate,
  b: Coordinate,
  c: Coordinate,
  d: Coordinate
): boolean {
  const cross = (o: Coordinate, p: Coordinate, q: Coordinate) =>
    (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  return (
    ((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) &&
    ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))
  );
}

function removeShortSelfIntersectionSpur(coords: Coordinate[]): Coordinate[] {
  for (let i = 0; i < coords.length - 3; i++) {
    for (let j = i + 2; j < Math.min(coords.length - 1, i + 50); j++) {
      if (j === i + 1) continue;
      if (segmentsCross(coords[i], coords[i + 1], coords[j], coords[j + 1])) {
        return [...coords.slice(0, i + 1), ...coords.slice(j + 1)];
      }
    }
  }
  return coords;
}

export interface CityOverrideData {
  city: {
    id: string;
    name: string;
    bbox: [number, number, number, number];
    operator: string;
    phases: string[];
  };
  lines: Array<{
    id: string;
    name: string;
    city_id?: string;
    city: string;
    color: string;
    operator: string;
    source: string;
    aliases?: string[];
  }>;
  segments: Array<{
    osmId?: number;
    segment_id: string;
    line_id: string;
    line_name: string;
    phase: string;
    status: "operational" | "construction" | "planned";
    gauge: string;
    inaugurated_on: string | null;
    expected_completion: string | null;
    color: string;
    stations_count?: number;
    coordinates?: [number, number][];
    references?: string[];
    completion_unconfirmed?: boolean;
    last_verified?: string;
    geometry_quality?: "exact" | "schematic";
    endpoint_station_ids?: string[];
  }>;
  interchangeStationNames?: string[];
  dedupeRadiusM?: number;
  stationAliases?: Record<string, string>;
  additionalStations?: Array<{
    osmId: number;
    name: string;
    coordinates: [number, number];
    lineRefs?: string[];
    status?: "operational" | "construction" | "planned";
  }>;
  stationOverrides?: Record<
    string,
    {
      line_ids?: string[];
      phase?: string;
      status?: "operational" | "construction" | "planned";
      opened_on?: string | null;
      expected_completion?: string | null;
      is_interchange?: boolean;
      layout?: "underground" | "elevated" | "at-grade" | null;
      last_verified?: string;
      coordinates?: [number, number];
    }
  >;
  out_of_scope_station_ids?: string[];
  out_of_scope_line_ids?: string[];
}

/**
 * Shape of a single entry in data/overrides/interchanges.json.
 * - interchange_id: string → assign this station to the named cluster (merge)
 * - interchange_id: null → remove from any auto-derived cluster (split)
 */
export interface InterchangeCorrection {
  interchange_id: string | null;
}

/** Map of station_id → correction read from data/overrides/interchanges.json. */
export type InterchangeCorrectionsMap = Record<string, InterchangeCorrection>;

export function mergeCityOverrides(
  normalized: NormalizedCityData,
  overrides: CityOverrideData,
  retrievedAt?: string,
  interchangeCorrections: InterchangeCorrectionsMap = {}
): {
  segments: SegmentFeature[];
  stations: StationFeature[];
} {
  const normalizedStations = [...normalized.stations];
  for (const station of overrides.additionalStations || []) {
    if (!normalizedStations.some((existing) => existing.osmId === station.osmId)) {
      normalizedStations.push({
        osmId: station.osmId,
        name: station.name,
        coordinates: station.coordinates,
        tags: {},
        lineRefs: station.lineRefs || [],
        status: station.status || "operational",
      });
    }
  }
  const cityName = overrides.city.name;

  // Map normalized segments by osmId
  const normalizedSegsByOsmId = new Map<number, NormalizedSegment>();
  normalized.segments.forEach((s) => normalizedSegsByOsmId.set(s.osmId, s));

  // Map lines by line_id for operator lookup
  const lineById = new Map<string, { operator: string; name: string }>();
  overrides.lines.forEach((l) =>
    lineById.set(l.id, { operator: l.operator, name: l.name })
  );

  // 1. First pass: Collect initial segment geometry candidates
  interface IntermediateSegment {
    segOverride: CityOverrideData["segments"][number];
    coords?: [number, number][];
    isOsmSourced: boolean;
    geometryQuality: "exact" | "schematic";
  }

  const intermediateSegments: IntermediateSegment[] = [];

  for (const segOverride of overrides.segments) {
    let coords: [number, number][] | undefined;
    let isOsmSourced = false;

    if (segOverride.osmId && normalizedSegsByOsmId.has(segOverride.osmId)) {
      const normSeg = normalizedSegsByOsmId.get(segOverride.osmId)!;
      coords = normSeg.coordinates;
      isOsmSourced = true;
    } else if (segOverride.coordinates && segOverride.coordinates.length >= 2) {
      coords = segOverride.coordinates;
      isOsmSourced = false;
    }

    const geometryQuality: "exact" | "schematic" =
      segOverride.geometry_quality || "exact";

    intermediateSegments.push({
      segOverride,
      coords,
      isOsmSourced,
      geometryQuality,
    });
  }

  // 2. Process and deduplicate stations
  const interchangeSet = new Set<string>(
    (overrides.interchangeStationNames || []).map((n) => n.toLowerCase())
  );

  const dedupeRadiusKm = (overrides.dedupeRadiusM || 350) / 1000;
  const aliasMap = new Map<string, string>();
  if (overrides.stationAliases) {
    for (const [k, v] of Object.entries(overrides.stationAliases)) {
      aliasMap.set(k.toLowerCase().trim(), v.trim());
    }
  }

  interface DeduplicatedStation {
    id: string;
    osmIds: number[];
    coords: [number, number];
    rawName: string;
    name: string;
    baseName: string;
    tags?: Record<string, string>;
    lineRefs: string[];
    status?: "operational" | "construction" | "planned";
  }

  const deduplicatedStations: DeduplicatedStation[] = [];
  const seenStationIds = new Set<string>();

  for (const station of normalizedStations) {
    const rawName = station.name;
    if (
      rawName.length > 80 ||
      /detailed project report|authorities for approval/i.test(rawName)
    ) {
      continue;
    }
    const resolvedName = aliasMap.get(rawName.toLowerCase()) || rawName;

    const prefix =
      overrides.city.id === "delhi"
        ? "del"
        : overrides.city.id === "bengaluru"
          ? "blr"
          : overrides.city.id === "mumbai"
            ? "mum"
            : overrides.city.id === "gurugram"
              ? "gur"
              : overrides.city.id === "noida"
                ? "noi"
                : overrides.city.id === "navi-mumbai"
                  ? "nmm"
                  : overrides.city.id;
    const baseSlug = `${prefix}-${slugify(resolvedName)}`;
    let stationId = baseSlug;

    const outOfScopeList = new Set(overrides.out_of_scope_station_ids || []);
    if (
      outOfScopeList.has(baseSlug) ||
      outOfScopeList.has(stationId) ||
      outOfScopeList.has(rawName) ||
      outOfScopeList.has(resolvedName)
    ) {
      continue;
    }

    // Deduplication rule
    const existing = deduplicatedStations.find((s) => {
      const dist = haversineDistanceKm(station.coordinates, s.coords);
      if (dist > dedupeRadiusKm) return false;

      const sameName =
        s.baseName.toLowerCase() === resolvedName.toLowerCase() ||
        s.baseName.toLowerCase() === rawName.toLowerCase();
      const aliasMatch =
        aliasMap.get(s.baseName.toLowerCase())?.toLowerCase() ===
        resolvedName.toLowerCase();
      const sharedInterchangeTag = Boolean(
        (station.tags?.interchange === "yes" ||
          station.tags?.public_transport === "stop_area") &&
        (s.tags?.interchange === "yes" ||
          s.tags?.public_transport === "stop_area")
      );

      return sameName || aliasMatch || sharedInterchangeTag;
    });

    if (existing) {
      // Merge lineRefs
      for (const ref of station.lineRefs || []) {
        if (!existing.lineRefs.includes(ref)) {
          existing.lineRefs.push(ref);
        }
      }
      if (!existing.osmIds.includes(station.osmId)) {
        existing.osmIds.push(station.osmId);
      }
      continue;
    }

    let counter = 1;
    while (seenStationIds.has(stationId)) {
      stationId = `${baseSlug}-${++counter}`;
    }
    if (outOfScopeList.has(stationId)) {
      continue;
    }
    seenStationIds.add(stationId);

    deduplicatedStations.push({
      id: stationId,
      osmIds: [station.osmId],
      coords: station.coordinates,
      rawName,
      name: resolvedName,
      baseName: resolvedName,
      tags: station.tags,
      lineRefs: [...(station.lineRefs || [])],
      status: station.status,
    });
  }

  // 3. Assign stations to lines via hierarchy:
  //    (1) OSM route relation membership
  //    (2) Proximity (< 200m)
  //    (3) Station overrides
  const stationsWithLines: Array<{
    st: DeduplicatedStation;
    assignedLineIds: string[];
    assignedPhase: string;
    assignedStatus: "operational" | "construction" | "planned";
    layout: "underground" | "elevated" | "at-grade" | null;
    layoutSource: "operator" | "osm-tag" | "unverified";
    openedOn: string | null;
    expectedCompletion: string | null;
    lastVerified: string | null;
  }> = [];

  for (const st of deduplicatedStations) {
    const lineIdsSet = new Set<string>();
    let assignedPhase = overrides.city.phases[0];
    let assignedStatus: "operational" | "construction" | "planned" =
      "operational";

    // Tier 1: OSM route relation membership
    for (const relRef of st.lineRefs) {
      const segMatch = overrides.segments.find(
        (s) => s.osmId === Number(relRef)
      );
      if (segMatch) {
        lineIdsSet.add(segMatch.line_id);
      }
    }
    for (const normalizedSegment of normalized.segments) {
      if (
        normalizedSegment.stationOsmIds.some((osmId) =>
          st.osmIds.includes(osmId)
        )
      ) {
        const segMatch = overrides.segments.find(
          (s) => s.osmId === normalizedSegment.osmId
        );
        if (segMatch) lineIdsSet.add(segMatch.line_id);
      }
    }

    // Tier 2: Proximity (< 200m) to segment geometry if available
    let closestDistM = Infinity;
    let closestSeg: IntermediateSegment | undefined;

    for (const iseg of intermediateSegments) {
      if (iseg.coords && iseg.coords.length >= 2) {
        const dM = pointToPolylineDistanceM(st.coords, iseg.coords);
        if (dM < closestDistM) {
          closestDistM = dM;
          closestSeg = iseg;
        }
        if (dM <= 200) {
          lineIdsSet.add(iseg.segOverride.line_id);
        }
      }
    }

    // Fallback if no relation and no proximity < 200m
    if (lineIdsSet.size === 0 && closestSeg) {
      lineIdsSet.add(closestSeg.segOverride.line_id);
      assignedPhase = closestSeg.segOverride.phase;
      assignedStatus = closestSeg.segOverride.status;
    } else if (closestSeg) {
      assignedPhase = closestSeg.segOverride.phase;
      assignedStatus = closestSeg.segOverride.status;
    }

    if (st.status && st.status !== "operational") {
      assignedStatus = st.status;
    } else if (
      st.tags?.railway === "construction" ||
      st.tags?.proposed ||
      st.tags?.railway === "proposed"
    ) {
      assignedStatus =
        st.tags.railway === "construction" ? "construction" : "planned";
    }

    // Layout
    const tags = st.tags || {};
    let layout: "underground" | "elevated" | "at-grade" | null = null;
    let layoutSource: "operator" | "osm-tag" | "unverified" = "unverified";

    if (
      tags.tunnel === "yes" ||
      tags.location === "underground" ||
      tags.layer === "-1" ||
      tags.layer === "-2"
    ) {
      layout = "underground";
      layoutSource = "osm-tag";
    } else if (
      tags.bridge === "yes" ||
      tags.layer === "1" ||
      tags.layer === "2"
    ) {
      layout = "elevated";
      layoutSource = "osm-tag";
    }

    // Dates & verification
    let openedOn: string | null = null;
    let expectedCompletion: string | null = null;
    let lastVerified: string | null = null; // Stays null for OSM-sourced

    // Dates are only populated from explicit sourced overrides; OSM status
    // alone does not establish an opening or completion date.

    // Tier 3: Manual station overrides (highest priority)
    const override =
      overrides.stationOverrides?.[st.id] ||
      overrides.stationOverrides?.[st.rawName] ||
      overrides.stationOverrides?.[st.name];

    if (override) {
      if (override.line_ids) {
        lineIdsSet.clear();
        override.line_ids.forEach((id) => lineIdsSet.add(id));
      }
      if (override.phase) assignedPhase = override.phase;
      if (override.status) {
        assignedStatus = override.status;
        if (
          assignedStatus === "operational" &&
          override.expected_completion === undefined
        ) {
          expectedCompletion = null;
        }
      }
      if (override.opened_on !== undefined) openedOn = override.opened_on;
      if (override.expected_completion !== undefined)
        expectedCompletion = override.expected_completion;
      if (override.layout !== undefined) {
        layout = override.layout;
        layoutSource = override.layout ? "operator" : "unverified";
      }
      if (override.last_verified) lastVerified = override.last_verified;
      if (override.coordinates) st.coords = override.coordinates;
    }

    stationsWithLines.push({
      st,
      assignedLineIds: Array.from(lineIdsSet),
      assignedPhase,
      assignedStatus,
      layout,
      layoutSource,
      openedOn,
      expectedCompletion,
      lastVerified,
    });
  }

  // 4. Build schematic connectors for construction/planned segments lacking way geometry
  for (const iseg of intermediateSegments) {
    if (iseg.coords && iseg.coords.length >= 2) continue;

    // Must be construction or planned
    if (iseg.segOverride.status === "operational") {
      throw new Error(
        `Operational segment '${iseg.segOverride.segment_id}' has no geometry coordinates. Operational segments cannot be schematic.`
      );
    }

    // Find all stations assigned to this line and phase
    const lineStations = stationsWithLines.filter(
      (sw) =>
        sw.assignedLineIds.includes(iseg.segOverride.line_id) &&
        sw.assignedPhase === iseg.segOverride.phase &&
        (iseg.segOverride.status === "construction"
          ? sw.assignedStatus === "construction"
          : sw.assignedStatus !== "operational")
    );

    if (lineStations.length >= 2) {
      // Connect stations in order of their principal geographic spread (minLng to maxLng or minLat to maxLat)
      const sorted = [...lineStations].sort((a, b) => {
        const dx = b.st.coords[0] - a.st.coords[0];
        const dy = b.st.coords[1] - a.st.coords[1];
        if (Math.abs(dx) > Math.abs(dy)) {
          return a.st.coords[0] - b.st.coords[0];
        }
        return a.st.coords[1] - b.st.coords[1];
      });

      iseg.coords = sorted.map((s) => s.st.coords);
      iseg.geometryQuality = "schematic";
    }
  }

  // Trim route geometry to the first and last assigned station projection.
  // This removes turn-back/depot spurs that are outside the station span.
  for (const iseg of intermediateSegments) {
    if (iseg.coords) {
      iseg.coords = removeAdjacentDuplicateCoords(iseg.coords);
    }
    const coords = iseg.coords;
    if (!coords || coords.length < 2) continue;
    const lineStations = stationsWithLines.filter((sw) => {
      if (!sw.assignedLineIds.includes(iseg.segOverride.line_id)) return false;
      const normalizedSegment = iseg.segOverride.osmId
        ? normalizedSegsByOsmId.get(iseg.segOverride.osmId)
        : undefined;
      const isRelationMember =
        sw.st.lineRefs.includes(String(iseg.segOverride.osmId)) ||
        Boolean(
          normalizedSegment?.stationOsmIds.some((osmId) =>
            sw.st.osmIds.includes(osmId)
          )
        );
      return isRelationMember || pointToPolylineDistanceM(sw.st.coords, coords) <= 1000;
    });
    if (lineStations.length < 2) continue;

    const projections = lineStations
      .map((sw) => {
        const projected = nearestPointOnPolyline(sw.st.coords, coords);
        return {
          station: sw,
          position: projected.segmentIndex + projected.t,
          point: projected.point,
        };
      })
      .sort((a, b) => a.position - b.position);

    const first = projections[0];
    const last = projections[projections.length - 1];
    if (first.position !== last.position) {
      iseg.coords = lineSlice(first.point, last.point, coords);
    }
    iseg.coords = removeShortSelfIntersectionSpur(iseg.coords || coords);
    const trimmed = iseg.coords;
    if (trimmed && trimmed.length >= 2) {
      for (const end of [0, trimmed.length - 1]) {
        const endpoint = trimmed[end];
        const nearest = lineStations.reduce<{
          coords: Coordinate;
          distanceM: number;
        } | null>((best, sw) => {
          const distanceM = haversineDistanceM(endpoint, sw.st.coords);
          return !best || distanceM < best.distanceM
            ? { coords: sw.st.coords, distanceM }
            : best;
        }, null);
        if (nearest && nearest.distanceM <= 1000) {
          trimmed[end] = nearest.coords;
        }
      }
      for (const stationId of iseg.segOverride.endpoint_station_ids || []) {
        const endpointStation = stationsWithLines.find(
          (sw) => sw.st.id === stationId
        );
        if (!endpointStation) continue;
        const startDistanceM = haversineDistanceM(
          trimmed[0],
          endpointStation.st.coords
        );
        const endDistanceM = haversineDistanceM(
          trimmed[trimmed.length - 1],
          endpointStation.st.coords
        );
        const endpointIndex = startDistanceM <= endDistanceM ? 0 : trimmed.length - 1;
        const distanceM = Math.min(startDistanceM, endDistanceM);
        if (distanceM > 250 && distanceM <= 2000) {
          trimmed[endpointIndex] = endpointStation.st.coords;
        }
      }
    }
  }

  // 5. Finalize Segments and compute dynamic stations_count
  const segmentFeatures: SegmentFeature[] = [];

  for (const iseg of intermediateSegments) {
    if (iseg.coords) {
      iseg.coords = removeAdjacentDuplicateCoords(
        removeShortSelfIntersectionSpur(
          removeAdjacentDuplicateCoords(iseg.coords)
        )
      );
    }
    const segOverride = iseg.segOverride;
    const coords = iseg.coords;

    if (!coords || coords.length < 2) {
      console.warn(
        `⚠️ Segment ${segOverride.segment_id} has no valid coordinates. Skipping.`
      );
      continue;
    }

    const computedKm = calculateLineStringLengthKm(coords);
    const lengthKm = Number(computedKm.toFixed(1));
    const segmentSource = iseg.isOsmSourced ? "osm" : "manual";

    if (segmentSource === "manual" && !segOverride.last_verified) {
      throw new Error(
        `Manual segment '${segOverride.segment_id}' must explicitly provide last_verified date in overrides.`
      );
    }

    // Inherit operator from line (Rule C4/C8)
    const lineInfo = lineById.get(segOverride.line_id);
    const operator = lineInfo?.operator || overrides.city.operator;

    // Dynamic stations_count derivation:
    // Deduplicated assigned stations on this line within the audit proximity
    // tolerance of this segment.
    let stationsCount = 0;
    if (segOverride.stations_count !== undefined) {
      stationsCount = segOverride.stations_count;
    } else {
      const lineStations = stationsWithLines.filter((sw) =>
        sw.assignedLineIds.includes(segOverride.line_id)
      );
      for (const sw of lineStations) {
        const distM = pointToPolylineDistanceM(sw.st.coords, coords);
        if (distM <= 250) {
          stationsCount++;
        }
      }

      if (stationsCount === 0 && segOverride.status === "operational") {
        throw new Error(
          `Segment '${segOverride.segment_id}' stations_count could not be computed (found 0 nearby assigned stations on line '${segOverride.line_id}'). Operational segments must have at least 1 station.`
        );
      }
    }

    const lastVerifiedDate =
      segmentSource === "manual"
        ? segOverride.last_verified!
        : segOverride.last_verified || null;

    const truncatedCoords = removeAdjacentDuplicateCoords(
      coords.map(([lng, lat]) => [
        Number(lng.toFixed(5)),
        Number(lat.toFixed(5)),
      ] as Coordinate)
    );

    segmentFeatures.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: truncatedCoords,
      },
      properties: {
        segment_id: segOverride.segment_id,
        line_id: segOverride.line_id,
        line_name: segOverride.line_name,
        city_id: overrides.city.id,
        city: cityName,
        operator,
        status: segOverride.status,
        phase: segOverride.phase,
        length_km: lengthKm,
        gauge: segOverride.gauge,
        inaugurated_on:
          segOverride.status === "operational"
            ? segOverride.inaugurated_on
            : null,
        expected_completion:
          segOverride.status === "construction" ||
          segOverride.status === "planned"
            ? segOverride.expected_completion
            : null,
        stations_count: stationsCount,
        color: segOverride.color,
        source: segmentSource,
        references: segOverride.references || [],
        completion_unconfirmed: segOverride.completion_unconfirmed || false,
        last_verified: lastVerifiedDate,
        retrieved_at: iseg.isOsmSourced ? retrievedAt : undefined,
        geometry_quality: iseg.geometryQuality,
      },
    });
  }

  // 6. Finalize Stations
  const stationFeatures: StationFeature[] = [];

  for (const sw of stationsWithLines) {
    const isInterchange =
      interchangeSet.has(sw.st.rawName.toLowerCase()) ||
      interchangeSet.has(sw.st.name.toLowerCase()) ||
      sw.assignedLineIds.length > 1;

    // Derive interchange_id:
    // Auto: any interchange station is its own cluster representative (station_id).
    // Manual correction can override to merge (same id) or split (null).
    let interchangeId: string | undefined = undefined;
    if (isInterchange) {
      interchangeId = sw.st.id;
    }
    const correction = interchangeCorrections[sw.st.id];
    if (correction !== undefined) {
      if (correction.interchange_id === null) {
        // Forced split — remove interchange_id even if auto assigned
        interchangeId = undefined;
      } else {
        // Forced merge — use the specified cluster id
        interchangeId = correction.interchange_id;
      }
    }

    const truncatedStationCoords: [number, number] = [
      Number(sw.st.coords[0].toFixed(5)),
      Number(sw.st.coords[1].toFixed(5)),
    ];

    stationFeatures.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: truncatedStationCoords,
      },
      properties: {
        station_id: sw.st.id,
        name: sw.st.name,
        city_id: overrides.city.id,
        city: cityName,
        line_ids: sw.assignedLineIds,
        status: sw.assignedStatus,
        phase: sw.assignedPhase,
        is_interchange: isInterchange,
        opened_on: sw.openedOn,
        expected_completion: sw.expectedCompletion,
        completion_unconfirmed:
          sw.assignedStatus !== "operational" && !sw.expectedCompletion,
        layout: sw.layout,
        layout_source: sw.layoutSource,
        source: "osm",
        references: [],
        last_verified: sw.lastVerified,
        retrieved_at: retrievedAt,
        ...(interchangeId !== undefined ? { interchange_id: interchangeId } : {}),
      },
    });
  }

  return {
    segments: segmentFeatures,
    stations: stationFeatures,
  };
}
