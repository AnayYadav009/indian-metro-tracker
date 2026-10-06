import fs from "node:fs";
import path from "node:path";
import { calculateLineStringLengthKm } from "../../lib/geo";
import { slugify, type NormalizedCityData, type NormalizedSegment, type NormalizedStation } from "./normalize";
import type { SegmentFeature, StationFeature } from "../../types/metro";

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
    city: string;
    color: string;
    operator: string;
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
  }>;
  interchangeStationNames?: string[];
  stationOverrides?: Record<
    string,
    {
      line_ids?: string[];
      phase?: string;
      status?: "operational" | "construction" | "planned";
      opened_on?: string | null;
      expected_completion?: string | null;
      is_interchange?: boolean;
      layout?: "underground" | "elevated" | "at-grade";
    }
  >;
}

/**
 * Calculates geodesic distance between two points in km (Haversine).
 */
function pointDistanceKm(p1: [number, number], p2: [number, number]): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const dLon = ((p2[0] - p1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[1] * Math.PI) / 180) *
      Math.cos((p2[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates minimum distance from a point to a LineString geometry in km.
 */
function minDistanceToLine(point: [number, number], line: [number, number][]): number {
  let min = Infinity;
  for (const coord of line) {
    const d = pointDistanceKm(point, coord);
    if (d < min) min = d;
  }
  return min;
}

export function mergeCityOverrides(
  normalized: NormalizedCityData,
  overrides: CityOverrideData
): {
  segments: SegmentFeature[];
  stations: StationFeature[];
} {
  const cityName = overrides.city.name;
  const operator = overrides.city.operator;
  const sourceTag = `osm+${operator.toLowerCase()}`;
  const today = "2026-10-05";

  // Map normalized segments by osmId
  const normalizedSegsByOsmId = new Map<number, NormalizedSegment>();
  normalized.segments.forEach((s) => normalizedSegsByOsmId.set(s.osmId, s));

  // 1. Process Segments
  const segmentFeatures: SegmentFeature[] = [];
  const segmentsForProximity: Array<{ line_id: string; phase: string; status: "operational" | "construction" | "planned"; coords: [number, number][] }> = [];

  for (const segOverride of overrides.segments) {
    let coords: [number, number][] | undefined;
    let stationsCount = segOverride.stations_count || 10;

    let isOsmSourced = false;
    if (segOverride.osmId && normalizedSegsByOsmId.has(segOverride.osmId)) {
      const normSeg = normalizedSegsByOsmId.get(segOverride.osmId)!;
      coords = normSeg.coordinates;
      if (normSeg.stationOsmIds && normSeg.stationOsmIds.length > 0) {
        stationsCount = normSeg.stationOsmIds.length;
      }
      isOsmSourced = true;
    } else if (segOverride.coordinates && segOverride.coordinates.length >= 2) {
      coords = segOverride.coordinates;
      isOsmSourced = false;
    }

    if (!coords || coords.length < 2) {
      console.warn(`⚠️ Segment ${segOverride.segment_id} has no valid coordinates. Skipping.`);
      continue;
    }

    const computedKm = calculateLineStringLengthKm(coords);
    const lengthKm = Number(computedKm.toFixed(1));
    const segmentSource = isOsmSourced ? "osm" : "manual";

    segmentFeatures.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
      properties: {
        segment_id: segOverride.segment_id,
        line_id: segOverride.line_id,
        line_name: segOverride.line_name,
        city: cityName,
        operator,
        status: segOverride.status,
        phase: segOverride.phase,
        length_km: lengthKm,
        gauge: segOverride.gauge,
        inaugurated_on: segOverride.status === "operational" ? segOverride.inaugurated_on : null,
        expected_completion:
          segOverride.status === "construction" || segOverride.status === "planned"
            ? segOverride.expected_completion
            : null,
        stations_count: stationsCount,
        color: segOverride.color,
        source: segmentSource,
        last_verified: today,
      },
    });

    segmentsForProximity.push({
      line_id: segOverride.line_id,
      phase: segOverride.phase,
      status: segOverride.status,
      coords,
    });
  }

  // 2. Process Stations
  const interchangeSet = new Set<string>(
    (overrides.interchangeStationNames || []).map((n) => n.toLowerCase())
  );

  const stationFeatures: StationFeature[] = [];
  const seenStationIds = new Set<string>();
  const seenStationCoords: Array<{ id: string; coords: [number, number]; name: string }> = [];

  for (const station of normalized.stations) {
    const rawName = station.name;
    const prefix =
      overrides.city.id === "delhi"
        ? "del"
        : overrides.city.id === "bengaluru"
          ? "blr"
          : overrides.city.id === "mumbai"
            ? "mum"
            : overrides.city.id;
    const baseSlug = `${prefix}-${slugify(rawName)}`;
    let stationId = baseSlug;

    // Check proximity deduplication (within 80 meters with similar name)
    const existing = seenStationCoords.find(
      (s) =>
        pointDistanceKm(station.coordinates, s.coords) < 0.08 ||
        (s.name.toLowerCase() === rawName.toLowerCase() && pointDistanceKm(station.coordinates, s.coords) < 0.3)
    );
    if (existing) {
      continue;
    }

    let counter = 1;
    while (seenStationIds.has(stationId)) {
      stationId = `${baseSlug}-${++counter}`;
    }
    seenStationIds.add(stationId);
    seenStationCoords.push({ id: stationId, coords: station.coordinates, name: rawName });

    // Associate station with lines
    const lineIdsSet = new Set<string>();
    let assignedPhase = overrides.city.phases[0];
    let assignedStatus: "operational" | "construction" | "planned" = "operational";

    // Proximity to segments (match lines within 300 meters)
    let closestDist = Infinity;
    let closestSegment = segmentsForProximity[0];

    for (const seg of segmentsForProximity) {
      const dist = minDistanceToLine(station.coordinates, seg.coords);
      if (dist < 0.3) {
        lineIdsSet.add(seg.line_id);
      }
      if (dist < closestDist) {
        closestDist = dist;
        closestSegment = seg;
      }
    }

    if (lineIdsSet.size === 0 && closestSegment) {
      lineIdsSet.add(closestSegment.line_id);
    }

    if (closestSegment) {
      assignedPhase = closestSegment.phase;
      assignedStatus = closestSegment.status;
    }

    if (station.status && station.status !== "operational") {
      assignedStatus = station.status;
    }

    // Check interchange flag
    const isInterchange =
      interchangeSet.has(rawName.toLowerCase()) ||
      lineIdsSet.size > 1;

    // Determine layout
    const tags = station.tags || {};
    const isUnderground =
      tags.tunnel === "yes" ||
      tags.location === "underground" ||
      tags.layer === "-1" ||
      tags.layer === "-2";
    const layout = isUnderground ? "underground" : "elevated";

    // Date properties
    let openedOn: string | null = null;
    let expectedCompletion: string | null = null;

    if (assignedStatus === "operational") {
      openedOn = "2006-11-11"; // Fallback operational opening
      expectedCompletion = null;
    } else if (assignedStatus === "construction") {
      openedOn = null;
      expectedCompletion = "2026-12";
    } else {
      openedOn = null;
      expectedCompletion = "2028";
    }

    // Apply specific station override if present
    const override = overrides.stationOverrides?.[stationId] || overrides.stationOverrides?.[rawName];
    if (override) {
      if (override.line_ids) lineIdsSet.clear();
      override.line_ids?.forEach((id) => lineIdsSet.add(id));
      if (override.phase) assignedPhase = override.phase;
      if (override.status) assignedStatus = override.status;
      if (override.opened_on !== undefined) openedOn = override.opened_on;
      if (override.expected_completion !== undefined) expectedCompletion = override.expected_completion;
    }

    stationFeatures.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: station.coordinates,
      },
      properties: {
        station_id: stationId,
        name: rawName,
        city: cityName,
        line_ids: Array.from(lineIdsSet),
        status: assignedStatus,
        phase: assignedPhase,
        is_interchange: isInterchange,
        opened_on: openedOn,
        expected_completion: expectedCompletion,
        layout,
        source: "osm",
        last_verified: today,
      },
    });
  }

  return {
    segments: segmentFeatures,
    stations: stationFeatures,
  };
}
