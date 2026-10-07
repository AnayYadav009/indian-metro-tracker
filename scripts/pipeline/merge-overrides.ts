import fs from "node:fs";
import path from "node:path";
import { calculateLineStringLengthKm, pointToPolylineDistanceM } from "../../lib/geo";
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
    city_id?: string;
    city: string;
    color: string;
    operator: string;
    source: string;
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
  }>;
  interchangeStationNames?: string[];
  dedupeRadiusM?: number;
  stationAliases?: Record<string, string>;
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
      last_verified?: string;
    }
  >;
  out_of_scope_station_ids?: string[];
  out_of_scope_line_ids?: string[];
}


export function mergeCityOverrides(
  normalized: NormalizedCityData,
  overrides: CityOverrideData,
  retrievedAt?: string
): {
  segments: SegmentFeature[];
  stations: StationFeature[];
} {
  const cityName = overrides.city.name;

  // Map normalized segments by osmId
  const normalizedSegsByOsmId = new Map<number, NormalizedSegment>();
  normalized.segments.forEach((s) => normalizedSegsByOsmId.set(s.osmId, s));

  // Map lines by line_id for operator lookup
  const lineById = new Map<string, { operator: string; name: string }>();
  overrides.lines.forEach((l) => lineById.set(l.id, { operator: l.operator, name: l.name }));

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

    const geometryQuality: "exact" | "schematic" = segOverride.geometry_quality || "exact";

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

  for (const station of normalized.stations) {
    const rawName = station.name;
    const resolvedName = aliasMap.get(rawName.toLowerCase()) || rawName;

    const prefix =
      overrides.city.id === "delhi"
        ? "del"
        : overrides.city.id === "bengaluru"
          ? "blr"
          : overrides.city.id === "mumbai"
            ? "mum"
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
      const dist = pointDistanceKm(station.coordinates, s.coords);
      if (dist > dedupeRadiusKm) return false;

      const sameName =
        s.baseName.toLowerCase() === resolvedName.toLowerCase() ||
        s.baseName.toLowerCase() === rawName.toLowerCase();
      const aliasMatch =
        aliasMap.get(s.baseName.toLowerCase())?.toLowerCase() === resolvedName.toLowerCase();
      const sharedInterchangeTag = Boolean(
        (station.tags?.interchange === "yes" || station.tags?.public_transport === "stop_area") &&
          (s.tags?.interchange === "yes" || s.tags?.public_transport === "stop_area")
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
      continue;
    }

    let counter = 1;
    while (seenStationIds.has(stationId)) {
      stationId = `${baseSlug}-${++counter}`;
    }
    seenStationIds.add(stationId);

    deduplicatedStations.push({
      id: stationId,
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
    layout: "underground" | "elevated" | "at-grade";
    openedOn: string | null;
    expectedCompletion: string | null;
    lastVerified: string | null;
  }> = [];

  for (const st of deduplicatedStations) {
    const lineIdsSet = new Set<string>();
    let assignedPhase = overrides.city.phases[0];
    let assignedStatus: "operational" | "construction" | "planned" = "operational";

    // Tier 1: OSM route relation membership
    for (const relRef of st.lineRefs) {
      const segMatch = overrides.segments.find((s) => s.osmId === Number(relRef));
      if (segMatch) {
        lineIdsSet.add(segMatch.line_id);
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
    } else if (st.tags?.railway === "construction" || st.tags?.proposed || st.tags?.railway === "proposed") {
      assignedStatus = st.tags.railway === "construction" ? "construction" : "planned";
    }

    // Layout
    const tags = st.tags || {};
    const isUnderground =
      tags.tunnel === "yes" ||
      tags.location === "underground" ||
      tags.layer === "-1" ||
      tags.layer === "-2";
    const layout = isUnderground ? "underground" : "elevated";

    // Dates & verification
    let openedOn: string | null = null;
    let expectedCompletion: string | null = null;
    let lastVerified: string | null = null; // Stays null for OSM-sourced

    if (assignedStatus === "construction") {
      expectedCompletion = "2026-12";
    } else if (assignedStatus === "planned") {
      expectedCompletion = "2028";
    }

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
      if (override.status) assignedStatus = override.status;
      if (override.opened_on !== undefined) openedOn = override.opened_on;
      if (override.expected_completion !== undefined) expectedCompletion = override.expected_completion;
      if (override.last_verified) lastVerified = override.last_verified;
    }

    stationsWithLines.push({
      st,
      assignedLineIds: Array.from(lineIdsSet),
      assignedPhase,
      assignedStatus,
      layout,
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
        sw.assignedPhase === iseg.segOverride.phase
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

  // 5. Finalize Segments and compute dynamic stations_count
  const segmentFeatures: SegmentFeature[] = [];

  for (const iseg of intermediateSegments) {
    const segOverride = iseg.segOverride;
    const coords = iseg.coords;

    if (!coords || coords.length < 2) {
      console.warn(`⚠️ Segment ${segOverride.segment_id} has no valid coordinates. Skipping.`);
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
    // Deduplicated assigned stations on this line within 200m of this segment
    let stationsCount = 0;
    if (segOverride.stations_count !== undefined) {
      stationsCount = segOverride.stations_count;
    } else {
      const lineStations = stationsWithLines.filter((sw) =>
        sw.assignedLineIds.includes(segOverride.line_id)
      );
      for (const sw of lineStations) {
        const distM = pointToPolylineDistanceM(sw.st.coords, coords);
        if (distM <= 200) {
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

    const truncatedCoords: [number, number][] = coords.map(([lng, lat]) => [
      Number(lng.toFixed(5)),
      Number(lat.toFixed(5)),
    ]);

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
        inaugurated_on: segOverride.status === "operational" ? segOverride.inaugurated_on : null,
        expected_completion:
          segOverride.status === "construction" || segOverride.status === "planned"
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
        layout: sw.layout,
        source: "osm",
        last_verified: sw.lastVerified,
        retrieved_at: retrievedAt,
      },
    });
  }

  return {
    segments: segmentFeatures,
    stations: stationFeatures,
  };
}
