import citiesJson from "@/data/cities.json";
import linesJson from "@/data/lines.json";
import segmentsGeoJson from "@/data/segments.geojson";
import stationsGeoJson from "@/data/stations.geojson";
import { getCityCompareStats, CityCompareStats } from "@/lib/compare-stats";
import type { City, Line, SegmentFeatureCollection, StationFeatureCollection } from "@/types/metro";

import { REFERENCE_MAP } from "@/lib/reference-data";

export interface CityPageLine {
  id: string;
  name: string;
  officialName: string;
  color: string;
  operator: string;
  status: "operational" | "construction" | "planned";
  terminals: string[];
  topology?: string;
  lengthKm: number;
  stationsCount: number;
  stationNames: string[];
}

export interface CityPageData {
  city: City;
  stats: CityCompareStats;
  lines: CityPageLine[];
  openingYearRange: string | null;
  earliestOpenedYear: number | null;
  latestOpenedYear: number | null;
  hasAtLeast80PercentOpened: boolean;
  openedStationsCount: number;
  totalStationsCount: number;
  isUnderConstructionOnly: boolean;
}

const stationsCollection = stationsGeoJson as unknown as StationFeatureCollection;
const segmentsCollection = segmentsGeoJson as unknown as SegmentFeatureCollection;

export function getAllCities(): City[] {
  return citiesJson as City[];
}

export function getCityPageData(cityId: string): CityPageData | null {
  const city = (citiesJson as City[]).find((c) => c.id === cityId);
  if (!city) return null;

  const allStats = getCityCompareStats();
  const stats = allStats.find((s) => s.cityId === cityId);
  if (!stats) return null;

  const cityLines = (linesJson as Line[]).filter((l) => l.city_id === cityId);
  const ref = REFERENCE_MAP[cityId];
  const refLineMap = new Map((ref?.lines ?? []).map((l) => [l.line_id, l]));

  // Calculate per-line metrics from GeoJSON
  const lines: CityPageLine[] = cityLines.map((line) => {
    const refLine = refLineMap.get(line.id);
    const lineSegs = segmentsCollection.features.filter(
      (s) => s.properties.line_id === line.id
    );
    const lengthKm =
      Math.round(
        lineSegs.reduce((acc, s) => acc + (s.properties.length_km ?? 0), 0) * 10
      ) / 10;

    const stationsCount = stationsCollection.features.filter((st) =>
      (st.properties.line_ids ?? []).includes(line.id)
    ).length;
    const orderedStations = stationsCollection.features.filter((st) =>
      (st.properties.line_ids ?? []).includes(line.id)
    );
    const backbone = lineSegs.reduce((longest, segment) =>
      segment.geometry.coordinates.length > (longest?.geometry.coordinates.length ?? 0) ? segment : longest, lineSegs[0]);
    const stationNames = line.ordered_station_ids?.length
      ? line.ordered_station_ids.map((id) => orderedStations.find((st) => st.properties.station_id === id)?.properties.name).filter((name): name is string => !!name)
      : backbone
        ? orderedStations.map((station) => {
            const [lng, lat] = station.geometry.coordinates;
            let distance = Infinity;
            let position = 0;
            let travelled = 0;
            const coordinates = backbone.geometry.coordinates;
            for (let i = 1; i < coordinates.length; i++) {
              const [ax, ay] = coordinates[i - 1];
              const [bx, by] = coordinates[i];
              const dx = bx - ax;
              const dy = by - ay;
              const length = Math.hypot(dx, dy);
              const t = Math.max(0, Math.min(1, ((lng - ax) * dx + (lat - ay) * dy) / (length * length)));
              const d = Math.hypot(lng - (ax + t * dx), lat - (ay + t * dy));
              if (d < distance) {
                distance = d;
                position = travelled + t * length;
              }
              travelled += length;
            }
            return { name: station.properties.name, position };
          }).sort((a, b) => a.position - b.position).map(({ name }) => name)
        : orderedStations.map((station) => station.properties.name);

    // Line status priority: operational if any segment is op, else construction, else planned
    let status: "operational" | "construction" | "planned" = "planned";
    if (lineSegs.some((s) => s.properties.status === "operational")) {
      status = "operational";
    } else if (lineSegs.some((s) => s.properties.status === "construction")) {
      status = "construction";
    } else if (refLine?.status === "operational") {
      status = "operational";
    } else if (refLine?.status === "construction") {
      status = "construction";
    }

    return {
      id: line.id,
      name: line.name,
      officialName: refLine?.official_name ?? line.name,
      color: line.color,
      operator: line.operator || refLine?.operator || "Metro Authority",
      status,
      terminals: refLine?.terminals ?? [],
      topology: refLine?.topology,
      lengthKm,
      stationsCount,
      stationNames,
    };
  });

  // Calculate opening year range from stations with opened_on
  const cityStations = stationsCollection.features.filter(
    (st) => st.properties.city_id === cityId
  );
  const openedYears = cityStations
    .map((st) => {
      const d = st.properties.opened_on;
      if (!d) return null;
      const y = parseInt(d.slice(0, 4), 10);
      return Number.isNaN(y) ? null : y;
    })
    .filter((y): y is number => y !== null);

  const earliestOpenedYear = openedYears.length ? Math.min(...openedYears) : null;
  const latestOpenedYear = openedYears.length ? Math.max(...openedYears) : null;

  const totalStationsCount = cityStations.length;
  const openedStationsCount = openedYears.length;
  const hasAtLeast80PercentOpened =
    totalStationsCount > 0 && openedStationsCount / totalStationsCount >= 0.8;

  let openingYearRange: string | null = null;
  if (hasAtLeast80PercentOpened && earliestOpenedYear !== null && latestOpenedYear !== null) {
    openingYearRange =
      earliestOpenedYear === latestOpenedYear
        ? `${earliestOpenedYear}`
        : `${earliestOpenedYear} – ${latestOpenedYear}`;
  } else if (openedStationsCount > 0) {
    openingYearRange = `Opening dates recorded for ${openedStationsCount} of ${totalStationsCount} stations`;
  }

  const isUnderConstructionOnly =
    stats.operationalStations === 0 && stats.operationalKm === 0;

  return {
    city,
    stats,
    lines,
    openingYearRange,
    earliestOpenedYear,
    latestOpenedYear,
    hasAtLeast80PercentOpened,
    openedStationsCount,
    totalStationsCount,
    isUnderConstructionOnly,
  };
}
