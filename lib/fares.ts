import type { FareDayScope, FareRule, ServiceHours } from "../types/metro";

export interface FareEstimate {
  fare_inr: number;
  band_index: number;
  distance_km?: number;
  station_count?: number;
  rule_id: string;
  near_boundary: boolean;
  alternative_fare_inr?: number;
  day_scope: FareDayScope;
}

export interface FareInputMeasures {
  distance_km?: number;
  stop_count?: number;
}

export interface RouteLegInput {
  line_id?: string;
  lineId?: string;
  distance_km?: number;
  distanceKm?: number;
  stop_count?: number;
  stopCount?: number;
}

export interface RouteFareGroupEstimate {
  rule_id: string;
  line_ids: string[];
  distance_km?: number;
  station_count?: number;
  fare_inr: number;
  band_index: number;
  near_boundary: boolean;
  alternative_fare_inr?: number;
  day_scope: FareDayScope;
}

export interface RouteFareEstimate {
  groups: RouteFareGroupEstimate[];
  total_fare_inr: number;
  separate_tickets: boolean;
  any_near_boundary: boolean;
  day_scope: FareDayScope;
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
 * Estimates fare for a journey measure using a verified fare rule.
 * - If rule.distance_basis === "computed_route_km":
 *     requires measure.distance_km (or a single number for backward compatibility).
 *     Uses half-open [min_km, max_km) band lookup with an open-ended last band.
 * - If rule.distance_basis === "station_count":
 *     requires measure.stop_count (non-negative integer).
 *     If 0 stations (entry and exit at same station): returns same_station_fare_inr ?? bands[0].fare_inr.
 *     Otherwise matches inclusive [min_stations, max_stations] integer bands.
 */
export function estimateFare(
  rule: FareRule,
  measure: number | FareInputMeasures,
  options?: FareCalculationOptions
): FareEstimate {
  if (rule.distance_basis === "computed_route_km") {
    const distanceKm =
      typeof measure === "number" ? measure : measure?.distance_km;

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
      day_scope: rule.day_scope,
    };
  } else if (rule.distance_basis === "station_count") {
    const stopCount =
      typeof measure === "number" ? measure : measure?.stop_count;

    if (
      typeof stopCount !== "number" ||
      isNaN(stopCount) ||
      !Number.isInteger(stopCount) ||
      stopCount < 0
    ) {
      throw new Error(
        `Fare rule '${rule.id}' requires an integer stop_count >= 0. Received: ${stopCount}.`
      );
    }

    // Special case: entry and exit at same station (0 stops)
    if (stopCount === 0) {
      const fare_inr =
        rule.same_station_fare_inr !== undefined
          ? rule.same_station_fare_inr
          : rule.bands[0].fare_inr;
      return {
        fare_inr,
        band_index: 0,
        station_count: 0,
        rule_id: rule.id,
        near_boundary: false,
        day_scope: rule.day_scope,
      };
    }

    let matchedIndex = -1;
    for (let i = 0; i < rule.bands.length; i++) {
      const band = rule.bands[i];
      if (
        stopCount >= band.min_stations &&
        (band.max_stations === null || stopCount <= band.max_stations)
      ) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      throw new Error(
        `Station count ${stopCount} does not fall within any fare band for rule '${rule.id}'`
      );
    }

    const matchedBand = rule.bands[matchedIndex];
    return {
      fare_inr: matchedBand.fare_inr,
      band_index: matchedIndex,
      station_count: stopCount,
      rule_id: rule.id,
      near_boundary: false,
      day_scope: rule.day_scope,
    };
  } else {
    throw new Error(
      `Unsupported distance_basis: ${(rule as any).distance_basis}`
    );
  }
}

/**
 * Estimates fare for a multi-leg route.
 * Groups consecutive legs that share a fare rule, sums distances/stops per group,
 * and calculates total fare.
 * If ANY leg lacks a verified fare rule or required measure, returns null.
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
    distance_km?: number;
    stop_count?: number;
  }

  const groups: IntermediateGroup[] = [];

  for (const leg of legs) {
    const lineId = leg.line_id || leg.lineId;
    const distanceKm = leg.distance_km ?? leg.distanceKm;
    const stopCount = leg.stop_count ?? leg.stopCount;

    if (!lineId) {
      throw new Error(`Invalid route leg: each leg must specify a valid line_id`);
    }

    const rule = getFareRuleForLine(lineId, rules);
    if (!rule) {
      return null;
    }

    if (rule.distance_basis === "computed_route_km") {
      if (typeof distanceKm !== "number" || isNaN(distanceKm) || distanceKm < 0) {
        throw new Error(
          `Invalid route leg: leg for rule '${rule.id}' requires a non-negative distance_km`
        );
      }
    } else if (rule.distance_basis === "station_count") {
      if (typeof stopCount !== "number" || isNaN(stopCount) || !Number.isInteger(stopCount) || stopCount < 0) {
        throw new Error(
          `Invalid route leg: leg for rule '${rule.id}' requires a non-negative integer stop_count`
        );
      }
    }

    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup.rule.id === rule.id) {
      if (rule.distance_basis === "computed_route_km") {
        currentGroup.distance_km = (currentGroup.distance_km ?? 0) + (distanceKm ?? 0);
      } else {
        currentGroup.stop_count = (currentGroup.stop_count ?? 0) + (stopCount ?? 0);
      }
      if (!currentGroup.line_ids.includes(lineId)) {
        currentGroup.line_ids.push(lineId);
      }
    } else {
      groups.push({
        rule,
        line_ids: [lineId],
        distance_km: rule.distance_basis === "computed_route_km" ? distanceKm : undefined,
        stop_count: rule.distance_basis === "station_count" ? stopCount : undefined,
      });
    }
  }

  const groupEstimates: RouteFareGroupEstimate[] = groups.map((g) => {
    const measure: FareInputMeasures =
      g.rule.distance_basis === "computed_route_km"
        ? { distance_km: g.distance_km }
        : { stop_count: g.stop_count };
    const estimate = estimateFare(g.rule, measure, options);
    return {
      rule_id: g.rule.id,
      line_ids: g.line_ids,
      distance_km: estimate.distance_km,
      station_count: estimate.station_count,
      fare_inr: estimate.fare_inr,
      band_index: estimate.band_index,
      near_boundary: estimate.near_boundary,
      alternative_fare_inr: estimate.alternative_fare_inr,
      day_scope: g.rule.day_scope,
    };
  });

  const total_fare_inr = groupEstimates.reduce((sum, g) => sum + g.fare_inr, 0);
  const any_near_boundary = groupEstimates.some((g) => g.near_boundary);
  const separate_tickets = groupEstimates.length > 1;
  const day_scope: FareDayScope = groupEstimates[0]?.day_scope ?? "all";

  return {
    groups: groupEstimates,
    total_fare_inr,
    separate_tickets,
    any_near_boundary,
    day_scope,
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
