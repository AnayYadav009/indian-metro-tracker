import { calculateLineStringLengthKm } from "../../lib/geo";
import { appendCoordinates, roundCoordinates } from "../lib/geometry";
import { cleanStationName } from "../lib/station-name";

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
  filteredInactiveWays?: Array<{ relationId: number; wayId: number }>;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Tests whether an OSM element represents a metro station node.
 */
export function isStationNode(e: { type: string; tags?: Record<string, string> }): boolean {
  if (e.type !== "node" || !e.tags || !e.tags.name) return false;
  const tags = e.tags;
  return (
    tags.railway === "station" ||
    tags.station === "subway" ||
    tags.subway === "yes" ||
    tags.station === "light_rail" ||
    tags.light_rail === "yes" ||
    tags["construction:railway"] === "station" ||
    tags["construction:station"] === "subway" ||
    (tags.railway === "construction" && (tags.construction === "station" || tags.subway === "yes"))
  );
}

/**
 * Normalizes raw Overpass response elements into structured transit segments and stations.
 */
export interface RouteWayOrder {
  id: number;
  reversed?: boolean;
}

export function normalizeOverpassCity(
  cityId: string,
  rawData: any,
  routeWayOrders: Record<number, RouteWayOrder[]> = {}
): NormalizedCityData {
  const elements: any[] = rawData.elements || [];

  // 1. Extract stations (subway, light rail, and under-construction stations)
  const stationNodes = elements.filter(isStationNode);

  const stationsMap = new Map<number, NormalizedStation>();
  for (const node of stationNodes) {
    const rawName = node.tags["name:en"] || node.tags.name || `Station ${node.id}`;
    const cleanName = cleanStationName(rawName);

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
  const filteredInactiveWays = routeRelations.flatMap((rel) =>
    Array.isArray(rel.members)
      ? rel.members
          .filter((member: any) => member.type === "way" && member.role === "inactive")
          .map((member: any) => ({ relationId: rel.id, wayId: member.ref }))
      : []
  );

  for (const rel of routeRelations) {
    const relName = rel.tags.name || `Relation ${rel.id}`;
    const relRef = rel.tags.ref || "";
    const relColour = rel.tags.colour || rel.tags.color;
    const network = rel.tags.network || "";
    const operator = rel.tags.operator || "";

    // Assemble LineString coordinates from way members
    const relationMembers: any[] = Array.isArray(rel.members) ? rel.members : [];
    const stationOsmIds: number[] = [];
    const orderedWays = routeWayOrders[rel.id];
    const members = orderedWays
      ? [
          ...relationMembers.filter((member) => member.type === "node"),
          ...orderedWays.flatMap((way) => {
            const member = relationMembers.find((candidate) => candidate.type === "way" && candidate.ref === way.id);
            return member ? [{ ...member, reverseGeometry: way.reversed }] : [];
          }),
        ]
      : relationMembers;

    const relationId = rel.id.toString();
    members
      .filter((member) => member.type === "node" && stationsMap.has(member.ref))
      .forEach((member) => {
        stationOsmIds.push(member.ref);
        if (["stop", "platform", "station", undefined, ""].includes(member.role)) {
          const station = stationsMap.get(member.ref)!;
          if (!station.lineRefs.includes(relationId)) station.lineRefs.push(relationId);
        }
      });

    const coords = members.reduce<[number, number][]>((coordinates, member) => {
      if (
        member.type !== "way" ||
        !Array.isArray(member.geometry) ||
        !member.geometry.length ||
        (member.role && member.role !== "route")
      ) return coordinates;

      let wayCoords = roundCoordinates(
        member.geometry.map((pt: any) => [Number(pt.lon), Number(pt.lat)] as [number, number]),
        6
      );
      if (member.reverseGeometry) wayCoords.reverse();
      if (coordinates.length) {
        const last = coordinates[coordinates.length - 1];
        const first = wayCoords[0];
        const lastOfWay = wayCoords[wayCoords.length - 1];
        if (
          Math.hypot(last[0] - lastOfWay[0], last[1] - lastOfWay[1]) <
          Math.hypot(last[0] - first[0], last[1] - first[1])
        ) wayCoords.reverse();
      }
      return appendCoordinates(coordinates, wayCoords);
    }, []);

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

  segments.push(...constructionWays.map((way) => {
    const { tags, geometry, id } = way;
    const coordinates = roundCoordinates(geometry.map((pt: any) => [Number(pt.lon), Number(pt.lat)] as [number, number]), 6);
    return {
      osmId: id, name: tags.name || tags["name:en"] || `Way ${id}`, ref: tags.ref || "",
      colour: tags.colour || tags.color, network: tags.network || "", operator: tags.operator || "",
      coordinates, lengthKm: calculateLineStringLengthKm(coordinates),
      status: tags.railway === "construction" ? "construction" as const : "planned" as const,
      tags, stationOsmIds: [],
    };
  }));

  return {
    cityId,
    cityName: cityId.charAt(0).toUpperCase() + cityId.slice(1),
    segments,
    stations: Array.from(stationsMap.values()),
    filteredInactiveWays,
  };
}
