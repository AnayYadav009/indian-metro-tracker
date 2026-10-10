import type { SegmentProperties, Status, City } from "@/types/schema";

export interface FilterCriteria {
  activeCity: City | null | undefined;
  selectedStatuses: Status[];
  selectedPhases: string[];
  searchQuery: string;
  selectedYear?: number | null;
  includeFuture?: boolean;
  lineAliases?: string[];
}

export interface TimelineVisibilityRecord {
  status: Status;
  city_id?: string;
  phase?: string;
  inaugurated_on?: string | null;
  opened_on?: string | null;
}

export interface VisibilityOptions {
  year: number | null;
  includeFuture: boolean;
  statuses: readonly Status[];
  cityId: string | null;
  phases: string[];
}

function isDateVisible(
  date: string | null | undefined,
  year: number | null
): boolean {
  if (year === null || !date) return true;
  return date <= `${year}-12-31`;
}

export function isVisible(
  record: TimelineVisibilityRecord,
  options: VisibilityOptions
): boolean {
  if (!options.statuses.includes(record.status)) return false;
  if (options.cityId && record.city_id !== options.cityId) return false;
  if (options.phases.length > 0 && !options.phases.includes(record.phase ?? "")) {
    return false;
  }
  if (record.status !== "operational") return options.includeFuture;
  return isDateVisible(record.opened_on ?? record.inaugurated_on, options.year);
}

export function buildVisibilityExpression(
  status: Status,
  options: Omit<VisibilityOptions, "statuses">
): unknown[] {
  const conditions: unknown[] = ["all", ["==", ["get", "status"], status]];

  if (options.cityId) {
    conditions.push(["==", ["get", "city_id"], options.cityId]);
  }
  if (options.phases.length > 0) {
    conditions.push(["in", ["get", "phase"], ["literal", options.phases]]);
  }
  if (status !== "operational") {
    return options.includeFuture
      ? conditions
      : ["==", ["get", "status"], "__NONE__"];
  }
  if (options.year !== null) {
    const yearThreshold = `${options.year}-12-31`;
    conditions.push([
      "any",
      ["!", ["has", "opened_on"]],
      ["!", ["has", "inaugurated_on"]],
      ["==", ["get", "opened_on"], null],
      ["==", ["get", "inaugurated_on"], null],
      [
        "<=",
        ["to-string", ["coalesce", ["get", "opened_on"], ["get", "inaugurated_on"]]],
        yearThreshold,
      ],
    ]);
  }
  return conditions;
}

/**
 * Pure predicate to test if a segment matches user-selected filters, timeline, and search query.
 * Matches on city_id (with fallback to city name/id for resilience), status, phase, timeline, and search query.
 */
export function matchesSegmentFilter(
  props: SegmentProperties,
  criteria: FilterCriteria
): boolean {
  const {
    activeCity,
    selectedStatuses,
    selectedPhases,
    searchQuery,
    selectedYear,
    includeFuture = true,
    lineAliases = [],
  } = criteria;

  if (activeCity) {
    if (props.city_id) {
      if (props.city_id.toLowerCase() !== activeCity.id.toLowerCase()) return false;
    } else {
      const cityName = activeCity.name.toLowerCase();
      const cityId = activeCity.id.toLowerCase();
      const segCity = props.city.toLowerCase();
      if (segCity !== cityName && segCity !== cityId) return false;
    }
  }

  if (
    !isVisible(props, {
      statuses: selectedStatuses,
      cityId: activeCity?.id ?? null,
      phases: selectedPhases,
      year: selectedYear ?? null,
      includeFuture,
    })
  ) {
    return false;
  }

  const query = searchQuery.trim().toLowerCase();
  if (query) {
    const matchesLine = props.line_name.toLowerCase().includes(query);
    const matchesAlias = lineAliases.some((alias) =>
      alias.toLowerCase().includes(query)
    );
    const matchesCity = props.city.toLowerCase().includes(query);
    const matchesPhase = props.phase.toLowerCase().includes(query);
    if (!matchesLine && !matchesAlias && !matchesCity && !matchesPhase) return false;
  }

  return true;
}
