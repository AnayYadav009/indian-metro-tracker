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
  pointToSegmentDistanceM,
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

export interface BaselineFile {
  accepted_warnings: BaselineEntry[];
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
        if (sharedM > cfg.overlapMinSharedM) {
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

  // B8: Computed length_km vs official_length_km
  for (const seg of segments.features) {
    const p = seg.properties;
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
    const cityLineIds = new Set(cityLines.map((l) => l.id));

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
        const stationNames = new Set(
          lineStations.map((s) => normalizeStationName(s.properties.name))
        );
        for (const terminal of refLine.terminals) {
          if (!stationNames.has(normalizeStationName(terminal))) {
            const isUnverified = refLine.confidence === "unverified";
            const sev: Severity = isUnverified ? "warn" : "error";
            const label = isUnverified ? " (unverified reference)" : "";
            add(
              city.id,
              "ground-truth-terminal-mismatch",
              sev,
              refLine.line_id,
              `Terminal '${terminal}' from reference not found in data station names${label}`
            );
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
          (s) => s.properties.status === "operational"
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
