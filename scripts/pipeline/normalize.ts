import fs from "node:fs";
import path from "node:path";
import { calculateLineStringLengthKm } from "../../lib/geo";

export interface NormalizedStation {
  osmId: number;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  tags: Record<string, string>;
  lineRefs: string[];
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

  // 1. Extract stations
  const stationNodes = elements.filter(
    (e) =>
      e.type === "node" &&
      e.tags &&
      e.tags.name &&
      (e.tags.railway === "station" || e.tags.station === "subway" || e.tags.subway === "yes")
  );

  const stationsMap = new Map<number, NormalizedStation>();
  for (const node of stationNodes) {
    const rawName = node.tags.name || node.tags["name:en"] || `Station ${node.id}`;
    // Clean name (e.g., strip " Metro Station")
    const cleanName = rawName
      .replace(/\s+metro\s+station/i, "")
      .replace(/\s+station/i, "")
      .trim();

    stationsMap.set(node.id, {
      osmId: node.id,
      name: cleanName,
      coordinates: [
        Number(Number(node.lon).toFixed(6)),
        Number(Number(node.lat).toFixed(6)),
      ],
      tags: node.tags,
      lineRefs: [],
    });
  }

  // 2. Extract route relations
  const routeRelations = elements.filter(
    (e) => e.type === "relation" && e.tags && (e.tags.route === "subway" || e.tags.route === "light_rail")
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

  return {
    cityId,
    cityName: cityId.charAt(0).toUpperCase() + cityId.slice(1),
    segments,
    stations: Array.from(stationsMap.values()),
  };
}
