import fs from "node:fs";
import path from "node:path";
import { calculateLineStringLengthKm } from "../../lib/geo";

export interface NormalizedStation {
  osmId: number;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  tags: Record<string, string>;
  lineRefs: string[];
  status?: "operational" | "construction" | "planned";
}

export interface NormalizedSegment {
  osmId: number;
  name: string;
  ref?: string;
  colour?: string;
  network?: string;
  operator?: string;
  coordinates: [number, number][]; // LineString coords
  lengthKm: number;
  status: "operational" | "construction" | "planned";
  tags: Record<string, string>;
  stationOsmIds: number[];
}

export interface NormalizedCityData {
  cityId: string;
  cityName: string;
  segments: NormalizedSegment[];
  stations: NormalizedStation[];
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalizes raw Overpass response elements into structured transit segments and stations.
 */
export function normalizeOverpassCity(cityId: string, rawData: any): NormalizedCityData {
  const elements: any[] = rawData.elements || [];

  // 1. Extract stations (subway, light rail, and under-construction stations)
  const stationNodes = elements.filter(
    (e) =>
      e.type === "node" &&
      e.tags &&
      e.tags.name &&
      (e.tags.railway === "station" ||
        e.tags.station === "subway" ||
        e.tags.subway === "yes" ||
        e.tags.station === "light_rail" ||
        e.tags.light_rail === "yes" ||
        (e.tags.railway === "construction" && (e.tags.construction === "station" || e.tags.subway === "yes")))
  );

  const stationsMap = new Map<number, NormalizedStation>();
  for (const node of stationNodes) {
    const rawName = node.tags.name || node.tags["name:en"] || `Station ${node.id}`;
    // Clean name (e.g., strip line qualifiers "(Blue Line)", " Metro Station", etc.)
    const cleanName = rawName
      .replace(/\s*\([^)]*(line|corridor|branch)[^)]*\)/gi, "")
      .replace(/\s+metro\s+station/i, "")
      .replace(/\s+station/i, "")
      .trim();

    let stationStatus: "operational" | "construction" | "planned" = "operational";
    if (node.tags.railway === "construction" || node.tags.construction === "station") {
      stationStatus = "construction";
    } else if (node.tags.railway === "proposed" || node.tags.proposed === "station") {
      stationStatus = "planned";
    }

    stationsMap.set(node.id, {
      osmId: node.id,
      name: cleanName,
      coordinates: [
        Number(Number(node.lon).toFixed(6)),
        Number(Number(node.lat).toFixed(6)),
      ],
      tags: node.tags,
      lineRefs: [],
      status: stationStatus,
    });
  }

  // 2. Extract route relations
  const routeRelations = elements.filter(
    (e) =>
      e.type === "relation" &&
      e.tags &&
      (e.tags.route === "subway" ||
        e.tags.route === "light_rail" ||
        e.tags.railway === "subway" ||
        e.tags.railway === "construction" ||
        e.tags.railway === "proposed")
  );

  const segments: NormalizedSegment[] = [];

  for (const rel of routeRelations) {
    const relName = rel.tags.name || `Relation ${rel.id}`;
    const relRef = rel.tags.ref || "";
    const relColour = rel.tags.colour || rel.tags.color;
    const network = rel.tags.network || "";
    const operator = rel.tags.operator || "";

    // Assemble LineString coordinates from way members
    const coords: [number, number][] = [];
    const stationOsmIds: number[] = [];

    if (rel.members && Array.isArray(rel.members)) {
      for (const m of rel.members) {
        if (m.type === "node" && stationsMap.has(m.ref)) {
          stationOsmIds.push(m.ref);
          if (m.role === "stop" || m.role === "platform" || m.role === "station" || !m.role) {
            const st = stationsMap.get(m.ref)!;
            if (!st.lineRefs.includes(rel.id.toString())) {
              st.lineRefs.push(rel.id.toString());
            }
          }
        } else if (m.type === "way" && m.geometry && Array.isArray(m.geometry) && m.geometry.length > 0) {
          const wayCoords: [number, number][] = m.geometry.map((pt: any) => [
            Number(Number(pt.lon).toFixed(6)),
            Number(Number(pt.lat).toFixed(6)),
          ]);

          if (coords.length === 0) {
            coords.push(...wayCoords);
          } else {
            const last = coords[coords.length - 1];
            const first = wayCoords[0];
            const lastOfWay = wayCoords[wayCoords.length - 1];

            const distDirect = Math.hypot(last[0] - first[0], last[1] - first[1]);
            const distReverse = Math.hypot(last[0] - lastOfWay[0], last[1] - lastOfWay[1]);

            if (distReverse < distDirect) {
              wayCoords.reverse();
            }
            // Append avoiding duplicate points
            for (let i = 0; i < wayCoords.length; i++) {
              const pt = wayCoords[i];
              const prev = coords[coords.length - 1];
              if (prev[0] !== pt[0] || prev[1] !== pt[1]) {
                coords.push(pt);
              }
            }
          }
        }
      }
    }

    if (coords.length >= 2) {
      // Determine default status from tags or name
      let status: "operational" | "construction" | "planned" = "operational";
      const lowerName = relName.toLowerCase();
      if (
        rel.tags.construction ||
        rel.tags.railway === "construction" ||
        lowerName.includes("under construction") ||
        lowerName.includes("construction")
      ) {
        status = "construction";
      } else if (rel.tags.proposed || lowerName.includes("planned") || lowerName.includes("proposed")) {
        status = "planned";
      }

      const lengthKm = calculateLineStringLengthKm(coords);

      segments.push({
        osmId: rel.id,
        name: relName,
        ref: relRef,
        colour: relColour,
        network,
        operator,
        coordinates: coords,
        lengthKm,
        status,
        tags: rel.tags,
        stationOsmIds,
      });
    }
  }

  // 3. Extract standalone under-construction and proposed ways
  const constructionWays = elements.filter(
    (e) =>
      e.type === "way" &&
      e.tags &&
      (e.tags.railway === "construction" || e.tags.railway === "proposed") &&
      e.geometry &&
      Array.isArray(e.geometry) &&
      e.geometry.length >= 2
  );

  for (const way of constructionWays) {
    const wayName = way.tags.name || way.tags["name:en"] || `Way ${way.id}`;
    const wayRef = way.tags.ref || "";
    const wayColour = way.tags.colour || way.tags.color;
    const network = way.tags.network || "";
    const operator = way.tags.operator || "";

    const coords: [number, number][] = way.geometry.map((pt: any) => [
      Number(Number(pt.lon).toFixed(6)),
      Number(Number(pt.lat).toFixed(6)),
    ]);

    const status: "operational" | "construction" | "planned" =
      way.tags.railway === "construction" ? "construction" : "planned";
    const lengthKm = calculateLineStringLengthKm(coords);

    segments.push({
      osmId: way.id,
      name: wayName,
      ref: wayRef,
      colour: wayColour,
      network,
      operator,
      coordinates: coords,
      lengthKm,
      status,
      tags: way.tags,
      stationOsmIds: [],
    });
  }

  return {
    cityId,
    cityName: cityId.charAt(0).toUpperCase() + cityId.slice(1),
    segments,
    stations: Array.from(stationsMap.values()),
  };
}
