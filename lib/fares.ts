import type { FareRule, ServiceHours } from "../types/metro";

export interface FareEstimate {
  fare_inr: number;
  band_index: number;
  distance_km: number;
  rule_id: string;
  near_boundary: boolean;
  alternative_fare_inr?: number;
}

export interface RouteLegInput {
  line_id?: string;
  lineId?: string;
  distance_km?: number;
  distanceKm?: number;
}

export interface RouteFareGroupEstimate {
  rule_id: string;
  line_ids: string[];
  distance_km: number;
  fare_inr: number;
  band_index: number;
  near_boundary: boolean;
  alternative_fare_inr?: number;
}

export interface RouteFareEstimate {
  groups: RouteFareGroupEstimate[];
  total_fare_inr: number;
  separate_tickets: boolean;
  any_near_boundary: boolean;
}

export interface FareCalculationOptions {
  boundaryToleranceKm?: number;
}

const DEFAULT_BOUNDARY_TOLERANCE_KM = 0.5;

/**
 * Returns true only if the city has at least one verified FareRule.
 * Otherwise the fare feature must be hidden for that city entirely.
 */
export function hasSourcedFares(cityId: string, rules: FareRule[]): boolean {
  if (!cityId || !Array.isArray(rules)) return false;
  return rules.some(
    (rule) => rule.city_id === cityId && rule.provenance?.status === "verified"
  );
}

/**
 * Looks up the fare rule for a line, returning it only if it is verified.
 */
export function getFareRuleForLine(
  lineId: string,
  rules: FareRule[]
): FareRule | null {
  if (!lineId || !Array.isArray(rules)) return null;
  const rule = rules.find((r) => r.applies_to_line_ids.includes(lineId));
  if (!rule || rule.provenance?.status !== "verified") return null;
  return rule;
}

/**
 * Estimates fare for a given distance using a verified fare rule.
 * Uses [min_km, max_km) band lookup with an open-ended last band.
 * Flag near_boundary is true when distance is within boundary_tolerance_km of a band edge.
 */
export function estimateFare(
  rule: FareRule,
  distanceKm: number,
  options?: FareCalculationOptions
): FareEstimate {
  if (
    typeof distanceKm !== "number" ||
    isNaN(distanceKm) ||
    distanceKm < 0
  ) {
    throw new Error(
      `Invalid distance: ${distanceKm}. Distance must be a non-negative number.`
    );
  }

  const tolerance =
    options?.boundaryToleranceKm ?? DEFAULT_BOUNDARY_TOLERANCE_KM;

  let matchedIndex = -1;
  for (let i = 0; i < rule.bands.length; i++) {
    const band = rule.bands[i];
    if (
      distanceKm >= band.min_km &&
      (band.max_km === null || distanceKm < band.max_km)
    ) {
      matchedIndex = i;
      break;
    }
  }

  if (matchedIndex === -1) {
    throw new Error(
      `Distance ${distanceKm} km does not fall within any fare band for rule '${rule.id}'`
    );
  }

  const matchedBand = rule.bands[matchedIndex];
  const fare_inr = matchedBand.fare_inr;

  // Boundary proximity check:
  // Lower edge: if matchedIndex > 0, distance to matchedBand.min_km
  // Upper edge: if matchedBand.max_km !== null, distance to matchedBand.max_km
  const distToLower =
    matchedIndex > 0 ? distanceKm - matchedBand.min_km : Infinity;
  const distToUpper =
    matchedBand.max_km !== null ? matchedBand.max_km - distanceKm : Infinity;

  let near_boundary = false;
  let alternative_fare_inr: number | undefined = undefined;

  if (distToLower <= tolerance && distToLower <= distToUpper) {
    near_boundary = true;
    alternative_fare_inr = rule.bands[matchedIndex - 1].fare_inr;
  } else if (distToUpper <= tolerance && distToUpper < distToLower) {
    near_boundary = true;
    if (matchedIndex + 1 < rule.bands.length) {
      alternative_fare_inr = rule.bands[matchedIndex + 1].fare_inr;
    }
  }

  return {
    fare_inr,
    band_index: matchedIndex,
    distance_km: distanceKm,
    rule_id: rule.id,
    near_boundary,
    alternative_fare_inr,
  };
}

/**
 * Estimates fare for a multi-leg route.
 * Groups consecutive legs that share a fare rule, sums distances per group,
 * and calculates total fare.
 * If ANY leg lacks a verified fare rule, returns null (hiding fare for the route).
 */
export function estimateRouteFare(
  legs: RouteLegInput[],
  rules: FareRule[],
  options?: FareCalculationOptions
): RouteFareEstimate | null {
  if (!Array.isArray(legs) || legs.length === 0) {
    return null;
  }

  interface IntermediateGroup {
    rule: FareRule;
    line_ids: string[];
    distance_km: number;
  }

  const groups: IntermediateGroup[] = [];

  for (const leg of legs) {
    const lineId = leg.line_id || leg.lineId;
    const distanceKm = leg.distance_km ?? leg.distanceKm;

    if (!lineId || typeof distanceKm !== "number" || isNaN(distanceKm) || distanceKm < 0) {
      throw new Error(
        `Invalid route leg: each leg must specify a valid line_id and a non-negative distance_km`
      );
    }

    const rule = getFareRuleForLine(lineId, rules);
    if (!rule) {
      return null;
    }

    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup.rule.id === rule.id) {
      currentGroup.distance_km += distanceKm;
      if (!currentGroup.line_ids.includes(lineId)) {
        currentGroup.line_ids.push(lineId);
      }
    } else {
      groups.push({
        rule,
        line_ids: [lineId],
        distance_km: distanceKm,
      });
    }
  }

  const groupEstimates: RouteFareGroupEstimate[] = groups.map((g) => {
    const estimate = estimateFare(g.rule, g.distance_km, options);
    return {
      rule_id: g.rule.id,
      line_ids: g.line_ids,
      distance_km: g.distance_km,
      fare_inr: estimate.fare_inr,
      band_index: estimate.band_index,
      near_boundary: estimate.near_boundary,
      alternative_fare_inr: estimate.alternative_fare_inr,
    };
  });

  const total_fare_inr = groupEstimates.reduce((sum, g) => sum + g.fare_inr, 0);
  const any_near_boundary = groupEstimates.some((g) => g.near_boundary);
  const separate_tickets = groupEstimates.length > 1;

  return {
    groups: groupEstimates,
    total_fare_inr,
    separate_tickets,
    any_near_boundary,
  };
}

/**
 * Returns service hours for a terminal station on a line.
 * Filters out unverified records; returns only verified entries.
 */
export function getServiceHours(
  lineId: string,
  stationId: string,
  hours: ServiceHours[]
): ServiceHours[] {
  if (!lineId || !stationId || !Array.isArray(hours)) return [];
  return hours.filter(
    (h) =>
      h.line_id === lineId &&
      h.station_id === stationId &&
      h.provenance?.status === "verified"
  );
}
