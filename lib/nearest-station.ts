import { haversineDistanceKm } from "@/lib/geo";
import { getMetroData } from "@/lib/data";
import { getKnownIssueNotice } from "@/lib/known-issue-notices";
import type { Status, StationFeature, Line, City } from "@/types/metro";

export const MAX_DISTANCE_THRESHOLD_KM = 50.0;
export const DEFAULT_NEAREST_LIMIT = 5;

export interface NearestStationResult {
  station: StationFeature;
  distanceKm: number;
  formattedDistance: string;
  lines: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  status: Status;
  isInterchange: boolean;
  isNotYetOpen: boolean;
  cityName: string;
  cityId: string;
  caveatNotice?: string;
}

export type NearestStationOutcome =
  | {
      status: "success";
      userLocation: [number, number];
      stations: NearestStationResult[];
      nearestDistanceKm: number;
    }
  | {
      status: "too_far";
      userLocation: [number, number];
      nearestDistanceKm: number;
      nearestCityName?: string;
      message: string;
    }
  | {
      status: "no_operational_network";
      userLocation: [number, number];
      cityName: string;
      message: string;
    };

export interface FindNearestStationsOptions {
  includeConstruction?: boolean;
  limit?: number;
  maxDistanceKm?: number;
}

/**
 * Finds the nearest stations to a given [lng, lat] coordinate.
 * Client-side only. Does not log or store coordinates.
 */
export function findNearestStations(
  coords: [number, number],
  options: FindNearestStationsOptions = {}
): NearestStationOutcome {
  const {
    includeConstruction = false,
    limit = DEFAULT_NEAREST_LIMIT,
    maxDistanceKm = MAX_DISTANCE_THRESHOLD_KM,
  } = options;

  const dataset = getMetroData();
  const lineMap = new Map<string, Line>();
  for (const line of dataset.lines) {
    lineMap.set(line.id, line);
  }

  const cityMap = new Map<string, City>();
  for (const city of dataset.cities) {
    cityMap.set(city.id, city);
  }

  // Filter candidate stations by status
  const candidateStations = dataset.stations.features.filter((st) => {
    if (st.properties.status === "operational") return true;
    if (includeConstruction && st.properties.status === "construction") return true;
    return false;
  });

  if (candidateStations.length === 0) {
    return {
      status: "too_far",
      userLocation: coords,
      nearestDistanceKm: Infinity,
      message: "No eligible metro stations found.",
    };
  }

  // Calculate distance for all candidates
  const scored = candidateStations.map((station) => {
    const dist = haversineDistanceKm(coords, station.geometry.coordinates as [number, number]);
    return { station, distanceKm: dist };
  });

  scored.sort((a, b) => a.distanceKm - b.distanceKm);

  const nearest = scored[0];

  // Check if user is located within a city that has no operational metro network
  // (e.g. Surat is under construction and has 0 operational stations)
  if (!includeConstruction) {
    for (const city of dataset.cities) {
      const [minLng, minLat, maxLng, maxLat] = city.bbox;
      if (
        coords[0] >= minLng - 0.05 &&
        coords[0] <= maxLng + 0.05 &&
        coords[1] >= minLat - 0.05 &&
        coords[1] <= maxLat + 0.05
      ) {
        const hasOperational = dataset.stations.features.some(
          (st) => st.properties.city_id === city.id && st.properties.status === "operational"
        );
        if (!hasOperational) {
          return {
            status: "no_operational_network",
            userLocation: coords,
            cityName: city.name,
            message: `${city.name} metro is currently under construction and has no operational stations yet.`,
          };
        }
      }
    }
  }

  // Check if nearest station exceeds distance threshold (e.g. 50 km)
  if (nearest.distanceKm > maxDistanceKm) {
    const cityName = cityMap.get(nearest.station.properties.city_id)?.name;
    const roundedDist = Math.round(nearest.distanceKm);
    return {
      status: "too_far",
      userLocation: coords,
      nearestDistanceKm: nearest.distanceKm,
      nearestCityName: cityName,
      message: `Metro service is out of range (> ${maxDistanceKm} km). You are approximately ${roundedDist} km away from the nearest metro station (${nearest.station.properties.name}${cityName ? ` in ${cityName}` : ""}).`,
    };
  }

  // Format top N results
  const topResults = scored.slice(0, limit);
  const formattedResults: NearestStationResult[] = topResults.map(({ station, distanceKm }) => {
    const lines = station.properties.line_ids
      .map((id) => lineMap.get(id))
      .filter((l): l is Line => !!l)
      .map((l) => ({ id: l.id, name: l.name, color: l.color }));

    const isNotYetOpen = station.properties.status !== "operational";
    const cityName = cityMap.get(station.properties.city_id)?.name ?? station.properties.city_id;
    const caveat = getKnownIssueNotice(station.properties.line_ids);

    const formattedDistance =
      distanceKm < 1.0
        ? `${Math.round(distanceKm * 1000)} m straight-line`
        : `${distanceKm.toFixed(1)} km straight-line`;

    return {
      station,
      distanceKm,
      formattedDistance,
      lines,
      status: station.properties.status,
      isInterchange: station.properties.is_interchange,
      isNotYetOpen,
      cityName,
      cityId: station.properties.city_id,
      caveatNotice: caveat ?? undefined,
    };
  });

  return {
    status: "success",
    userLocation: coords,
    stations: formattedResults,
    nearestDistanceKm: nearest.distanceKm,
  };
}
