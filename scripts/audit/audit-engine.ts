/**
 * Data audit engine — read-only consistency report.
 *
 * Implements every check from docs/DATA_AUDIT.md.
 * Never modifies data files.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  CitySchema,
  LineSchema,
  SegmentFeatureCollectionSchema,
  StationFeatureCollectionSchema,
} from "../../types/schema";
import type {
  City,
  Line,
  SegmentFeature,
  StationFeature,
} from "../../types/metro";
import {
  haversineDistanceKm,
  calculateLineStringLengthKm,
  pointToPolylineDistanceM,
  nearestPointOnPolyline,
} from "../../lib/geo";
import { AUDIT_THRESHOLDS } from "./audit-config";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Severity = "error" | "warn" | "info";

export interface Finding {
  city_id: string;
  rule: string;
  severity: Severity;
  subject: string;
  message: string;
}

export interface BaselineEntry {
  city_id: string;
  rule: string;
  subject: string;
  reason: string;
}

export interface KnownDefectEntry {
  finding_id: string;
  target_milestone: string;
  city_id: string;
  rule: string;
  subject: string;
  note: string;
}

export interface BaselineFile {
  accepted_warnings: BaselineEntry[];
  unreviewed_warnings?: BaselineEntry[];
  pending_rules?: string[];
  known_defects?: KnownDefectEntry[];
}

export interface SourceCounts {
  [source: string]: number;
}

export interface CitySummary {
  city_id: string;
  city_name: string;
  lines: number;
  segments: number;
  stations: number;
  segmentSources: SourceCounts;
  stationSources: SourceCounts;
  lineSources: SourceCounts;
}

export interface AuditResult {
  date: string;
  summaries: CitySummary[];
  findings: Finding[];
}

export interface AuditDeclarations {
  segments: Array<{ city_id: string; line_id: string; segment_id: string }>;
  lines: Array<{ city_id: string; line_id: string }>;
}

export interface ReferenceSource {
  title: string;
  url: string;
  retrieved_at: string;
  kind?: "official" | "government" | "news";
}

export interface ReferenceLineOpening {
  stage: string;
  phase: string | null;
  opened_on: string | null;
  stations_added: number | null;
  confidence?: "sourced" | "unverified";
  source?: ReferenceSource;
}

export interface ReferenceLineConstruction {
  stretch: string;
  phase: string | null;
  expected_completion: string | null;
  stations: number | null;
  notes?: string;
  source?: ReferenceSource;
}

export interface ReferenceLine {
  line_id: string;
  official_name: string;
  operator: string;
  topology: "linear" | "branched" | "loop" | "loop_with_branch";
  operational_stations: number | null;
  operational_stations_candidates?: number[];
  operational_length_km: number | null;
  planned_length_km: number | null;
  terminals: string[];
  status: "operational" | "under_construction" | "planned";
  confidence?: "sourced" | "unverified";
  construction?: ReferenceLineConstruction[];
  openings?: ReferenceLineOpening[];
  disjoint_stretches?: boolean;
  notes?: string;
}

export interface ReferenceFile {
  city_id: string;
  compiled_on: string;
  lines: ReferenceLine[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeStationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/metro\s*station/gi, "")
    .trim();
}

/** Interpolate along a polyline at a given fraction t ∈ [0, 1] */
function interpolatePolyline(
  coords: [number, number][],
  t: number
): [number, number] {
  if (coords.length < 2 || t <= 0) return coords[0];
  if (t >= 1) return coords[coords.length - 1];

  const totalLen = calculateLineStringLengthKm(coords);
  const targetKm = t * totalLen;
  let accum = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const segLen = haversineDistanceKm(coords[i], coords[i + 1]);
    if (accum + segLen >= targetKm) {
      const frac = segLen > 0 ? (targetKm - accum) / segLen : 0;
      return [
        coords[i][0] + frac * (coords[i + 1][0] - coords[i][0]),
        coords[i][1] + frac * (coords[i + 1][1] - coords[i][1]),
      ];
    }
    accum += segLen;
  }
  return coords[coords.length - 1];
}

/** Check if two bounding boxes overlap (with margin) */
function bboxOverlap(
  a: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  b: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  marginDeg: number
): boolean {
  return !(
    a.maxLng + marginDeg < b.minLng ||
    b.maxLng + marginDeg < a.minLng ||
    a.maxLat + marginDeg < b.minLat ||
    b.maxLat + marginDeg < a.minLat
  );
}

function segmentBbox(coords: [number, number][]): {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
} {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLng, minLat, maxLng, maxLat };
}

/** Check if a LineString is self-intersecting */
function isSelfIntersecting(coords: [number, number][]): boolean {
  if (coords.length < 4) return false;

  for (let i = 0; i < coords.length - 1; i++) {
    for (let j = i + 2; j < coords.length - 1; j++) {
      // Skip adjacent segments
      if (j === i + 1) continue;
      if (
        segmentsIntersect(coords[i], coords[i + 1], coords[j], coords[j + 1])
      ) {
        return true;
      }

    }
  }
  return false;
}

function hasRepeatedCoordinates(coords: [number, number][]): boolean {
  const seen = new Set<string>();
  for (const coord of coords) {
    const key = `${coord[0]},${coord[1]}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function shortSharpTurns(
  coords: [number, number][],
  angleThreshold: number,
  spanM: number
): number {
  let count = 0;
  for (let i = 1; i < coords.length - 1; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    const c = coords[i + 1];
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const vx = c[0] - b[0];
    const vy = c[1] - b[1];
    const denominator = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    if (denominator === 0) continue;
    const angle =
      (Math.acos(
        Math.max(-1, Math.min(1, (ux * vx + uy * vy) / denominator))
      ) *
        180) /
      Math.PI;
    const span =
      haversineDistanceKm(a, b) * 1000 +
      haversineDistanceKm(b, c) * 1000;
    if (angle > angleThreshold && span < spanM) count++;
  }
  return count;
}

function cross(
  o: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function onSegment(
  p: [number, number],
  q: [number, number],
  r: [number, number]
): boolean {
  return (
    Math.min(p[0], r[0]) <= q[0] &&
    q[0] <= Math.max(p[0], r[0]) &&
    Math.min(p[1], r[1]) <= q[1] &&
    q[1] <= Math.max(p[1], r[1])
  );
}

function segmentsIntersect(
  p1: [number, number],
  q1: [number, number],
  p2: [number, number],
  q2: [number, number]
): boolean {
  const d1 = cross(p2, q2, p1);
  const d2 = cross(p2, q2, q1);
  const d3 = cross(p1, q1, p2);
  const d4 = cross(p1, q1, q2);

  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }

  if (d1 === 0 && onSegment(p2, p1, q2)) return true;
  if (d2 === 0 && onSegment(p2, q1, q2)) return true;
  if (d3 === 0 && onSegment(p1, p2, q1)) return true;
  if (d4 === 0 && onSegment(p1, q2, q1)) return true;

  return false;
}

// ─── Main audit ─────────────────────────────────────────────────────────────

export function runAudit(
  rawData: {
    cities: unknown;
    lines: unknown;
    segments: unknown;
    stations: unknown;
  },
  options?: {
    currentDate?: string;
    selfIntersectionExemptions?: string[];
    intentionalBreaks?: string[];
    referenceDir?: string;
    outOfScopeStations?: Record<string, string[]>;
    outOfScopeLineIds?: string[];
    declarations?: AuditDeclarations;
  }
): AuditResult {
  const cfg = AUDIT_THRESHOLDS;
  const today = options?.currentDate || new Date().toISOString().slice(0, 10);
  const selfIntersectExempt = new Set(
    options?.selfIntersectionExemptions || []
  );
  const intentionalBreaks = new Set(options?.intentionalBreaks || []);
  const outOfScopeStations = options?.outOfScopeStations || {};
  const outOfScopeLineIds = new Set(options?.outOfScopeLineIds || []);

  const findings: Finding[] = [];

  function add(
    city_id: string,
    rule: string,
    severity: Severity,
    subject: string,
    message: string
  ) {
    findings.push({ city_id, rule, severity, subject, message });
  }

  // ── Parse with Zod schemas (reuse existing) ──────────────────────────────

  const citiesParsed = z.array(CitySchema).safeParse(rawData.cities);
  if (!citiesParsed.success) {
    for (const issue of citiesParsed.error.issues) {
      add(
        "dataset",
        "schema-invalid",
        "error",
        `cities[${issue.path.join(".")}]`,
        `City schema: ${issue.message}`
      );
    }
  }

  const linesParsed = z.array(LineSchema).safeParse(rawData.lines);
  if (!linesParsed.success) {
    for (const issue of linesParsed.error.issues) {
      add(
        "dataset",
        "schema-invalid",
        "error",
        `lines[${issue.path.join(".")}]`,
        `Line schema: ${issue.message}`
      );
    }
  }

  const segmentsParsed = SegmentFeatureCollectionSchema.safeParse(
    rawData.segments
  );
  if (!segmentsParsed.success) {
    for (const issue of segmentsParsed.error.issues) {
      add(
        "dataset",
        "schema-invalid",
        "error",
        `segments[${issue.path.join(".")}]`,
        `Segment schema: ${issue.message}`
      );
    }
  }

  const stationsParsed = StationFeatureCollectionSchema.safeParse(
    rawData.stations
  );
  if (!stationsParsed.success) {
    for (const issue of stationsParsed.error.issues) {
      add(
        "dataset",
        "schema-invalid",
        "error",
        `stations[${issue.path.join(".")}]`,
        `Station schema: ${issue.message}`
      );
    }
  }

  // If schemas fail to parse, we can still report structural errors but not proceed with deeper checks
  if (
    !citiesParsed.success ||
    !linesParsed.success ||
    !segmentsParsed.success ||
    !stationsParsed.success
  ) {
    return {
      date: today,
      summaries: [],
      findings: findings.sort(findingSorter),
    };
  }

  const cities = citiesParsed.data;
  const lines = linesParsed.data;
  const segments = segmentsParsed.data;
  const stations = stationsParsed.data;

  // ── Build lookup maps ────────────────────────────────────────────────────

  const cityById = new Map<string, City>();
  cities.forEach((c) => cityById.set(c.id, c));

  const lineById = new Map<string, Line>();
  lines.forEach((l) => lineById.set(l.id, l));

  const segmentsByLineId = new Map<string, SegmentFeature[]>();
  const segmentById = new Map<string, SegmentFeature>();
  for (const seg of segments.features) {
    segmentById.set(seg.properties.segment_id, seg);
    const arr = segmentsByLineId.get(seg.properties.line_id) || [];
    arr.push(seg);
    segmentsByLineId.set(seg.properties.line_id, arr);
  }

  for (const declared of options?.declarations?.segments || []) {
    const compiled = segmentById.get(declared.segment_id);
    if (
      !compiled ||
      compiled.properties.city_id !== declared.city_id ||
      compiled.properties.line_id !== declared.line_id
    ) {
      add(
        declared.city_id,
        "declared-not-compiled",
        "error",
        declared.segment_id,
        `Segment declared in overrides '${declared.segment_id}' has no matching compiled feature`
      );
    }
  }
  for (const declared of options?.declarations?.lines || []) {
    const hasCompiledSegment = (segmentsByLineId.get(declared.line_id) || []).some(
      (segment) => segment.properties.city_id === declared.city_id
    );
    const hasDeclaredSegment = (options?.declarations?.segments || []).some(
      (segment) =>
        segment.city_id === declared.city_id &&
        segment.line_id === declared.line_id &&
        (() => {
          const compiled = segmentById.get(segment.segment_id);
          return !compiled ||
            compiled.properties.city_id !== segment.city_id ||
            compiled.properties.line_id !== segment.line_id;
        })()
    );
    if (!hasCompiledSegment && !hasDeclaredSegment) {
      add(
        declared.city_id,
        "declared-not-compiled",
        "error",
        declared.line_id,
        `Corridor declared in references '${declared.line_id}' has no compiled segment feature`
      );
    }
  }

  const stationsByLineId = new Map<string, StationFeature[]>();
  const stationById = new Map<string, StationFeature>();
  for (const st of stations.features) {
    stationById.set(st.properties.station_id, st);
    for (const lineId of st.properties.line_ids) {
      const arr = stationsByLineId.get(lineId) || [];
      arr.push(st);
      stationsByLineId.set(lineId, arr);
    }
  }

  function declaredSharedCorridorLengthM(
    segA: SegmentFeature,
    segB: SegmentFeature
  ): number | undefined {
    const declaration = segA.properties.shared_corridor;
    const peerDeclaration = segB.properties.shared_corridor;
    if (!declaration || !peerDeclaration) return undefined;
    const declaredIds = [...declaration.segment_ids].sort();
    if (
      JSON.stringify(declaredIds) !==
        JSON.stringify([...peerDeclaration.segment_ids].sort()) ||
      declaredIds[0] !== [segA.properties.segment_id, segB.properties.segment_id].sort()[0] ||
      declaredIds[1] !== [segA.properties.segment_id, segB.properties.segment_id].sort()[1] ||
      JSON.stringify(declaration.shared_station_ids) !==
        JSON.stringify(peerDeclaration.shared_station_ids) ||
      declaration.reason !== peerDeclaration.reason ||
      declaration.source !== peerDeclaration.source
    ) {
      return undefined;
    }

    const sharedStations = declaration.shared_station_ids.map((id) => stationById.get(id));
    if (
      sharedStations.length < 2 ||
      sharedStations.some(
        (station) =>
          !station ||
          !station.properties.line_ids.includes(segA.properties.line_id) ||
          !station.properties.line_ids.includes(segB.properties.line_id)
      )
    ) {
      return undefined;
    }

    const stationCoords = sharedStations.map(
      (station) => station!.geometry.coordinates as [number, number]
    );
    const stationPathM = stationCoords.slice(1).reduce(
      (total, point, index) =>
        total + haversineDistanceKm(stationCoords[index], point) * 1000,
      0
    );
    if (stationPathM <= 0) return undefined;

    const positionsFor = (segment: SegmentFeature) => {
      const coords = segment.geometry.coordinates as [number, number][];
      const projections = stationCoords.map((point) =>
        nearestPointOnPolyline(point, coords)
      );
      if (projections.some((projection) => projection.distanceM > 300)) return undefined;
      const positions = projections.map(
        (projection) => projection.segmentIndex + projection.t
      );
      const increasing = positions.every(
        (position, index) => index === 0 || position > positions[index - 1]
      );
      const decreasing = positions.every(
        (position, index) => index === 0 || position < positions[index - 1]
      );
      return increasing || decreasing ? positions : undefined;
    };
    const segmentPositions = [positionsFor(segA), positionsFor(segB)];
    if (!segmentPositions.every(Boolean)) return undefined;
    const positionRanges = segmentPositions.map((positions) => [
      Math.min(...positions!),
      Math.max(...positions!),
    ] as const);
    const declaredStationIds = new Set(declaration.shared_station_ids);
    const intermediateSharedStation = stations.features.some((station) => {
      if (
        declaredStationIds.has(station.properties.station_id) ||
        !station.properties.line_ids.includes(segA.properties.line_id) ||
        !station.properties.line_ids.includes(segB.properties.line_id)
      ) {
        return false;
      }
      return [segA, segB].every((segment, index) => {
        const projection = nearestPointOnPolyline(
          station.geometry.coordinates as [number, number],
          segment.geometry.coordinates as [number, number][]
        );
        const position = projection.segmentIndex + projection.t;
        const [min, max] = positionRanges[index];
        return projection.distanceM <= 300 && position > min && position < max;
      });
    });
    return intermediateSharedStation ? undefined : stationPathM;
  }

  function overlapMatchesSharedCorridor(
    segA: SegmentFeature,
    segB: SegmentFeature,
    measuredM: number
  ): boolean {
    const declaredM = declaredSharedCorridorLengthM(segA, segB);
    return Boolean(
      declaredM && Math.abs(measuredM - declaredM) / declaredM <= 0.15
    );
  }

  function isValidSchematicSegment(segment: SegmentFeature): boolean {
    const properties = segment.properties;
    if (
      properties.geometry_quality !== "schematic" ||
      (properties.status !== "construction" && properties.status !== "planned") ||
      properties.references.length === 0
    ) {
      return false;
    }
    const coordinates = segment.geometry.coordinates as [number, number][];
    const lineStations = stationsByLineId.get(properties.line_id) || [];
    const nearestAt = (point: [number, number]) =>
      lineStations
        .map((station) => ({
          id: station.properties.station_id,
          distanceM: haversineDistanceKm(
            point,
            station.geometry.coordinates as [number, number]
          ) * 1000,
        }))
        .sort((a, b) => a.distanceM - b.distanceM)[0];
    const start = nearestAt(coordinates[0]);
    const end = nearestAt(coordinates[coordinates.length - 1]);
    return Boolean(
      start && end && start.id !== end.id && start.distanceM <= 300 && end.distanceM <= 300
    );
  }

  const stationsByCityId = new Map<string, StationFeature[]>();
  for (const st of stations.features) {
    const arr = stationsByCityId.get(st.properties.city_id) || [];
    arr.push(st);
    stationsByCityId.set(st.properties.city_id, arr);
  }

  const linesByCityId = new Map<string, Line[]>();
  for (const ln of lines) {
    const arr = linesByCityId.get(ln.city_id) || [];
    arr.push(ln);
    linesByCityId.set(ln.city_id, arr);
  }

  // ── Build summaries ──────────────────────────────────────────────────────

  const summaries: CitySummary[] = [];
  for (const city of cities) {
    const citySegments = segments.features.filter(
      (s) => s.properties.city_id === city.id
    );
    const cityStations = stations.features.filter(
      (s) => s.properties.city_id === city.id
    );
    const cityLines = lines.filter((l) => l.city_id === city.id);

    const segSources: SourceCounts = {};
    for (const s of citySegments) {
      segSources[s.properties.source] =
        (segSources[s.properties.source] || 0) + 1;
    }
    const stSources: SourceCounts = {};
    for (const s of cityStations) {
      stSources[s.properties.source] =
        (stSources[s.properties.source] || 0) + 1;
    }
    const lnSources: SourceCounts = {};
    for (const l of cityLines) {
      lnSources[l.source] = (lnSources[l.source] || 0) + 1;
    }

    summaries.push({
      city_id: city.id,
      city_name: city.name,
      lines: cityLines.length,
      segments: citySegments.length,
      stations: cityStations.length,
      segmentSources: segSources,
      stationSources: stSources,
      lineSources: lnSources,
    });
  }

  // ── A. Structural checks ────────────────────────────────────────────────

  // A1: ID uniqueness across entire dataset
  const allIds = new Map<string, string>(); // id → entity type
  for (const c of cities) {
    if (allIds.has(c.id)) {
      add(
        c.id,
        "id-unique",
        "error",
        c.id,
        `Duplicate ID '${c.id}' (city vs ${allIds.get(c.id)})`
      );
    }
    allIds.set(c.id, "city");
  }
  for (const l of lines) {
    if (allIds.has(l.id)) {
      add(
        l.city_id,
        "id-unique",
        "error",
        l.id,
        `Duplicate ID '${l.id}' (line vs ${allIds.get(l.id)})`
      );
    }
    allIds.set(l.id, "line");
  }
  for (const seg of segments.features) {
    const sid = seg.properties.segment_id;
    if (allIds.has(sid)) {
      add(
        seg.properties.city_id,
        "id-unique",
        "error",
        sid,
        `Duplicate ID '${sid}' (segment vs ${allIds.get(sid)})`
      );
    }
    allIds.set(sid, "segment");
  }
  for (const st of stations.features) {
    const sid = st.properties.station_id;
    if (allIds.has(sid)) {
      add(
        st.properties.city_id,
        "id-unique",
        "error",
        sid,
        `Duplicate ID '${sid}' (station vs ${allIds.get(sid)})`
      );
    }
    allIds.set(sid, "station");
  }

  // A2: Foreign keys
  for (const l of lines) {
    if (!cityById.has(l.city_id)) {
      add(
        l.city_id,
        "fk-resolve",
        "error",
        l.id,
        `Line '${l.id}' references unknown city_id '${l.city_id}'`
      );
    }
  }
  for (const seg of segments.features) {
    const p = seg.properties;
    if (!cityById.has(p.city_id)) {
      add(
        p.city_id,
        "fk-resolve",
        "error",
        p.segment_id,
        `Segment references unknown city_id '${p.city_id}'`
      );
    }
    if (!lineById.has(p.line_id)) {
      add(
        p.city_id,
        "fk-resolve",
        "error",
        p.segment_id,
        `Segment references unknown line_id '${p.line_id}'`
      );
    }
  }
  for (const st of stations.features) {
    const p = st.properties;
    if (p.status !== "operational" && (!p.references || p.references.length === 0)) {
      add(
        p.city_id,
        "future-record-no-reference",
        "warn",
        p.station_id,
        `Future station has no source reference`
      );
    }
    if (
      p.status !== "operational" &&
      (!p.expected_completion || p.completion_unconfirmed)
    ) {
      add(
        p.city_id,
        "future-date-unconfirmed",
        "warn",
        p.station_id,
        `Future station has no verified expected completion date`
      );
    }
    if (!cityById.has(p.city_id)) {
      add(
        p.city_id,
        "fk-resolve",
        "error",
        p.station_id,
        `Station references unknown city_id '${p.city_id}'`
      );
    }
    for (const lineId of p.line_ids) {
      if (!lineById.has(lineId)) {
        add(
          p.city_id,
          "fk-resolve",
          "error",
          p.station_id,
          `Station references unknown line_id '${lineId}'`
        );
      }
    }
  }

  // A3: Coordinates inside India envelope
  for (const seg of segments.features) {
    const p = seg.properties;
    for (const [lng, lat] of seg.geometry.coordinates) {
      if (
        lng < cfg.indiaEnvelope.minLng ||
        lng > cfg.indiaEnvelope.maxLng ||
        lat < cfg.indiaEnvelope.minLat ||
        lat > cfg.indiaEnvelope.maxLat
      ) {
        add(
          p.city_id,
          "coords-india-envelope",
          "error",
          p.segment_id,
          `Coordinate [${lng}, ${lat}] outside India envelope`
        );
        break; // one finding per segment
      }
    }
  }
  for (const st of stations.features) {
    const p = st.properties;
    const [lng, lat] = st.geometry.coordinates;
    if (
      lng < cfg.indiaEnvelope.minLng ||
      lng > cfg.indiaEnvelope.maxLng ||
      lat < cfg.indiaEnvelope.minLat ||
      lat > cfg.indiaEnvelope.maxLat
    ) {
      add(
        p.city_id,
        "coords-india-envelope",
        "error",
        p.station_id,
        `Coordinate [${lng}, ${lat}] outside India envelope`
      );
    }
  }

  // A4: Coordinates outside city bbox margin
  for (const seg of segments.features) {
    const p = seg.properties;
    const city = cityById.get(p.city_id);
    if (!city) continue;
    const [cMinLng, cMinLat, cMaxLng, cMaxLat] = city.bbox;
    for (const [lng, lat] of seg.geometry.coordinates) {
      if (
        lng < cMinLng - cfg.bboxMarginDeg ||
        lng > cMaxLng + cfg.bboxMarginDeg ||
        lat < cMinLat - cfg.bboxMarginDeg ||
        lat > cMaxLat + cfg.bboxMarginDeg
      ) {
        add(
          p.city_id,
          "coords-city-bbox",
          "warn",
          p.segment_id,
          `Coordinate [${lng}, ${lat}] outside city bbox [${city.bbox.join(", ")}] ±${cfg.bboxMarginDeg}°`
        );
        break; // one finding per segment
      }
    }
  }
  for (const st of stations.features) {
    const p = st.properties;
    const city = cityById.get(p.city_id);
    if (!city) continue;
    const [cMinLng, cMinLat, cMaxLng, cMaxLat] = city.bbox;
    const [lng, lat] = st.geometry.coordinates;
    if (
      lng < cMinLng - cfg.bboxMarginDeg ||
      lng > cMaxLng + cfg.bboxMarginDeg ||
      lat < cMinLat - cfg.bboxMarginDeg ||
      lat > cMaxLat + cfg.bboxMarginDeg
    ) {
      add(
        p.city_id,
        "coords-city-bbox",
        "warn",
        p.station_id,
        `Coordinate [${lng}, ${lat}] outside city bbox [${city.bbox.join(", ")}] ±${cfg.bboxMarginDeg}°`
      );
    }
  }

  // A5: Line with no segments
  for (const ln of lines) {
    if (outOfScopeLineIds.has(ln.id)) continue; // explicitly declared as having no geometry yet
    const segs = segmentsByLineId.get(ln.id);
    if (!segs || segs.length === 0) {
      add(
        ln.city_id,
        "line-no-segments",
        "error",
        ln.id,
        `Line has no segments`
      );
    }
  }
  // Segment whose line does not exist (already covered in fk-resolve above)

  // ── B. Geometry checks ───────────────────────────────────────────────────

  // B1-B3: Station distance from segments
  for (const st of stations.features) {
    const p = st.properties;
    const stCoord = st.geometry.coordinates as [number, number];

    let minDistAnyLineSeg = Infinity;

    for (const lineId of p.line_ids) {
      const lineSegs = segmentsByLineId.get(lineId) || [];

      let minDistThisLine = Infinity;
      for (const seg of lineSegs) {
        const d = pointToPolylineDistanceM(
          stCoord,
          seg.geometry.coordinates as [number, number][]
        );
        if (d < minDistThisLine) minDistThisLine = d;
        if (d < minDistAnyLineSeg) minDistAnyLineSeg = d;
      }

      if (
        lineSegs.length > 0 &&
        minDistThisLine > cfg.stationFarFromAllSegmentsM
      ) {
        add(
          p.city_id,
          "station-far-from-all-segments",
          "error",
          p.station_id,
          `Station is ${Math.round(minDistThisLine)} m from nearest segment of line '${lineId}' (threshold: ${cfg.stationFarFromAllSegmentsM} m)`
        );
      } else if (
        lineSegs.length > 0 &&
        minDistThisLine > cfg.stationFarFromNearestSegmentM
      ) {
        add(
          p.city_id,
          "station-far-from-nearest-segment",
          "warn",
          p.station_id,
          `Station is ${Math.round(minDistThisLine)} m from nearest segment of line '${lineId}' (threshold: ${cfg.stationFarFromNearestSegmentM} m)`
        );
      }
    }

    // B3: Orphan station — no nearby segment at all
    if (minDistAnyLineSeg === Infinity) {
      // All lines have zero segments — orphan
      const hasAnySegments = p.line_ids.some(
        (lid) => (segmentsByLineId.get(lid) || []).length > 0
      );
      if (!hasAnySegments && p.line_ids.length > 0) {
        add(
          p.city_id,
          "station-orphan",
          "error",
          p.station_id,
          `Station has no nearby segments (all its lines have no segments)`
        );
      }
    }
  }

  // B4: Segment end far from any station of that line
  for (const seg of segments.features) {
    const p = seg.properties;
    if (
      p.status !== "operational" &&
      (!p.expected_completion || p.completion_unconfirmed)
    ) {
      add(
        p.city_id,
        "future-date-unconfirmed",
        "warn",
        p.segment_id,
        `Future segment has no verified expected completion date`
      );
    }
    if (p.status !== "operational" && p.references.length === 0) {
      add(
        p.city_id,
        "future-record-no-reference",
        "error",
        p.segment_id,
        `Future segment has no source reference`
      );
    }
    const coords = seg.geometry.coordinates as [number, number][];
    if (coords.length < 2) continue;

    const lineStations = stationsByLineId.get(p.line_id) || [];
    if (lineStations.length === 0) continue;

    for (const label of ["start", "end"] as const) {
      const endCoord =
        label === "start" ? coords[0] : coords[coords.length - 1];
      let minDist = Infinity;
      for (const st of lineStations) {
        const d =
          haversineDistanceKm(
            endCoord,
            st.geometry.coordinates as [number, number]
          ) * 1000;
        if (d < minDist) minDist = d;
      }
      if (minDist > cfg.segmentEndFarFromStationM) {
        add(
          p.city_id,
          "segment-end-far-from-station",
          "warn",
          p.segment_id,
          `Segment ${label} is ${Math.round(minDist)} m from nearest station of line '${p.line_id}' (threshold: ${cfg.segmentEndFarFromStationM} m)`
        );
      }
    }
  }

  // B5: Consecutive segments of one line whose ends don't meet
  for (const [lineId, lineSegs] of segmentsByLineId.entries()) {
    if (lineSegs.length < 2) continue;
    const line = lineById.get(lineId);
    const cityId = line?.city_id || lineSegs[0].properties.city_id;

    // Sort segments deterministically by segment_id for reproducibility
    const sorted = [...lineSegs].sort((a, b) =>
      a.properties.segment_id.localeCompare(b.properties.segment_id)
    );

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const aCoords = sorted[i].geometry.coordinates as [number, number][];
        const bCoords = sorted[j].geometry.coordinates as [number, number][];
        if (aCoords.length < 2 || bCoords.length < 2) continue;

        const aStart = aCoords[0];
        const aEnd = aCoords[aCoords.length - 1];
        const bStart = bCoords[0];
        const bEnd = bCoords[bCoords.length - 1];

        // Check if any pair of endpoints is close enough
        const dists = [
          haversineDistanceKm(aEnd, bStart) * 1000,
          haversineDistanceKm(aEnd, bEnd) * 1000,
          haversineDistanceKm(aStart, bStart) * 1000,
          haversineDistanceKm(aStart, bEnd) * 1000,
        ];
        const minDist = Math.min(...dists);

        // Only flag if NO pair of endpoints is within threshold
        // But we only care about pairs that should be consecutive
        // Since we don't know the order, check if ends meet at all
        if (minDist > cfg.consecutiveSegmentGapM) {
          // Check if this pair is marked as an intentional break
          const breakKey = `${sorted[i].properties.segment_id}|${sorted[j].properties.segment_id}`;
          const breakKeyRev = `${sorted[j].properties.segment_id}|${sorted[i].properties.segment_id}`;
          if (
            !intentionalBreaks.has(breakKey) &&
            !intentionalBreaks.has(breakKeyRev)
          ) {
            add(
              cityId,
              "consecutive-segment-gap",
              "warn",
              `${sorted[i].properties.segment_id}|${sorted[j].properties.segment_id}`,
              `Segments of line '${lineId}' have nearest endpoint gap of ${Math.round(minDist)} m (threshold: ${cfg.consecutiveSegmentGapM} m)`
            );
          }
        }
      }
    }
  }

  // B6: Overlapping segments of same line (sample every ~50m, bbox pre-filter)
  for (const [lineId, lineSegs] of segmentsByLineId.entries()) {
    if (lineSegs.length < 2) continue;
    const line = lineById.get(lineId);
    const cityId = line?.city_id || lineSegs[0].properties.city_id;

    for (let i = 0; i < lineSegs.length; i++) {
      for (let j = i + 1; j < lineSegs.length; j++) {
        const segA = lineSegs[i];
        const segB = lineSegs[j];
        if (
          segA.properties.geometry_quality === "schematic" ||
          segB.properties.geometry_quality === "schematic"
        ) {
          continue;
        }
        const coordsA = segA.geometry.coordinates as [number, number][];
        const coordsB = segB.geometry.coordinates as [number, number][];

        // bbox pre-filter
        const bboxA = segmentBbox(coordsA);
        const bboxB = segmentBbox(coordsB);
        const marginDeg = (cfg.overlapProximityM / 111_000) * 2; // rough degree margin
        if (!bboxOverlap(bboxA, bboxB, marginDeg)) continue;

        const lengthAKm = calculateLineStringLengthKm(coordsA);
        const lengthAM = lengthAKm * 1000;
        const numSamples = Math.max(
          2,
          Math.ceil(lengthAM / cfg.overlapSampleIntervalM)
        );

        let closeCount = 0;
        for (let s = 0; s <= numSamples; s++) {
          const t = s / numSamples;
          const samplePt = interpolatePolyline(coordsA, t);
          const dist = pointToPolylineDistanceM(samplePt, coordsB);
          if (dist < cfg.overlapProximityM) closeCount++;
        }

        const sharedM = (closeCount / (numSamples + 1)) * lengthAM;
        if (
          sharedM > cfg.overlapMinSharedM &&
          !overlapMatchesSharedCorridor(segA, segB, sharedM)
        ) {
          add(
            cityId,
            "segment-overlap",
            "error",
            `${segA.properties.segment_id}|${segB.properties.segment_id}`,
            `Segments overlap for ~${Math.round(sharedM)} m (threshold: ${cfg.overlapMinSharedM} m)`
          );
        }
      }
    }
  }

  // B7: Zero-length or self-intersecting segment
  for (const seg of segments.features) {
    const p = seg.properties;
    const coords = seg.geometry.coordinates as [number, number][];

    const lengthKm = calculateLineStringLengthKm(coords);
    if (lengthKm === 0 || coords.length < 2) {
      add(
        p.city_id,
        "segment-zero-length",
        "error",
        p.segment_id,
        `Segment has zero length`
      );
    }

    if (coords.length >= 4 && isSelfIntersecting(coords)) {
      if (
        selfIntersectExempt.has(p.segment_id) ||
        selfIntersectExempt.has(p.line_id)
      ) {
        add(
          p.city_id,
          "segment-self-intersecting",
          "info",
          p.segment_id,
          `Segment is self-intersecting (exempted — loop line)`
        );
      } else {
        add(
          p.city_id,
          "segment-self-intersecting",
          "warn",
          p.segment_id,
          `Segment is self-intersecting`
        );
      }
    }
  }

  // C2 geometry rules: station spacing, hooks, and segments outside the city bbox.
  for (const [lineId, lineStations] of stationsByLineId.entries()) {
    const lineSegments = segmentsByLineId.get(lineId) || [];
    const ordered = [...lineStations]
      .map((station) => {
        let best = {
          segmentOrder: Number.POSITIVE_INFINITY,
          position: Number.POSITIVE_INFINITY,
          distanceM: Number.POSITIVE_INFINITY,
        };
        lineSegments.forEach((segment, segmentOrder) => {
          const projection = nearestPointOnPolyline(
            station.geometry.coordinates as [number, number],
            segment.geometry.coordinates as [number, number][]
          );
          if (projection.distanceM < best.distanceM) {
            best = {
              segmentOrder,
              position: projection.segmentIndex + projection.t,
              distanceM: projection.distanceM,
            };
          }
        });
        return { station, ...best };
      })
      .sort(
        (a, b) =>
          a.segmentOrder - b.segmentOrder || a.position - b.position
      )
      .map(({ station }) => station);
    for (let i = 1; i < ordered.length; i++) {
      const gap = haversineDistanceKm(
        ordered[i - 1].geometry.coordinates as [number, number],
        ordered[i].geometry.coordinates as [number, number]
      ) * 1000;
      if (gap > cfg.stationGapM) {
        add(
          ordered[i].properties.city_id,
          "station-gap",
          "warn",
          `${lineId}|${ordered[i - 1].properties.station_id}|${ordered[i].properties.station_id}`,
          `Stations are ${Math.round(gap)} m apart (threshold: ${cfg.stationGapM} m)`
        );
      }
    }
  }

  for (const seg of segments.features) {
    const p = seg.properties;
    const coords = seg.geometry.coordinates as [number, number][];
    const hooks = shortSharpTurns(
      coords,
      cfg.polylineHookAngleDeg,
      cfg.polylineHookSpanM
    );
    if (hooks > 0 || hasRepeatedCoordinates(coords)) {
      add(
        p.city_id,
        "polyline-hook",
        "warn",
        p.segment_id,
        `Segment contains ${hooks} short sharp turn(s)${hasRepeatedCoordinates(coords) ? " or repeated coordinates" : ""}`
      );
    }

    const city = cityById.get(p.city_id);
    const bbox = city?.bbox;
    if (!bbox) continue;
    const outside = coords.some(
      ([lng, lat]) =>
        lng < bbox[0] ||
        lng > bbox[2] ||
        lat < bbox[1] ||
        lat > bbox[3]
    );
    if (outside) {
      add(
        p.city_id,
        "station-outside-bbox-on-segment",
        "info",
        p.segment_id,
        `Segment has geometry outside the city bbox`
      );
    }
  }

  // B8: Computed length_km vs official_length_km
  for (const seg of segments.features) {
    const p = seg.properties;
    if (p.geometry_quality === "schematic") continue;
    // official_length_km is not yet in schema (M9), but check if present on raw properties
    const raw = p as Record<string, unknown>;
    const officialKm = raw["official_length_km"] as number | undefined;
    if (officialKm == null || officialKm <= 0) continue;

    const computedKm = calculateLineStringLengthKm(
      seg.geometry.coordinates as [number, number][]
    );
    const diff = Math.abs(computedKm - officialKm) / officialKm;

    if (diff > cfg.lengthMismatchErrorPct) {
      add(
        p.city_id,
        "length-mismatch",
        "error",
        p.segment_id,
        `Computed length ${computedKm.toFixed(2)} km vs official ${officialKm} km (${(diff * 100).toFixed(1)}%, threshold: ${cfg.lengthMismatchErrorPct * 100}%)`
      );
    } else if (diff > cfg.lengthMismatchWarnPct) {
      add(
        p.city_id,
        "length-mismatch",
        "warn",
        p.segment_id,
        `Computed length ${computedKm.toFixed(2)} km vs official ${officialKm} km (${(diff * 100).toFixed(1)}%, threshold: ${cfg.lengthMismatchWarnPct * 100}%)`
      );
    }
  }

  // B9: Operational segment marked as schematic
  for (const seg of segments.features) {
    const p = seg.properties;
    if (p.status === "operational" && p.geometry_quality === "schematic") {
      add(
        p.city_id,
        "segment-schematic-operational",
        "error",
        p.segment_id,
        `Operational segment has geometry_quality: 'schematic' (operational segments must not be schematic)`
      );
    } else if (
      p.geometry_quality === "schematic" &&
      !isValidSchematicSegment(seg)
    ) {
      add(
        p.city_id,
        "schematic-segment-incomplete",
        "error",
        p.segment_id,
        `Schematic segment must be construction/planned, cite a corridor source, and terminate at two distinct mapped stations within 300 m`
      );
    }
  }

  // ── C. Semantic consistency ──────────────────────────────────────────────

  // C1: Station status vs segment status
  for (const st of stations.features) {
    const p = st.properties;
    const stationSegStatuses = new Set<string>();

    for (const lineId of p.line_ids) {
      const lineSegs = segmentsByLineId.get(lineId) || [];
      for (const seg of lineSegs) {
        // Check if station is near this segment
        const dist = pointToPolylineDistanceM(
          st.geometry.coordinates as [number, number],
          seg.geometry.coordinates as [number, number][]
        );
        if (dist < cfg.stationFarFromAllSegmentsM) {
          stationSegStatuses.add(seg.properties.status);
        }
      }
    }

    if (stationSegStatuses.size === 0) continue; // no nearby segments found

    // A terminal between operational and construction counts as operational
    if (
      p.status === "operational" &&
      (stationSegStatuses.has("operational") ||
        (stationSegStatuses.has("operational") &&
          stationSegStatuses.has("construction")))
    ) {
      // OK
    } else if (
      p.status === "operational" &&
      !stationSegStatuses.has("operational")
    ) {
      // Station is operational but no operational segments nearby
      add(
        p.city_id,
        "station-status-mismatch",
        "error",
        p.station_id,
        `Station status is 'operational' but nearby segments are: [${[...stationSegStatuses].sort().join(", ")}]`
      );
    } else if (
      p.status === "construction" &&
      !stationSegStatuses.has("construction")
    ) {
      if (!stationSegStatuses.has("operational")) {
        add(
          p.city_id,
          "station-status-mismatch",
          "error",
          p.station_id,
          `Station status is 'construction' but nearby segments are: [${[...stationSegStatuses].sort().join(", ")}]`
        );
      }
    } else if (p.status === "planned" && !stationSegStatuses.has("planned")) {
      add(
        p.city_id,
        "station-status-mismatch",
        "error",
        p.station_id,
        `Station status is 'planned' but nearby segments are: [${[...stationSegStatuses].sort().join(", ")}]`
      );
    }
  }

  // C2: Station phase not among phases of its segments
  for (const st of stations.features) {
    const p = st.properties;
    const segPhases = new Set<string>();

    for (const lineId of p.line_ids) {
      const lineSegs = segmentsByLineId.get(lineId) || [];
      for (const seg of lineSegs) {
        const dist = pointToPolylineDistanceM(
          st.geometry.coordinates as [number, number],
          seg.geometry.coordinates as [number, number][]
        );
        if (dist < cfg.stationFarFromAllSegmentsM) {
          segPhases.add(seg.properties.phase);
        }
      }
    }

    if (segPhases.size > 0 && !segPhases.has(p.phase)) {
      add(
        p.city_id,
        "station-phase-mismatch",
        "error",
        p.station_id,
        `Station phase '${p.phase}' not among nearby segment phases: [${[...segPhases].sort().join(", ")}]`
      );
    }
  }

  // C3: Station opened_on earlier than segment inaugurated_on
  for (const st of stations.features) {
    const p = st.properties;
    if (!p.opened_on) continue;

    for (const lineId of p.line_ids) {
      const lineSegs = segmentsByLineId.get(lineId) || [];
      for (const seg of lineSegs) {
        if (!seg.properties.inaugurated_on) continue;
        const dist = pointToPolylineDistanceM(
          st.geometry.coordinates as [number, number],
          seg.geometry.coordinates as [number, number][]
        );
        if (dist < cfg.stationFarFromAllSegmentsM) {
          if (p.opened_on < seg.properties.inaugurated_on) {
            add(
              p.city_id,
              "station-opened-before-segment",
              "warn",
              p.station_id,
              `Station opened_on '${p.opened_on}' is before segment '${seg.properties.segment_id}' inaugurated_on '${seg.properties.inaugurated_on}'`
            );
          }
        }
      }
    }
  }

  // C4: Operational segment with null inaugurated_on; construction/planned with date
  for (const seg of segments.features) {
    const p = seg.properties;
    if (p.status === "operational" && !p.inaugurated_on) {
      add(
        p.city_id,
        "segment-date-consistency",
        "error",
        p.segment_id,
        `Operational segment has null inaugurated_on`
      );
    }
    if (
      (p.status === "construction" || p.status === "planned") &&
      p.inaugurated_on
    ) {
      add(
        p.city_id,
        "segment-date-consistency",
        "error",
        p.segment_id,
        `${p.status} segment has inaugurated_on '${p.inaugurated_on}' (should be null)`
      );
    }
  }

  // C5: stations_count vs actual assigned stations
  for (const seg of segments.features) {
    const p = seg.properties;
    const lineStations = stationsByLineId.get(p.line_id) || [];

    // Count stations actually near this segment
    let nearbyCount = 0;
    for (const st of lineStations) {
      const dist = pointToPolylineDistanceM(
        st.geometry.coordinates as [number, number],
        seg.geometry.coordinates as [number, number][]
      );
      if (dist < cfg.stationFarFromAllSegmentsM) {
        nearbyCount++;
      }
    }

    if (p.stations_count !== nearbyCount) {
      add(
        p.city_id,
        "stations-count-mismatch",
        "error",
        p.segment_id,
        `stations_count is ${p.stations_count} but ${nearbyCount} stations are near this segment`
      );
    }
  }

  // C6: is_interchange consistency
  for (const st of stations.features) {
    const p = st.properties;
    if (p.is_interchange && p.line_ids.length <= 1) {
      add(
        p.city_id,
        "interchange-consistency",
        "warn",
        p.station_id,
        `is_interchange is true but station is on only ${p.line_ids.length} line(s)`
      );
    }
    if (!p.is_interchange && p.line_ids.length > 1) {
      add(
        p.city_id,
        "interchange-consistency",
        "warn",
        p.station_id,
        `is_interchange is false but station is on ${p.line_ids.length} lines`
      );
    }
    // M12: is_interchange must agree with cluster membership (interchange_id)
    if (p.is_interchange && !p.interchange_id) {
      add(
        p.city_id,
        "interchange-cluster-consistency",
        "error",
        p.station_id,
        `is_interchange is true but interchange_id cluster is missing`
      );
    }
    if (!p.is_interchange && p.interchange_id) {
      add(
        p.city_id,
        "interchange-cluster-consistency",
        "error",
        p.station_id,
        `interchange_id '${p.interchange_id}' is defined but is_interchange is false`
      );
    }
  }

  // C7: Phase label not in city's phases
  for (const seg of segments.features) {
    const p = seg.properties;
    const city = cityById.get(p.city_id);
    if (city && !city.phases.includes(p.phase)) {
      add(
        p.city_id,
        "phase-invalid",
        "error",
        p.segment_id,
        `Phase '${p.phase}' not in city phases [${city.phases.join(", ")}]`
      );
    }
  }
  for (const st of stations.features) {
    const p = st.properties;
    const city = cityById.get(p.city_id);
    if (city && !city.phases.includes(p.phase)) {
      add(
        p.city_id,
        "phase-invalid",
        "error",
        p.station_id,
        `Phase '${p.phase}' not in city phases [${city.phases.join(", ")}]`
      );
    }
  }

  // C8: Segment operator differs from line operator
  for (const seg of segments.features) {
    const p = seg.properties;
    const line = lineById.get(p.line_id);
    if (line && p.operator !== line.operator) {
      add(
        p.city_id,
        "segment-operator-mismatch",
        "error",
        p.segment_id,
        `Segment operator '${p.operator}' differs from line operator '${line.operator}'`
      );
    }
  }

  // C9: Duplicate normalized station names in same city
  for (const city of cities) {
    const cityStations = stationsByCityId.get(city.id) || [];
    const nameMap = new Map<string, string[]>();
    for (const st of cityStations) {
      const norm = normalizeStationName(st.properties.name);
      const arr = nameMap.get(norm) || [];
      arr.push(st.properties.station_id);
      nameMap.set(norm, arr);
    }
    for (const [norm, ids] of nameMap.entries()) {
      if (ids.length > 1) {
        add(
          city.id,
          "duplicate-station-name",
          "warn",
          ids.sort().join("|"),
          `Duplicate normalized station name '${norm}': [${ids.sort().join(", ")}]`
        );
      }
    }
  }

  // C10: Station name quality
  for (const st of stations.features) {
    const p = st.properties;
    const name = p.name;
    const issues: string[] = [];

    if (/\(.*line\)/i.test(name)) {
      issues.push("contains line qualifier");
    }
    if (/metro\s*station/i.test(name)) {
      issues.push("contains 'Metro Station' suffix");
    }
    if (/\s{2,}/.test(name)) {
      issues.push("contains double spaces");
    }
    // Check inconsistent casing (all upper or all lower for multi-word)
    const words = name.split(/\s+/);
    if (words.length > 1) {
      const allUpper = words.every((w) => w === w.toUpperCase());
      const allLower = words.every((w) => w === w.toLowerCase());
      if (allUpper || allLower) {
        issues.push("inconsistent casing");
      }
    }

    if (issues.length > 0) {
      add(
        p.city_id,
        "station-name-quality",
        "warn",
        p.station_id,
        `Station name '${name}': ${issues.join(", ")}`
      );
    }
  }

  // C11: Two lines in one city share a colour
  for (const city of cities) {
    const cityLines = linesByCityId.get(city.id) || [];
    const colorMap = new Map<string, string[]>();
    for (const ln of cityLines) {
      const color = ln.color.toLowerCase();
      const arr = colorMap.get(color) || [];
      arr.push(ln.id);
      colorMap.set(color, arr);
    }
    for (const [color, ids] of colorMap.entries()) {
      if (ids.length > 1) {
        add(
          city.id,
          "duplicate-line-color",
          "warn",
          ids.sort().join("|"),
          `Lines share colour ${color}: [${ids.sort().join(", ")}]`
        );
      }
    }
  }

  // C12: expected_completion in the past without completion_unconfirmed
  for (const seg of segments.features) {
    const p = seg.properties;
    if (p.status === "operational") continue;
    if (!p.expected_completion) continue;
    if (p.completion_unconfirmed) continue;

    let isPast = false;
    if (p.expected_completion.length === 4) {
      isPast = `${p.expected_completion}-12-31` < today;
    } else {
      // YYYY-MM format
      const [year, month] = p.expected_completion.split("-");
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      isPast =
        `${p.expected_completion}-${String(lastDay).padStart(2, "0")}` < today;
    }

    if (isPast) {
      add(
        p.city_id,
        "stale-expected-completion",
        "warn",
        p.segment_id,
        `expected_completion '${p.expected_completion}' is in the past without completion_unconfirmed`
      );
    }
  }

  // C13: last_verified older than 12 months or missing on manual records
  const staleDate = new Date(today);
  staleDate.setMonth(staleDate.getMonth() - cfg.staleVerifiedMonths);
  const staleDateStr = staleDate.toISOString().slice(0, 10);

  for (const seg of segments.features) {
    const p = seg.properties;
    if (p.source.toLowerCase().includes("manual") && !p.last_verified) {
      add(
        p.city_id,
        "stale-last-verified",
        "warn",
        p.segment_id,
        `Manual segment has no last_verified date`
      );
    } else if (p.last_verified && p.last_verified < staleDateStr) {
      add(
        p.city_id,
        "stale-last-verified",
        "warn",
        p.segment_id,
        `last_verified '${p.last_verified}' is older than ${cfg.staleVerifiedMonths} months`
      );
    }
  }
  for (const st of stations.features) {
    const p = st.properties;
    if (p.source.toLowerCase().includes("manual") && !p.last_verified) {
      add(
        p.city_id,
        "stale-last-verified",
        "warn",
        p.station_id,
        `Manual station has no last_verified date`
      );
    } else if (p.last_verified && p.last_verified < staleDateStr) {
      add(
        p.city_id,
        "stale-last-verified",
        "warn",
        p.station_id,
        `last_verified '${p.last_verified}' is older than ${cfg.staleVerifiedMonths} months`
      );
    }
  }

  // C14: Operational record with no reference
  for (const seg of segments.features) {
    const p = seg.properties;
    if (
      p.status === "operational" &&
      (!p.references || p.references.length === 0)
    ) {
      add(
        p.city_id,
        "operational-no-reference",
        "warn",
        p.segment_id,
        `Operational segment has no references`
      );
    }
  }

  // C15: Out of scope station included in dataset
  for (const st of stations.features) {
    const p = st.properties;
    const cityExcluded = outOfScopeStations[p.city_id] || [];
    if (cityExcluded.includes(p.station_id)) {
      add(
        p.city_id,
        "out-of-scope-station",
        "error",
        p.station_id,
        `Station '${p.station_id}' (${p.name}) is marked out of scope but is present in active data`
      );
    }
  }

  // C16: Layout unverified or suspect default
  for (const st of stations.features) {
    const p = st.properties;
    if (p.layout === null || p.layout_source === "unverified") {
      add(
        p.city_id,
        "layout/suspect-default-elevated",
        "warn",
        p.station_id,
        `Station has unverified layout (requires operator station list verification)`
      );
    }
  }

  // ── M10.3 Audit Rules ────────────────────────────────────────────────────

  // M10.3.1: future-segment-no-stations
  // Construction or planned segment with no stations, unless flagged stations_not_published with references
  for (const seg of segments.features) {
    const p = seg.properties;
    if (p.status === "construction" || p.status === "planned") {
      if (p.stations_count === 0 && !p.stations_not_published) {
        add(
          p.city_id,
          "future-segment-no-stations",
          "warn",
          p.segment_id,
          `Future segment has 0 stations assigned without 'stations_not_published' flag`
        );
      }
    }
  }

  // M10.3.2: cross-network-interchange
  // Stations of different cities or networks within 250 m, or with the same normalized name,
  // must share an interchange_id or be listed in data/overrides/interchanges.json
  const normalizeForInterchange = (s: string) =>
    s
      .toLowerCase()
      .replace(/metro|station|\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

  const stationList = stations.features;
  for (let i = 0; i < stationList.length; i++) {
    const s1 = stationList[i];
    const p1 = s1.properties;
    for (let j = i + 1; j < stationList.length; j++) {
      const s2 = stationList[j];
      const p2 = s2.properties;

      if (p1.city_id === p2.city_id) continue;

      const c1 = s1.geometry.coordinates as [number, number];
      const c2 = s2.geometry.coordinates as [number, number];
      const distM = haversineDistanceKm(c1, c2) * 1000;
      const sameName =
        normalizeForInterchange(p1.name) === normalizeForInterchange(p2.name);

      // Only evaluate stations in adjacent/same region (within 1000m or 250m)
      if (distM <= 300 || (distM <= 1000 && sameName)) {
        const shareCluster =
          Boolean(p1.interchange_id) &&
          Boolean(p2.interchange_id) &&
          p1.interchange_id === p2.interchange_id;

        if (!shareCluster) {
          add(
            p1.city_id,
            "cross-network-interchange",
            "error",
            `${p1.station_id}|${p2.station_id}`,
            `Cross-network stations '${p1.name}' (${p1.city_id}) and '${p2.name}' (${p2.city_id}) within ${Math.round(distM)}m do not share an interchange_id`
          );
        }
      }
    }
  }

  // M10.3.3: verified-without-official-source
  // last_verified set on a record whose only references are OSM or none
  for (const seg of segments.features) {
    const p = seg.properties;
    if (p.last_verified) {
      const refs = p.references || [];
      const hasOfficial = refs.some(
        (r) => !r.includes("openstreetmap.org") && r.trim().length > 0
      );
      if (!hasOfficial) {
        add(
          p.city_id,
          "verified-without-official-source",
          "error",
          p.segment_id,
          `Segment has last_verified '${p.last_verified}' without an official or non-OSM reference source`
        );
      }
    }
  }
  for (const st of stations.features) {
    const p = st.properties;
    if (p.last_verified) {
      const refs = p.references || [];
      const hasOfficial = refs.some(
        (r) => !r.includes("openstreetmap.org") && r.trim().length > 0
      );
      if (!hasOfficial) {
        add(
          p.city_id,
          "verified-without-official-source",
          "error",
          p.station_id,
          `Station has last_verified '${p.last_verified}' without an official or non-OSM reference source`
        );
      }
    }
  }

  // M10.3.4: operational-station-no-opened-on
  // Operational station with null opened_on
  for (const st of stations.features) {
    const p = st.properties;
    if (p.status === "operational" && !p.opened_on) {
      add(
        p.city_id,
        "operational-station-no-opened-on",
        "warn",
        p.station_id,
        `Operational station has no opened_on date`
      );
    }
  }

  // ── M8.1 Audit Rules (Report-Only Pending Rules) ──────────────────────────

  // M8.1.1: segment-parallel-duplicate
  // Two traces of the same line run within ~60 m of each other for more than ~300 m (twin tracks)
  // or a single polyline folded back on itself within 60 m for >300 m (Pune Line 1 defect)
  for (const [lineId, lineSegs] of segmentsByLineId.entries()) {
    const line = lineById.get(lineId);
    const cityId = line?.city_id || lineSegs[0]?.properties.city_id;
    if (!cityId) continue;

    // A. Inter-segment parallel check
    if (lineSegs.length >= 2) {
      for (let i = 0; i < lineSegs.length; i++) {
        for (let j = i + 1; j < lineSegs.length; j++) {
          const segA = lineSegs[i];
          const segB = lineSegs[j];
          if (
            segA.properties.geometry_quality === "schematic" ||
            segB.properties.geometry_quality === "schematic"
          ) {
            continue;
          }
          const coordsA = segA.geometry.coordinates as [number, number][];
          const coordsB = segB.geometry.coordinates as [number, number][];

          const bboxA = segmentBbox(coordsA);
          const bboxB = segmentBbox(coordsB);
          const marginDeg = (cfg.parallelDuplicateMaxDistM / 111_000) * 2;
          if (!bboxOverlap(bboxA, bboxB, marginDeg)) continue;

          const lenAKm = calculateLineStringLengthKm(coordsA);
          const lenAM = lenAKm * 1000;
          const stepM = 25;
          const numSamples = Math.max(2, Math.ceil(lenAM / stepM));

          let parallelCount = 0;
          for (let s = 0; s <= numSamples; s++) {
            const t = s / numSamples;
            const pt = interpolatePolyline(coordsA, t);
            const distM = pointToPolylineDistanceM(pt, coordsB);
            if (distM <= cfg.parallelDuplicateMaxDistM) {
              parallelCount++;
            }
          }

          const sharedParallelM = (parallelCount / (numSamples + 1)) * lenAM;
          if (
            sharedParallelM >= cfg.parallelDuplicateMinSharedM &&
            !overlapMatchesSharedCorridor(segA, segB, sharedParallelM)
          ) {
            add(
              cityId,
              "segment-parallel-duplicate",
              "error",
              `${segA.properties.segment_id}|${segB.properties.segment_id}`,
              `Segments run parallel within ${cfg.parallelDuplicateMaxDistM} m for ~${Math.round(sharedParallelM)} m (twin tracks)`
            );
          }
        }
      }
    }

    // B. Intra-segment folded track check (polyline folded back on itself)
    for (const seg of lineSegs) {
      if (seg.properties.geometry_quality === "schematic") continue;
      const coords = seg.geometry.coordinates as [number, number][];
      if (coords.length < 6) continue;

      const segLenKm = calculateLineStringLengthKm(coords);
      const segLenM = segLenKm * 1000;
      if (segLenM < cfg.parallelDuplicateMinSharedM * 2) continue;

      // Sample along the segment and check distance to non-adjacent parts of itself
      const stepM = 30;
      const numSamples = Math.max(4, Math.ceil(segLenM / stepM));
      const samplePoints: Array<{ t: number; pt: [number, number]; distAlongM: number }> = [];

      for (let s = 0; s <= numSamples; s++) {
        const t = s / numSamples;
        samplePoints.push({
          t,
          pt: interpolatePolyline(coords, t),
          distAlongM: t * segLenM,
        });
      }

      let foldedParallelCount = 0;
      for (let s = 0; s < samplePoints.length; s++) {
        const sp = samplePoints[s];
        // Check distance to points that are at least parallelDuplicateMinSharedM away along-track
        for (let other = 0; other < samplePoints.length; other++) {
          const op = samplePoints[other];
          if (Math.abs(sp.distAlongM - op.distAlongM) >= cfg.parallelDuplicateMinSharedM) {
            const d = haversineDistanceKm(sp.pt, op.pt) * 1000;
            if (d <= cfg.parallelDuplicateMaxDistM) {
              foldedParallelCount++;
              break;
            }
          }
        }
      }

      const foldedSharedM = (foldedParallelCount / samplePoints.length) * segLenM;
      if (foldedSharedM >= cfg.parallelDuplicateMinSharedM) {
        add(
          cityId,
          "segment-parallel-duplicate",
          "error",
          seg.properties.segment_id,
          `Segment polyline folds back on itself running parallel within ${cfg.parallelDuplicateMaxDistM} m for ~${Math.round(foldedSharedM)} m`
        );
      }
    }
  }

  // M8.1.2: segment-hairpin
  // A turn sharper than ~150 degrees within ~300 m (a spike that doubles back)
  for (const seg of segments.features) {
    const p = seg.properties;
    const coords = seg.geometry.coordinates as [number, number][];
    if (coords.length < 3) continue;

    for (let i = 1; i < coords.length - 1; i++) {
      const a = coords[i - 1];
      const b = coords[i];
      const c = coords[i + 1];

      const ux = b[0] - a[0];
      const uy = b[1] - a[1];
      const vx = c[0] - b[0];
      const vy = c[1] - b[1];
      const denom = Math.hypot(ux, uy) * Math.hypot(vx, vy);
      if (denom === 0) continue;

      const cosVal = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / denom));
      const interiorAngleDeg = (Math.acos(cosVal) * 180) / Math.PI;
      const spanM =
        haversineDistanceKm(a, b) * 1000 + haversineDistanceKm(b, c) * 1000;

      if (interiorAngleDeg >= cfg.hairpinAngleDeg && spanM <= cfg.hairpinSpanM) {
        add(
          p.city_id,
          "segment-hairpin",
          "error",
          `${p.segment_id}|v${i}`,
          `Segment contains hairpin turn of ${Math.round(interiorAngleDeg)}° within ${Math.round(spanM)} m span (threshold: ${cfg.hairpinAngleDeg}° / ${cfg.hairpinSpanM} m)`
        );
      }
    }
  }

  // M8.1.3: segment-sparse-vertices
  // A leg longer than ~1 km in a segment not marked schematic (straight chord across a curve)
  for (const seg of segments.features) {
    const p = seg.properties;
    if (p.geometry_quality === "schematic") continue;
    const coords = seg.geometry.coordinates as [number, number][];
    if (coords.length < 2) continue;

    for (let i = 0; i < coords.length - 1; i++) {
      const legDistM = haversineDistanceKm(coords[i], coords[i + 1]) * 1000;
      if (legDistM > cfg.sparseVertexMaxChordM) {
        add(
          p.city_id,
          "segment-sparse-vertices",
          "warn",
          `${p.segment_id}|leg-${i}-${i + 1}`,
          `Segment has a leg of ${Math.round(legDistM)} m without vertices (threshold: ${cfg.sparseVertexMaxChordM} m for non-schematic segments)`
        );
      }
    }
  }

  // M8.1.4: orphan-future-station
  // Construction or planned stations must also pass the orphan and 75 m / 250 m checks
  for (const st of stations.features) {
    const p = st.properties;
    if (p.status !== "construction" && p.status !== "planned") continue;

    const stCoord = st.geometry.coordinates as [number, number];
    let minDistAnyLineSeg = Infinity;

    for (const lineId of p.line_ids) {
      const lineSegs = segmentsByLineId.get(lineId) || [];
      let minDistThisLine = Infinity;

      for (const seg of lineSegs) {
        const d = pointToPolylineDistanceM(
          stCoord,
          seg.geometry.coordinates as [number, number][]
        );
        if (d < minDistThisLine) minDistThisLine = d;
        if (d < minDistAnyLineSeg) minDistAnyLineSeg = d;
      }

      if (lineSegs.length > 0 && minDistThisLine > cfg.stationFarFromAllSegmentsM) {
        add(
          p.city_id,
          "orphan-future-station",
          "error",
          p.station_id,
          `Future station is ${Math.round(minDistThisLine)} m from nearest segment of line '${lineId}' (threshold: ${cfg.stationFarFromAllSegmentsM} m)`
        );
      }
    }

    if (minDistAnyLineSeg === Infinity) {
      add(
        p.city_id,
        "orphan-future-station",
        "error",
        p.station_id,
        `Future station has no segments for any of its lines`
      );
    }
  }

  // ── D. Ground truth comparison ───────────────────────────────────────────

  const refDir =
    options?.referenceDir || path.resolve(process.cwd(), "data/reference");
  for (const city of cities) {
    const refPath = path.join(refDir, `${city.id}.json`);
    if (!fs.existsSync(refPath)) {
      add(
        city.id,
        "ground-truth-missing",
        "info",
        city.id,
        `No reference file found at ${path.basename(refPath)}`
      );
      continue;
    }

    let refData: ReferenceFile;
    try {
      refData = JSON.parse(fs.readFileSync(refPath, "utf-8"));
    } catch {
      add(
        city.id,
        "ground-truth-parse-error",
        "error",
        city.id,
        `Failed to parse reference file ${path.basename(refPath)}`
      );
      continue;
    }

    const cityLines = linesByCityId.get(city.id) || [];

    for (const refLine of refData.lines) {
      if (options?.outOfScopeLineIds?.includes(refLine.line_id)) {
        continue;
      }

      // D4: Line missing from data
      if (!lineById.has(refLine.line_id)) {
        add(
          city.id,
          "ground-truth-line-missing",
          "error",
          refLine.line_id,
          `Line '${refLine.line_id}' in reference but not in data`
        );
        continue;
      }

      // Check line operator against reference
      const dataLine = lineById.get(refLine.line_id)!;
      if (refLine.operator && dataLine.operator !== refLine.operator) {
        const isUnverified = refLine.confidence === "unverified";
        const sev: Severity = isUnverified ? "warn" : "error";
        const label = isUnverified ? " (unverified reference)" : "";
        add(
          city.id,
          "line-operator-matches-reference",
          sev,
          refLine.line_id,
          `Line operator: data has '${dataLine.operator}', reference has '${refLine.operator}'${label}`
        );
      }

      // D1: Operational station count per line
      if (refLine.operational_stations != null) {
        const lineStations = (
          stationsByLineId.get(refLine.line_id) || []
        ).filter((s) => s.properties.status === "operational");
        if (lineStations.length !== refLine.operational_stations) {
          const isUnverified = refLine.confidence === "unverified";
          const sev: Severity = isUnverified ? "warn" : "error";
          const label = isUnverified ? " (unverified reference)" : "";
          add(
            city.id,
            "ground-truth-station-count",
            sev,
            refLine.line_id,
            `Operational station count: data has ${lineStations.length}, reference has ${refLine.operational_stations}${label}`
          );
        }
      }

      // Reference topology check: loops have no terminals; loop_with_branch, linear, and branched must declare terminals
      if (refLine.topology === "loop") {
        if (refLine.terminals && refLine.terminals.length > 0) {
          add(
            city.id,
            "reference-self-check",
            "error",
            refLine.line_id,
            `Line '${refLine.line_id}' has topology 'loop' and must have empty terminals`
          );
        }
      } else if (refLine.topology === "loop_with_branch") {
        if (!refLine.terminals || refLine.terminals.length === 0) {
          add(
            city.id,
            "reference-self-check",
            "error",
            refLine.line_id,
            `Line '${refLine.line_id}' with topology 'loop_with_branch' must declare branch terminal station(s)`
          );
        }
      } else if (
        refLine.operational_stations &&
        refLine.operational_stations > 0
      ) {
        if (!refLine.terminals || refLine.terminals.length === 0) {
          add(
            city.id,
            "reference-self-check",
            "error",
            refLine.line_id,
            `Operational line '${refLine.line_id}' with topology '${refLine.topology || "linear"}' must declare terminal stations`
          );
        }
      }

      // D2: Terminal station names (after alias normalization)
      if (refLine.terminals && refLine.terminals.length > 0) {
        const lineStations = stationsByLineId.get(refLine.line_id) || [];
        const lineSegs = segmentsByLineId.get(refLine.line_id) || [];
        const stationNames = new Set(
          lineStations.map((s) => normalizeStationName(s.properties.name))
        );
        for (const terminal of refLine.terminals) {
          const normTerm = normalizeStationName(terminal);
          if (!stationNames.has(normTerm)) {
            const isUnverified = refLine.confidence === "unverified";
            const sev: Severity = isUnverified ? "warn" : "error";
            const label = isUnverified ? " (unverified reference)" : "";
            add(
              city.id,
              "reference-station-missing",
              sev,
              refLine.line_id,
              `Terminal '${terminal}' from reference not found in data station names${label}`
            );
          } else {
            // M8.1.5: line-terminal-missing
            // Every terminal in the reference must have a station within ~300 m of a segment end of that line
            const termStation = lineStations.find(
              (s) => normalizeStationName(s.properties.name) === normTerm
            );
            if (termStation && lineSegs.length > 0) {
              const stCoord = termStation.geometry.coordinates as [number, number];
              let minEndDistM = Infinity;

              for (const seg of lineSegs) {
                const coords = seg.geometry.coordinates as [number, number][];
                if (coords.length < 2) continue;
                const startPt = coords[0];
                const endPt = coords[coords.length - 1];
                const dStart = haversineDistanceKm(stCoord, startPt) * 1000;
                const dEnd = haversineDistanceKm(stCoord, endPt) * 1000;
                if (dStart < minEndDistM) minEndDistM = dStart;
                if (dEnd < minEndDistM) minEndDistM = dEnd;
              }

              if (minEndDistM > cfg.terminalToSegmentEndMaxM) {
                add(
                  city.id,
                  "line-terminal-missing",
                  "error",
                  `${refLine.line_id}|${termStation.properties.station_id}`,
                  `Terminal station '${terminal}' is ${Math.round(minEndDistM)} m away from nearest segment end of line '${refLine.line_id}' (threshold: ${cfg.terminalToSegmentEndMaxM} m)`
                );
              }
            } else if (!termStation || lineSegs.length === 0) {
              add(
                city.id,
                "line-terminal-missing",
                "error",
                `${refLine.line_id}|${terminal}`,
                `Terminal station '${terminal}' has no segment endpoints on line '${refLine.line_id}'`
              );
            }
          }
        }
      }

      // Reference self-check: openings chronological, stage sums only when every stage has a non-null count
      if (refLine.openings && refLine.openings.length > 0) {
        let runningTotal = 0;
        let lastDate: string | null = null;
        let dateOrderValid = true;
        let allStagesHaveCounts = true;

        for (const op of refLine.openings) {
          if (op.stations_added != null) {
            runningTotal += op.stations_added;
          } else {
            allStagesHaveCounts = false;
          }
          if (op.opened_on) {
            if (lastDate && op.opened_on < lastDate) {
              dateOrderValid = false;
            }
            lastDate = op.opened_on;
          }
          if (
            op.source?.kind &&
            !["official", "government", "news"].includes(op.source.kind)
          ) {
            add(
              city.id,
              "reference-self-check",
              "error",
              refLine.line_id,
              `Opening stage '${op.stage}' has invalid source kind '${op.source.kind}'`
            );
          }
        }

        if (!dateOrderValid) {
          add(
            city.id,
            "reference-self-check",
            "error",
            refLine.line_id,
            `Openings for line '${refLine.line_id}' are not in chronological order`
          );
        }

        // Compare stage sums only when every stage has a non-null count; otherwise compare line totals
        if (
          allStagesHaveCounts &&
          refLine.operational_stations != null &&
          runningTotal !== refLine.operational_stations
        ) {
          add(
            city.id,
            "reference-self-check",
            "error",
            refLine.line_id,
            `Reference self-check: sum of stations_added (${runningTotal}) does not match operational_stations (${refLine.operational_stations})`
          );
        }
      }

      if (refLine.construction && refLine.construction.length > 0) {
        for (const con of refLine.construction) {
          if (
            con.source?.kind &&
            !["official", "government", "news"].includes(con.source.kind)
          ) {
            add(
              city.id,
              "reference-self-check",
              "error",
              refLine.line_id,
              `Construction stretch '${con.stretch}' has invalid source kind '${con.source.kind}'`
            );
          }

          // M8.1.6: reference-construction-stretch-missing
          // Every construction[] stretch in the reference needs a data segment with matching status
          const lineSegs = segmentsByLineId.get(refLine.line_id) || [];
        const conSegs = lineSegs.filter(
          (segment) =>
            segment.properties.status === "construction" &&
            (segment.properties.geometry_quality !== "schematic" ||
              isValidSchematicSegment(segment))
        );

          // Parse stretch terminals if formatted like "Start - End" or "Start to End"
          const stretchParts = con.stretch
            .split(/\s*(?:-|–|—|to)\s*/i)
            .map((s) => s.trim())
            .filter(Boolean);

          if (conSegs.length === 0) {
            add(
              city.id,
              "declared-not-compiled",
              "error",
              `${refLine.line_id}|${con.stretch}`,
              `Corridor '${con.stretch}' declared in references has no compiled construction feature`
            );
          } else if (stretchParts.length >= 2) {
            const lineStations = stationsByLineId.get(refLine.line_id) || [];
            const stA = lineStations.find(
              (s) => normalizeStationName(s.properties.name) === normalizeStationName(stretchParts[0])
            );
            const stB = lineStations.find(
              (s) => normalizeStationName(s.properties.name) === normalizeStationName(stretchParts[1])
            );

            if (stA && stB) {
              const ptA = stA.geometry.coordinates as [number, number];
              const ptB = stB.geometry.coordinates as [number, number];

              // Verify if there is any construction segment whose ends match ptA and ptB within threshold
              const hasMatchingSeg = conSegs.some((seg) => {
                const coords = seg.geometry.coordinates as [number, number][];
                if (coords.length < 2) return false;
                const segStart = coords[0];
                const segEnd = coords[coords.length - 1];

                const matchDirect =
                  haversineDistanceKm(ptA, segStart) * 1000 <= cfg.constructionStretchEndMaxM &&
                  haversineDistanceKm(ptB, segEnd) * 1000 <= cfg.constructionStretchEndMaxM;
                const matchReverse =
                  haversineDistanceKm(ptA, segEnd) * 1000 <= cfg.constructionStretchEndMaxM &&
                  haversineDistanceKm(ptB, segStart) * 1000 <= cfg.constructionStretchEndMaxM;
                return matchDirect || matchReverse;
              });

              if (!hasMatchingSeg) {
                add(
                  city.id,
                  "reference-construction-stretch-missing",
                  "error",
                  `${refLine.line_id}|${con.stretch}`,
                  `Construction stretch '${con.stretch}' endpoints ('${stretchParts[0]}', '${stretchParts[1]}') do not match endpoints of any construction segment within ${cfg.constructionStretchEndMaxM} m`
                );
              }
            }
          }
        }
      }

      // D3: Opening date of a phase
      if (refLine.openings) {
        for (const refOpening of refLine.openings) {
          if (!refOpening.opened_on) continue;
          const lineSegs = segmentsByLineId.get(refLine.line_id) || [];
          const phaseSegs = lineSegs.filter(
            (s) => s.properties.phase === refOpening.phase
          );
          for (const seg of phaseSegs) {
            if (
              seg.properties.inaugurated_on &&
              seg.properties.inaugurated_on !== refOpening.opened_on
            ) {
              const isUnverified =
                refOpening.confidence === "unverified" ||
                refLine.confidence === "unverified";
              const sev: Severity = isUnverified ? "warn" : "error";
              const label = isUnverified ? " (unverified reference)" : "";
              add(
                city.id,
                "ground-truth-phase-date",
                sev,
                seg.properties.segment_id,
                `Phase '${refOpening.phase}' opened_on: data has '${seg.properties.inaugurated_on}', reference has '${refOpening.opened_on}'${label}`
              );
            }
          }
        }
      }

      // D5: Total operational length
      const refLengthKm = refLine.operational_length_km;
      if (refLengthKm != null) {
        const lineSegs = segmentsByLineId.get(refLine.line_id) || [];
        const opSegs = lineSegs.filter(
          (s) =>
            s.properties.status === "operational" &&
            s.properties.geometry_quality !== "schematic"
        );
        const totalKm = opSegs.reduce(
          (acc, s) =>
            acc +
            calculateLineStringLengthKm(
              s.geometry.coordinates as [number, number][]
            ),
          0
        );
        const diff = Math.abs(totalKm - refLengthKm) / refLengthKm;
        if (diff > cfg.groundTruthLengthWarnPct) {
          const isUnverified = refLine.confidence === "unverified";
          const sev: Severity = isUnverified ? "warn" : "warn";
          const label = isUnverified ? " (unverified reference)" : "";
          add(
            city.id,
            "ground-truth-length",
            sev,
            refLine.line_id,
            `Operational length: computed ${totalKm.toFixed(2)} km vs reference ${refLengthKm} km (${(diff * 100).toFixed(1)}%)${label}`
          );
        }
      }
    }

    // M8.1.7: city-km-vs-reference
    // City operational km differs from the reference by more than 10 percent (each line counted once)
    let cityDataOpKm = 0;
    let cityRefOpKm = 0;

    for (const refLine of refData.lines) {
      if (refLine.operational_length_km != null) {
        cityRefOpKm += refLine.operational_length_km;
      }
      const lineSegs = segmentsByLineId.get(refLine.line_id) || [];
        const opSegs = lineSegs.filter(
          (s) =>
            s.properties.status === "operational" &&
            s.properties.geometry_quality !== "schematic"
        );
      const lineKm = opSegs.reduce(
        (acc, s) => acc + calculateLineStringLengthKm(s.geometry.coordinates as [number, number][]),
        0
      );
      cityDataOpKm += lineKm;
    }

    if (cityRefOpKm > 0) {
      const cityKmDiff = Math.abs(cityDataOpKm - cityRefOpKm) / cityRefOpKm;
      if (cityKmDiff > cfg.cityKmVsReferenceErrorPct) {
        add(
          city.id,
          "city-km-vs-reference",
          "error",
          city.id,
          `City operational km differs from reference by ${(cityKmDiff * 100).toFixed(1)}%: computed ${cityDataOpKm.toFixed(2)} km vs reference ${cityRefOpKm.toFixed(2)} km (threshold: ${cfg.cityKmVsReferenceErrorPct * 100}%)`
        );
      }
    }

    // D4 reverse: Line missing from reference
    for (const dataLine of cityLines) {
      if (!refData.lines.find((rl) => rl.line_id === dataLine.id)) {
        add(
          city.id,
          "ground-truth-line-missing",
          "error",
          dataLine.id,
          `Line '${dataLine.id}' in data but not in reference`
        );
      }
    }
  }

  // ── Info: distribution of last_verified values ───────────────────────────

  for (const city of cities) {
    const citySegs = segments.features.filter(
      (s) => s.properties.city_id === city.id
    );
    const cityStns = stationsByCityId.get(city.id) || [];

    const dateCounts = new Map<string, number>();
    for (const seg of citySegs) {
      const d = seg.properties.last_verified || "missing";
      dateCounts.set(d, (dateCounts.get(d) || 0) + 1);
    }
    for (const st of cityStns) {
      const d = st.properties.last_verified || "missing";
      dateCounts.set(d, (dateCounts.get(d) || 0) + 1);
    }

    const distribution = [...dateCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => `${date}: ${count}`)
      .join("; ");

    add(
      city.id,
      "last-verified-distribution",
      "info",
      city.id,
      `last_verified distribution: ${distribution}`
    );
  }

  // ── Sort deterministically ───────────────────────────────────────────────
  findings.sort(findingSorter);

  return { date: today, summaries, findings };
}

function findingSorter(a: Finding, b: Finding): number {
  const sevOrder: Record<Severity, number> = { error: 0, warn: 1, info: 2 };
  let d = a.city_id.localeCompare(b.city_id);
  if (d !== 0) return d;
  d = sevOrder[a.severity] - sevOrder[b.severity];
  if (d !== 0) return d;
  d = a.rule.localeCompare(b.rule);
  if (d !== 0) return d;
  return a.subject.localeCompare(b.subject);
}

// ─── Re-export Report Formatters & Baseline Helpers ─────────────────────────

export {
  applyBaseline,
  formatMarkdownReport,
  formatJsonReport,
} from "./audit-formatters";
