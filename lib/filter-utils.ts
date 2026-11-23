import type { SegmentProperties, Status, City } from "@/types/schema";
import { getRegion, getRegionMemberCityIds, isRegionId } from "@/lib/regions";

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
  if (options.cityId) {
    if (isRegionId(options.cityId)) {
      const memberIds = getRegionMemberCityIds(options.cityId);
      if (!record.city_id || !memberIds.includes(record.city_id)) return false;
    } else if (record.city_id !== options.cityId) {
      return false;
    }
  }
  if (
    options.phases.length > 0 &&
    !options.phases.includes(record.phase ?? "")
  ) {
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
    if (isRegionId(options.cityId)) {
      conditions.push(["in", ["get", "city_id"], ["literal", getRegionMemberCityIds(options.cityId)]]);
    } else {
      conditions.push(["==", ["get", "city_id"], options.cityId]);
    }
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
        [
          "to-string",
          ["coalesce", ["get", "opened_on"], ["get", "inaugurated_on"]],
        ],
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

  if (activeCity && props.city_id) {
    if (isRegionId(activeCity.id)) {
      const memberIds = getRegionMemberCityIds(activeCity.id);
      if (!memberIds.includes(props.city_id.toLowerCase())) return false;
    } else if (props.city_id.toLowerCase() !== activeCity.id.toLowerCase()) {
      return false;
    }
  } else if (activeCity) {
    const segmentCity = props.city.toLowerCase();
    if (
      ![activeCity.name, activeCity.id].some(
        (city) => city.toLowerCase() === segmentCity
      )
    ) {
      return false;
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
  )
    return false;

  const query = searchQuery.trim().toLowerCase();
  if (query) {
    if (
      ![props.line_name, props.city, props.phase, ...lineAliases].some(
        (value) => value.toLowerCase().includes(query)
      )
    )
      return false;
  }

  return true;
}

export function buildFilterCriteria(
  dataset: {
    cities: City[];
    lines: Array<{ id: string; city_id: string; aliases?: string[] }>;
  },
  selectedCityId: string | null,
  selectedStatuses: Status[],
  selectedPhases: string[],
  searchQuery: string,
  selectedYear?: number | null,
  includeFuture?: boolean
): FilterCriteria {
  const region = getRegion(selectedCityId);
  const activeCity = region
    ? ({
        id: region.id,
        name: region.name,
        phases: [],
        bbox: region.bbox,
        operator: "NCR Regional Network",
        provenance: { status: "verified" as const },
      } as unknown as City)
    : selectedCityId
    ? dataset.cities.find((c) => c.id === selectedCityId)
    : null;

  return {
    activeCity,
    selectedStatuses,
    selectedPhases,
    searchQuery,
    selectedYear,
    includeFuture,
    lineAliases: dataset.lines
      .filter((line) => {
        if (!selectedCityId) return true;
        if (isRegionId(selectedCityId)) {
          return getRegionMemberCityIds(selectedCityId).includes(line.city_id);
        }
        return line.city_id === selectedCityId;
      })
      .flatMap((line) => line.aliases ?? []),
  };
}
