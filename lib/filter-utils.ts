import type { SegmentProperties, Status, City } from "@/types/schema";

export interface FilterCriteria {
  activeCity: City | null | undefined;
  selectedStatuses: Status[];
  selectedPhases: string[];
  searchQuery: string;
}

/**
 * Pure predicate to test if a segment matches user-selected filters and search query.
 * Matches on city_id (with fallback to city name/id for resilience), status, phase, and search query.
 */
export function matchesSegmentFilter(
  props: SegmentProperties,
  criteria: FilterCriteria
): boolean {
  const { activeCity, selectedStatuses, selectedPhases, searchQuery } = criteria;

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

  if (!selectedStatuses.includes(props.status)) return false;

  if (selectedPhases.length > 0 && !selectedPhases.includes(props.phase)) return false;

  const query = searchQuery.trim().toLowerCase();
  if (query) {
    const matchesLine = props.line_name.toLowerCase().includes(query);
    const matchesCity = props.city.toLowerCase().includes(query);
    const matchesPhase = props.phase.toLowerCase().includes(query);
    if (!matchesLine && !matchesCity && !matchesPhase) return false;
  }

  return true;
}
