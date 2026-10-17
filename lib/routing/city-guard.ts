import type { CityRoutability, LineRoutability } from "./types";
import type { City, Line, SegmentFeatureCollection, StationFeatureCollection } from "@/types/metro";
import { getMetroData } from "@/lib/data";

/**
 * Audit-derived rule violations for lines that fail geometric projection,
 * consecutive distance gaps, terminal matching, or active pending-rule reviews.
 */
export const AUDIT_LINE_GUARD_REASONS: Record<string, string> = {
  // Pending-rule errors (parked issues PRE-01 and PRE-02)
  "bho-orange":
    "Network data has an active pending audit review PRE-01 (operational length discrepancy >10% and missing reference terminal: Karond Circle).",
  "gur-rapid":
    "Network data has an active pending audit review PRE-02 (loop terminal geometry under review and missing reference terminal: Cyber City).",

  // Consecutive station gap > 5 km
  "del-airport":
    "Consecutive station gap > 5 km: 6.36 km between Dhaula Kuan and Shivaji Stadium.",

  // Station projection offset > 150 m
  "del-green":
    "1 station projecting > 150 m from track (Punjabi Bagh West: 154 m).",
  "del-pink":
    "3 stations projecting > 150 m from track (Rajouri Garden: 229 m, Netaji Subhash Place: 209 m, Azadpur: 206 m).",
  "del-magenta":
    "1 station projecting > 150 m from track (Kalkaji Mandir: 212 m).",
};

/**
 * Checks whether an individual metro line passes all routing verification checks.
 */
export function getLineRoutability(lineId: string): LineRoutability {
  const reason = AUDIT_LINE_GUARD_REASONS[lineId];
  if (reason) {
    return { lineId, isRoutable: false, reason };
  }
  return { lineId, isRoutable: true };
}

/**
 * Evaluates whether a city network is routable, partly routable, or non-routable.
 * Derived directly from the transit verification checks in scripts/verify-routing.ts.
 */
export function getCityRoutability(
  cityId: string,
  customData?: {
    cities: City[];
    lines: Line[];
    segments: SegmentFeatureCollection;
    stations: StationFeatureCollection;
  }
): CityRoutability {
  const data = customData ?? getMetroData();
  const city = data.cities.find((c: City) => c.id === cityId);

  if (!city) {
    return {
      isRoutable: false,
      status: "non_routable",
      reason: "City not found in metro database.",
      routableLineIds: [],
      unroutableLines: [],
    };
  }

  // Special guard for Patna: 5 operational stations compiled but 0 verified operational lines
  if (cityId === "patna") {
    return {
      isRoutable: false,
      status: "non_routable",
      reason: "Patna Metro has no operational lines to verify.",
      routableLineIds: [],
      unroutableLines: [
        {
          id: "pat-blue",
          name: "Blue Line (Corridor 2)",
          reason: "no operational lines to verify",
        },
      ],
    };
  }

  // 1. Check operational stations in this city
  const operationalStations = data.stations.features.filter(
    (st: any) =>
      st.properties.city_id === cityId && st.properties.status === "operational"
  );

  if (operationalStations.length === 0) {
    return {
      isRoutable: false,
      status: "non_routable",
      reason: `${city.name} Metro is currently under construction with 0 operational stations.`,
      routableLineIds: [],
      unroutableLines: [],
    };
  }

  if (operationalStations.length < 2) {
    return {
      isRoutable: false,
      status: "non_routable",
      reason: `${city.name} Metro has fewer than 2 operational stations.`,
      routableLineIds: [],
      unroutableLines: [],
    };
  }

  // 2. Identify all lines that have operational segments in this city
  const operationalSegments = data.segments.features.filter(
    (seg: any) =>
      seg.properties.city_id === cityId &&
      seg.properties.status === "operational"
  );

  if (operationalSegments.length === 0) {
    return {
      isRoutable: false,
      status: "non_routable",
      reason: `${city.name} Metro has no operational track segments mapped.`,
      routableLineIds: [],
      unroutableLines: [],
    };
  }

  const operationalLineIds = Array.from(
    new Set(operationalSegments.map((s: any) => s.properties.line_id))
  );

  const cityLines = data.lines.filter((l: Line) =>
    operationalLineIds.includes(l.id)
  );

  const routableLineIds: string[] = [];
  const unroutableLines: Array<{ id: string; name: string; reason: string }> =
    [];

  for (const line of cityLines) {
    const lineRes = getLineRoutability(line.id);
    if (lineRes.isRoutable) {
      routableLineIds.push(line.id);
    } else {
      unroutableLines.push({
        id: line.id,
        name: line.name,
        reason: lineRes.reason || "Failed routing verification checks.",
      });
    }
  }

  // 3. Overall city routability determination
  if (routableLineIds.length === 0) {
    const primaryReason =
      unroutableLines[0]?.reason ||
      `${city.name} Metro has no verified routable lines available.`;
    return {
      isRoutable: false,
      status: "non_routable",
      reason: primaryReason,
      routableLineIds: [],
      unroutableLines,
    };
  }

  if (unroutableLines.length > 0) {
    return {
      isRoutable: true,
      status: "partly_routable",
      reason: `${routableLineIds.length} of ${cityLines.length} lines verified for routing. Excluded lines: ${unroutableLines.map((u) => u.name).join(", ")}.`,
      routableLineIds,
      unroutableLines,
    };
  }

  return {
    isRoutable: true,
    status: "routable",
    routableLineIds,
    unroutableLines: [],
  };
}
