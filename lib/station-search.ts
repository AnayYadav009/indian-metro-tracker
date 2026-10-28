import type { StationProperties } from "@/types/schema";

export interface StationSearchResult {
  station: StationProperties;
  coordinates: [number, number];
  score: number;
  matchType: "exact" | "prefix" | "substring" | "alias" | "other-city";
  matchedAlias?: string;
}

export interface SearchStationsOptions {
  activeCityId?: string | null;
  limit?: number;
}

/**
 * Strips diacritics and converts string to lowercase trimmed representation.
 */
export function normalizeSearchString(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Searches stations matching query, ranked according to M22 Design Brief:
 * 1. Exact name match in active city
 * 2. Prefix match on station name in active city
 * 3. Substring match on station name or alias in active city
 * 4. Exact / Prefix / Substring match in any other city (grouped by score, active city prioritized)
 */
export function searchStations(
  query: string,
  stations: Array<{ properties: StationProperties; geometry: { coordinates: [number, number] | number[] } }>,
  options: SearchStationsOptions = {},
  aliasesByStationName?: Record<string, string[]>
): StationSearchResult[] {
  const normalizedQuery = normalizeSearchString(query);
  if (!normalizedQuery) return [];

  const activeCityId = options.activeCityId || null;
  const limit = options.limit ?? 10;
  const results: StationSearchResult[] = [];

  for (const feature of stations) {
    const props = feature.properties;
    const nameNorm = normalizeSearchString(props.name);
    const coords: [number, number] = [feature.geometry.coordinates[0], feature.geometry.coordinates[1]];
    const isActiveCity = activeCityId !== null && props.city_id === activeCityId;

    let score = 0;
    let matchType: StationSearchResult["matchType"] | null = null;
    let matchedAlias: string | undefined = undefined;

    // Check station name
    if (nameNorm === normalizedQuery) {
      score = isActiveCity ? 100 : 50;
      matchType = isActiveCity ? "exact" : "other-city";
    } else if (nameNorm.startsWith(normalizedQuery)) {
      score = isActiveCity ? 80 : 40;
      matchType = isActiveCity ? "prefix" : "other-city";
    } else if (nameNorm.includes(normalizedQuery)) {
      score = isActiveCity ? 60 : 30;
      matchType = isActiveCity ? "substring" : "other-city";
    } else if (aliasesByStationName) {
      // Check aliases if configured
      const aliases = aliasesByStationName[props.name] || [];
      for (const alias of aliases) {
        const aliasNorm = normalizeSearchString(alias);
        if (aliasNorm === normalizedQuery) {
          score = isActiveCity ? 90 : 45;
          matchType = isActiveCity ? "alias" : "other-city";
          matchedAlias = alias;
          break;
        } else if (aliasNorm.startsWith(normalizedQuery)) {
          score = isActiveCity ? 75 : 35;
          matchType = isActiveCity ? "alias" : "other-city";
          matchedAlias = alias;
          break;
        } else if (aliasNorm.includes(normalizedQuery)) {
          score = isActiveCity ? 55 : 25;
          matchType = isActiveCity ? "alias" : "other-city";
          matchedAlias = alias;
          break;
        }
      }
    }

    if (matchType !== null) {
      results.push({
        station: props,
        coordinates: coords,
        score,
        matchType,
        matchedAlias,
      });
    }
  }

  // Sort descending by score, tie-break alphabetically by station name
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.station.name.localeCompare(b.station.name);
  });

  return results.slice(0, limit);
}
