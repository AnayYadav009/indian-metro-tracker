import {
  calculateLineStringLengthKm,
  pointToPolylineDistanceM,
  haversineDistanceKm,
  haversineDistanceM,
  nearestPointOnPolyline,
  lineSlice,
} from "../../lib/geo";
import { normalizeCoordinates, segmentsIntersect } from "../lib/geometry";
import {
  slugify,
  type NormalizedCityData,
  type NormalizedSegment,
} from "./normalize";
import type { SegmentFeature, SharedCorridor, StationFeature } from "../../types/metro";

type Coordinate = [number, number];

function removeShortSelfIntersectionSpur(coords: Coordinate[]): Coordinate[] {
  for (let i = 0; i < coords.length - 3; i++) {
    for (let j = i + 2; j < Math.min(coords.length - 1, i + 50); j++) {
      if (j === i + 1) continue;
      if (segmentsIntersect(coords[i], coords[i + 1], coords[j], coords[j + 1])) {
        return [...coords.slice(0, i + 1), ...coords.slice(j + 1)];
      }
    }
  }
  return coords;
}

function removeHairpinSpurs(
  coords: Coordinate[],
  maxSpanM = 300,
  minAngleDeg = 150
): Coordinate[] {
  let modified = true;
  let cur = [...coords];
  while (modified) {
    modified = false;
    for (let i = 1; i < cur.length - 1; i++) {
      const prev = cur[i - 1];
      const p = cur[i];
      const next = cur[i + 1];
      const d1 = haversineDistanceM(prev, p);
      const d2 = haversineDistanceM(p, next);
      if (d1 + d2 > maxSpanM) continue;

      const v1x = p[0] - prev[0];
      const v1y = p[1] - prev[1];
      const v2x = next[0] - p[0];
      const v2y = next[1] - p[1];
      const dot = v1x * v2x + v1y * v2y;
      const mag1 = Math.hypot(v1x, v1y);
      const mag2 = Math.hypot(v2x, v2y);
      if (mag1 === 0 || mag2 === 0) {
        cur.splice(i, 1);
        modified = true;
        break;
      }
      const cosVal = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
      const deg = (Math.acos(cosVal) * 180) / Math.PI;
      if (deg >= minAngleDeg) {
        cur.splice(i, 1);
        modified = true;
        break;
      }
    }
  }
  return cur;
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
    orderedWayIds?: Array<{ id: number; reversed?: boolean }>;
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
    shared_corridor?: SharedCorridor;
    endpoint_station_ids?: string[];
    trim_to_endpoints?: boolean;
    stations_not_published?: boolean;
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
      references?: string[];
    }
  >;
  centerlineSections?: Array<{
    primary_segment_id: string;
    secondary_segment_id: string;
    primary_start: Coordinate;
    secondary_start: Coordinate;
    primary_end: Coordinate;
    secondary_end: Coordinate;
    source_urls: string[];
    reason: string;
  }>;
  out_of_scope_station_ids?: string[];
  out_of_scope_line_ids?: string[];
}

function resampleLine(coords: Coordinate[], count: number): Coordinate[] {
  const lengths = coords.slice(1).map((point, index) =>
    haversineDistanceM(coords[index], point)
  );
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total === 0) return Array.from({ length: count }, () => coords[0]);

  return Array.from({ length: count }, (_, index) => {
    const target = (total * index) / (count - 1);
    let covered = 0;
    for (let leg = 0; leg < lengths.length; leg++) {
      const length = lengths[leg];
      if (covered + length >= target || leg === lengths.length - 1) {
        const t = length === 0 ? 0 : (target - covered) / length;
        return [
          coords[leg][0] + (coords[leg + 1][0] - coords[leg][0]) * t,
          coords[leg][1] + (coords[leg + 1][1] - coords[leg][1]) * t,
        ];
      }
      covered += length;
    }
    return coords[coords.length - 1];
  });
}

function joinLines(...parts: Coordinate[][]): Coordinate[] {
  return parts.flatMap((part, partIndex) =>
    partIndex && part.length && parts[partIndex - 1].length
      ? part.slice(1)
      : part
  );
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
  (overrides.additionalStations || []).forEach((station) => {
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
  });
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

    if (segOverride.coordinates && segOverride.coordinates.length >= 2) {
      coords = segOverride.coordinates;
      isOsmSourced = false;
    } else if (segOverride.osmId && normalizedSegsByOsmId.has(segOverride.osmId)) {
      const normSeg = normalizedSegsByOsmId.get(segOverride.osmId)!;
      coords = normSeg.coordinates;
      isOsmSourced = true;
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
  const aliasMap = new Map(Object.entries(overrides.stationAliases || {}).map(([k, v]) => [k.toLowerCase().trim(), v.trim()]));
  const outOfScopeList = new Set(overrides.out_of_scope_station_ids || []);
  const cityPrefix: Record<string, string> = {
    delhi: "del",
    bengaluru: "blr",
    mumbai: "mum",
    gurugram: "gur",
    noida: "noi",
    "navi-mumbai": "nmm",
  };
  const prefix = cityPrefix[overrides.city.id] || overrides.city.id;

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

    const baseSlug = `${prefix}-${slugify(resolvedName)}`;
    let stationId = baseSlug;

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
      const aliasMatch = aliasMap.get(s.baseName.toLowerCase())?.toLowerCase() === resolvedName.toLowerCase();
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
        if (!existing.lineRefs.includes(ref)) existing.lineRefs.push(ref);
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
    references: string[];
  }> = [];

  for (const st of deduplicatedStations) {
    const lineIdsSet = new Set<string>();
    let assignedPhase = overrides.city.phases[0];
    let assignedStatus: "operational" | "construction" | "planned" =
      "operational";

    // Tier 1: OSM route relation membership
    st.lineRefs.forEach((relRef) => {
      const segMatch = overrides.segments.find((segment) => segment.osmId === Number(relRef));
      if (segMatch) lineIdsSet.add(segMatch.line_id);
    });
    normalized.segments.forEach((segment) => {
      if (!segment.stationOsmIds.some((osmId) => st.osmIds.includes(osmId))) return;
      const segMatch = overrides.segments.find((item) => item.osmId === segment.osmId);
      if (segMatch) lineIdsSet.add(segMatch.line_id);
    });

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

    let stationReferences: string[] = [];
    if (override?.references) stationReferences = override.references;

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
      references: stationReferences,
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
      iseg.coords = normalizeCoordinates(iseg.coords);
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
    const isClosedLoop =
      coords.length >= 4 &&
      haversineDistanceM(coords[0], coords[coords.length - 1]) <= 50;

    const endpointIds = iseg.segOverride.endpoint_station_ids;
    if (
      iseg.segOverride.trim_to_endpoints &&
      endpointIds &&
      endpointIds.length === 2
    ) {
      const st1 = stationsWithLines.find((sw) => sw.st.id === endpointIds[0]);
      const st2 = stationsWithLines.find((sw) => sw.st.id === endpointIds[1]);
      if (st1 && st2) {
        const p1 = nearestPointOnPolyline(st1.st.coords, coords);
        const p2 = nearestPointOnPolyline(st2.st.coords, coords);
        const [startPt, endPt] =
          p1.segmentIndex + p1.t <= p2.segmentIndex + p2.t
            ? [p1.point, p2.point]
            : [p2.point, p1.point];
        iseg.coords = lineSlice(startPt, endPt, coords);
      } else if (!isClosedLoop && first.position !== last.position) {
        iseg.coords = lineSlice(first.point, last.point, coords);
      }
    } else if (!isClosedLoop && first.position !== last.position) {
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

  // 4a. Collapse documented parallel track overlap to one midpoint centreline.
  for (const section of overrides.centerlineSections || []) {
    const primary = intermediateSegments.find(
      ({ segOverride }) => segOverride.segment_id === section.primary_segment_id
    );
    const secondary = intermediateSegments.find(
      ({ segOverride }) => segOverride.segment_id === section.secondary_segment_id
    );
    if (!primary?.coords || !secondary?.coords) {
      throw new Error(
        `Centerline correction requires both segments: ${section.primary_segment_id}, ${section.secondary_segment_id}`
      );
    }
    if (
      primary.segOverride.line_id !== secondary.segOverride.line_id ||
      !section.reason.trim() ||
      section.source_urls.length === 0 ||
      section.source_urls.some((url) => !/^https?:\/\//i.test(url))
    ) {
      throw new Error(
        `Centerline correction requires a documented same-line pair: ${section.primary_segment_id}|${section.secondary_segment_id}`
      );
    }

    const primaryStart = nearestPointOnPolyline(section.primary_start, primary.coords);
    const secondaryStart = nearestPointOnPolyline(section.secondary_start, secondary.coords);
    const primaryEnd = nearestPointOnPolyline(section.primary_end, primary.coords);
    const secondaryEnd = nearestPointOnPolyline(section.secondary_end, secondary.coords);
    if (
      primaryStart.distanceM > 60 || secondaryStart.distanceM > 60 ||
      primaryEnd.distanceM > 60 || secondaryEnd.distanceM > 60
    ) {
      throw new Error(
        `Centerline correction anchors exceed 60 m for ${section.primary_segment_id}|${section.secondary_segment_id}`
      );
    }
    const position = (projection: typeof primaryStart) =>
      projection.segmentIndex + projection.t;
    if (
      position(primaryStart) >= position(primaryEnd) ||
      position(secondaryStart) >= position(secondaryEnd)
    ) {
      throw new Error(
        `Centerline correction anchors must follow segment order for ${section.primary_segment_id}|${section.secondary_segment_id}`
      );
    }

    const primaryShared = lineSlice(primaryStart.point, primaryEnd.point, primary.coords);
    const secondaryShared = lineSlice(secondaryStart.point, secondaryEnd.point, secondary.coords);
    const primaryLengthM = calculateLineStringLengthKm(primaryShared) * 1000;
    const secondaryLengthM = calculateLineStringLengthKm(secondaryShared) * 1000;
    if (
      primaryLengthM < 300 || secondaryLengthM < 300 ||
      Math.abs(primaryLengthM - secondaryLengthM) / Math.max(primaryLengthM, secondaryLengthM) > 0.15
    ) {
      throw new Error(
        `Centerline correction paths do not match for ${section.primary_segment_id}|${section.secondary_segment_id}`
      );
    }

    const sampleCount = Math.max(2, Math.ceil(Math.max(primaryLengthM, secondaryLengthM) / 25) + 1);
    const primarySamples = resampleLine(primaryShared, sampleCount);
    const secondarySamples = resampleLine(secondaryShared, sampleCount);
    const maxOffsetM = Math.max(
      ...primarySamples.map((point, index) =>
        haversineDistanceM(point, secondarySamples[index])
      )
    );
    if (maxOffsetM > 60) {
      throw new Error(
        `Centerline correction traces diverge by ${Math.round(maxOffsetM)} m for ${section.primary_segment_id}|${section.secondary_segment_id}`
      );
    }
    const centerline = primarySamples.map(([lng, lat], index) => [
      (lng + secondarySamples[index][0]) / 2,
      (lat + secondarySamples[index][1]) / 2,
    ] as Coordinate);
    const primaryBefore = lineSlice(primary.coords[0], primaryStart.point, primary.coords);
    const primaryAfter = lineSlice(primaryEnd.point, primary.coords[primary.coords.length - 1], primary.coords);
    const secondaryBefore = lineSlice(secondary.coords[0], secondaryStart.point, secondary.coords);
    primaryBefore[primaryBefore.length - 1] = centerline[0];
    primaryAfter[0] = centerline[centerline.length - 1];
    secondaryBefore[secondaryBefore.length - 1] = centerline[0];

    primary.coords = joinLines(primaryBefore, centerline, primaryAfter);
    secondary.coords = secondaryBefore;
  }

  // 5. Finalize Segments and compute dynamic stations_count
  const segmentFeatures: SegmentFeature[] = [];

  for (const iseg of intermediateSegments) {
    if (iseg.coords) {
      iseg.coords = normalizeCoordinates(
        removeHairpinSpurs(
          removeShortSelfIntersectionSpur(
            normalizeCoordinates(iseg.coords)
          )
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

    const truncatedCoords = normalizeCoordinates(
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
        stations_not_published: segOverride.stations_not_published || false,
        source: segmentSource,
        references: segOverride.references || [],
        completion_unconfirmed: segOverride.completion_unconfirmed || false,
        last_verified: lastVerifiedDate,
        retrieved_at: iseg.isOsmSourced ? retrievedAt : undefined,
        geometry_quality: iseg.geometryQuality,
        shared_corridor: segOverride.shared_corridor,
      },
    });
  }

  // 6. Finalize Stations
  const stationFeatures: StationFeature[] = [];

  for (const sw of stationsWithLines) {
    let isInterchange =
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
        isInterchange = false;
      } else {
        // Forced merge — use the specified cluster id
        interchangeId = correction.interchange_id;
        isInterchange = true;
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
        references: sw.references || [],
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
