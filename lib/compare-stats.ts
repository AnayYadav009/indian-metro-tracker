import citiesJson from "@/data/cities.json";
import linesJson from "@/data/lines.json";
import segmentsGeoJson from "@/data/segments.geojson";
import stationsGeoJson from "@/data/stations.geojson";

import { REFERENCE_MAP, ReferenceFile } from "@/lib/reference-data";
import { getKnownIssueNotice } from "@/lib/known-issue-notices";
import { TIER_1_CITY_IDS } from "@/lib/city-order";
import type { City, Line, SegmentFeatureCollection, StationFeatureCollection } from "@/types/metro";

export interface CityCompareStats {
  cityId: string;
  cityName: string;
  tier: 1 | 2;
  linesCount: number;
  operationalKm: number;
  constructionKm: number;
  plannedKm: number;
  totalKm: number;
  operationalStations: number;
  constructionStations: number;
  plannedStations: number;
  totalStations: number;
  interchangesCount: number;
  firstOpenedYear: number | null;
  completionPercent: number;
  referenceOperationalKm: number | null;
  lengthVariancePercent: number | null;
  hasLengthMismatch: boolean;
  lengthMismatchNote: string | null;
  hasCompletenessCaveat: boolean;
  completenessCaveatText: string | null;
}

export interface NationwideTotals {
  citiesCount: number;
  linesCount: number;
  operationalKm: number;
  constructionKm: number;
  plannedKm: number;
  totalKm: number;
  operationalStations: number;
  constructionStations: number;
  plannedStations: number;
  totalStations: number;
  interchangesCount: number;
  completionPercent: number;
  earliestOpenedYear: number | null;
}

function roundOneDecimal(val: number): number {
  return Math.round(val * 10) / 10;
}

/**
 * Pure calculation function accepting raw dataset collections.
 * Allows deterministic unit testing and guarantees identical numbers to map network-stats.
 */
export function calculateCityCompareStats(
  cities: City[],
  lines: Line[],
  segments: SegmentFeatureCollection,
  stations: StationFeatureCollection,
  referenceFiles: Record<string, ReferenceFile> = REFERENCE_MAP
): CityCompareStats[] {
  return cities.map((city) => {
    const cityLines = lines.filter((l) => l.city_id === city.id);
    const citySegments = segments.features.filter(
      (s) => s.properties.city_id === city.id
    );
    const cityStations = stations.features.filter(
      (s) => s.properties.city_id === city.id
    );

    let opKm = 0;
    let constKm = 0;
    let planKm = 0;
    const years: number[] = [];

    for (const seg of citySegments) {
      const p = seg.properties;
      if (p.status === "operational") {
        opKm += p.length_km;
      } else if (p.status === "construction") {
        constKm += p.length_km;
      } else if (p.status === "planned") {
        planKm += p.length_km;
      }

      if (p.inaugurated_on) {
        const y = parseInt(p.inaugurated_on.slice(0, 4), 10);
        if (!Number.isNaN(y)) years.push(y);
      }
    }

    opKm = roundOneDecimal(opKm);
    constKm = roundOneDecimal(constKm);
    planKm = roundOneDecimal(planKm);
    const totalKm = roundOneDecimal(opKm + constKm + planKm);

    let opStations = 0;
    let constStations = 0;
    let planStations = 0;
    let interchangesCount = 0;

    for (const st of cityStations) {
      const p = st.properties;
      if (p.status === "operational") {
        opStations++;
      } else if (p.status === "construction") {
        constStations++;
      } else if (p.status === "planned") {
        planStations++;
      }

      if (p.is_interchange || p.interchange_id !== undefined) {
        interchangesCount++;
      }

      if (p.opened_on) {
        const y = parseInt(p.opened_on.slice(0, 4), 10);
        if (!Number.isNaN(y)) years.push(y);
      }
    }

    const firstOpenedYear = years.length > 0 ? Math.min(...years) : null;
    const completionPercent =
      totalKm > 0 ? roundOneDecimal((opKm / totalKm) * 100) : 0;

    // Reference length check
    let referenceOperationalKm: number | null = null;
    const refFile = referenceFiles[city.id];
    if (refFile && Array.isArray(refFile.lines)) {
      let refSum = 0;
      for (const line of refFile.lines) {
        const km = line.operational_length_km ?? line.official_length_km ?? 0;
        refSum += km;
      }
      if (refSum > 0) {
        referenceOperationalKm = roundOneDecimal(refSum);
      }
    }

    let lengthVariancePercent: number | null = null;
    let hasLengthMismatch = false;
    let lengthMismatchNote: string | null = null;

    if (referenceOperationalKm !== null && referenceOperationalKm > 0) {
      lengthVariancePercent = roundOneDecimal(
        (Math.abs(opKm - referenceOperationalKm) / referenceOperationalKm) * 100
      );
      if (lengthVariancePercent > 3.0) {
        hasLengthMismatch = true;
        lengthMismatchNote = `Computed operational length (${opKm} km) differs from official reference (${referenceOperationalKm} km) by ${lengthVariancePercent}%.`;
      }
    }

    // Completeness caveats from known issue notices
    const cityLineIds = cityLines.map((l) => l.id);
    const completenessCaveatText = getKnownIssueNotice(cityLineIds);
    const hasCompletenessCaveat = completenessCaveatText !== null;

    return {
      cityId: city.id,
      cityName: city.name,
      tier: TIER_1_CITY_IDS.has(city.id) ? 1 : 2,
      linesCount: cityLines.length,
      operationalKm: opKm,
      constructionKm: constKm,
      plannedKm: planKm,
      totalKm,
      operationalStations: opStations,
      constructionStations: constStations,
      plannedStations: planStations,
      totalStations: cityStations.length,
      interchangesCount,
      firstOpenedYear,
      completionPercent,
      referenceOperationalKm,
      lengthVariancePercent,
      hasLengthMismatch,
      lengthMismatchNote,
      hasCompletenessCaveat,
      completenessCaveatText,
    };
  });
}

/**
 * Calculates national summary aggregates across all city stats.
 */
export function calculateNationwideTotals(
  cityStats: CityCompareStats[]
): NationwideTotals {
  let operationalKm = 0;
  let constructionKm = 0;
  let plannedKm = 0;
  let linesCount = 0;
  let operationalStations = 0;
  let constructionStations = 0;
  let plannedStations = 0;
  let interchangesCount = 0;
  const years: number[] = [];

  for (const c of cityStats) {
    operationalKm += c.operationalKm;
    constructionKm += c.constructionKm;
    plannedKm += c.plannedKm;
    linesCount += c.linesCount;
    operationalStations += c.operationalStations;
    constructionStations += c.constructionStations;
    plannedStations += c.plannedStations;
    interchangesCount += c.interchangesCount;
    if (c.firstOpenedYear !== null) years.push(c.firstOpenedYear);
  }

  operationalKm = roundOneDecimal(operationalKm);
  constructionKm = roundOneDecimal(constructionKm);
  plannedKm = roundOneDecimal(plannedKm);
  const totalKm = roundOneDecimal(operationalKm + constructionKm + plannedKm);
  const totalStations =
    operationalStations + constructionStations + plannedStations;
  const completionPercent =
    totalKm > 0 ? roundOneDecimal((operationalKm / totalKm) * 100) : 0;
  const earliestOpenedYear = years.length > 0 ? Math.min(...years) : null;

  return {
    citiesCount: cityStats.length,
    linesCount,
    operationalKm,
    constructionKm,
    plannedKm,
    totalKm,
    operationalStations,
    constructionStations,
    plannedStations,
    totalStations,
    interchangesCount,
    completionPercent,
    earliestOpenedYear,
  };
}

let cachedCityStats: CityCompareStats[] | null = null;
let cachedTotals: NationwideTotals | null = null;

export function getCityCompareStats(): CityCompareStats[] {
  if (!cachedCityStats) {
    cachedCityStats = calculateCityCompareStats(
      citiesJson as City[],
      linesJson as Line[],
      segmentsGeoJson as unknown as SegmentFeatureCollection,
      stationsGeoJson as unknown as StationFeatureCollection
    );
  }
  return cachedCityStats;
}

export function getNationwideTotals(): NationwideTotals {
  if (!cachedTotals) {
    cachedTotals = calculateNationwideTotals(getCityCompareStats());
  }
  return cachedTotals;
}
