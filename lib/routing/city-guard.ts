import type { CityRoutability } from "./types";
import { getMetroData } from "@/lib/data";

const PENDING_RULE_CITY_REASONS: Record<string, string> = {
  bhopal:
    "Network data has an active pending audit review (operational length discrepancy >10%).",
  gurugram:
    "Network data has an active pending audit review (loop terminal geometry under review).",
};

/**
 * Validates whether a city has a fully compliant, connected operational network ready for routing.
 * Flags cities with 0 operational stations (e.g. Surat) or active pending-rule defects (e.g. Bhopal, Gurugram).
 */
export function getCityRoutability(cityId: string): CityRoutability {
  const data = getMetroData();
  const city = data.cities.find((c) => c.id === cityId);
  if (!city) {
    return { isRoutable: false, reason: "City not found in metro database." };
  }

  // 1. Check for known pending-rule defects
  if (PENDING_RULE_CITY_REASONS[cityId]) {
    return {
      isRoutable: false,
      reason: PENDING_RULE_CITY_REASONS[cityId],
    };
  }

  // 2. Check operational stations
  const operationalStations = data.stations.features.filter(
    (st) =>
      st.properties.city_id === cityId &&
      st.properties.status === "operational"
  );

  if (operationalStations.length === 0) {
    return {
      isRoutable: false,
      reason: `${city.name} Metro is currently under construction with 0 operational stations.`,
    };
  }

  if (operationalStations.length < 2) {
    return {
      isRoutable: false,
      reason: `${city.name} Metro has fewer than 2 operational stations.`,
    };
  }

  // 3. Check operational segments
  const operationalSegments = data.segments.features.filter(
    (seg) =>
      seg.properties.city_id === cityId &&
      seg.properties.status === "operational"
  );

  if (operationalSegments.length === 0) {
    return {
      isRoutable: false,
      reason: `${city.name} Metro has no operational track segments mapped.`,
    };
  }

  return { isRoutable: true };
}
