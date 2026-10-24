import { SITE_CONFIG } from "./site-config";
import type { SegmentProperties, StationProperties, Provenance } from "@/types/schema";

export interface RouteIssueData {
  cityId: string;
  cityName: string;
  fromStation: { id: string; name: string };
  toStation: { id: string; name: string };
  stationCount: number;
  estimatedTime: string;
  orderedStationIds: string[];
  pageUrl?: string;
}

export interface CityIssueData {
  cityId: string;
  cityName: string;
  provenance?: Provenance | null;
  pageUrl?: string;
}

export type IssueTarget =
  | {
      type: "segment";
      data: SegmentProperties;
      coordinates?: [number, number];
      cityProvenance?: Provenance | null;
      lineProvenance?: Provenance | null;
    }
  | {
      type: "station";
      data: StationProperties;
      coordinates?: [number, number];
      cityProvenance?: Provenance | null;
      lineProvenance?: Provenance | null;
    }
  | {
      type: "route";
      data: RouteIssueData;
    }
  | {
      type: "city";
      data: CityIssueData;
    };

export interface BuildIssueUrlOptions {
  siteUrl?: string;
  repoUrl?: string;
}

export const MAX_ISSUE_URL_LENGTH = 7400;

/**
 * Builds a direct permalink to the map for a given feature.
 */
export function buildMapPermalink(
  cityId: string,
  type: "segment" | "station",
  featureId: string,
  siteUrl?: string
): string {
  const base = (siteUrl || SITE_CONFIG.siteUrl).replace(/\/+$/, "");
  const selectedParam = `${type}:${featureId}`;
  return `${base}/?city=${encodeURIComponent(cityId)}&selected=${encodeURIComponent(selectedParam)}`;
}

/**
 * Generates the structured Markdown body containing feature diagnostics,
 * displayed properties, network provenance, and a deep permalink to the map.
 */
export function generateIssueBody(target: IssueTarget, siteUrl?: string): string {
  const lines: string[] = [];

  if (target.type === "segment" || target.type === "station") {
    const isSegment = target.type === "segment";
    const data = target.data;
    const permalink = buildMapPermalink(
      data.city_id,
      target.type,
      isSegment ? (data as SegmentProperties).segment_id : (data as StationProperties).station_id,
      siteUrl
    );

    lines.push("### Feature Diagnostics");
    lines.push(`- **Feature Type:** ${isSegment ? "Segment (Line)" : "Station"}`);
    lines.push(
      `- **Feature ID:** \`${isSegment ? (data as SegmentProperties).segment_id : (data as StationProperties).station_id}\``
    );
    lines.push(`- **Name:** ${isSegment ? (data as SegmentProperties).line_name : (data as StationProperties).name}`);
    lines.push(`- **City:** ${data.city} (\`${data.city_id}\`)`);
    lines.push(`- **Retrieved At:** ${data.retrieved_at || "N/A"}`);
    lines.push(`- **Last Verified:** ${data.last_verified || "N/A"}`);
    lines.push(`- **Data Source:** ${data.source}`);
    lines.push("");

    lines.push("### Displayed Values");
    lines.push(`- **Status:** ${data.status}`);
    lines.push(`- **Phase:** ${data.phase}`);

    if (isSegment) {
      const seg = data as SegmentProperties;
      lines.push(`- **Operator:** ${seg.operator}`);
      lines.push(`- **Length:** ${seg.length_km} km`);
      lines.push(`- **Stations Count:** ${seg.stations_count} stations`);
      lines.push(`- **Track Gauge:** ${seg.gauge}`);
      lines.push(
        `- **${seg.status === "operational" ? "Inaugurated On" : "Expected Completion"}:** ${
          seg.status === "operational" ? seg.inaugurated_on || "N/A" : seg.expected_completion || "TBD"
        }`
      );
      if (seg.references && seg.references.length > 0) {
        lines.push(`- **References:** ${seg.references.join(", ")}`);
      }
    } else {
      const stn = data as StationProperties;
      lines.push(`- **Layout:** ${stn.layout}`);
      lines.push(`- **Interchange:** ${stn.is_interchange ? "Yes" : "No"}`);
      lines.push(`- **Connected Line IDs:** ${stn.line_ids.join(", ")}`);
      lines.push(
        `- **${stn.status === "operational" ? "Opened On" : "Expected Completion"}:** ${
          stn.status === "operational" ? stn.opened_on || "N/A" : stn.expected_completion || "TBD"
        }`
      );
      if (target.coordinates) {
        lines.push(
          `- **Coordinates:** ${target.coordinates[1].toFixed(4)}° N, ${target.coordinates[0].toFixed(4)}° E`
        );
      }
    }

    // Network-level provenance
    lines.push("");
    lines.push("### Network Provenance");
    lines.push(`- **City Provenance Status:** ${target.cityProvenance?.status || "unverified"}`);
    lines.push(`- **City Source URL:** ${target.cityProvenance?.source_url || "None"}`);
    lines.push(`- **City Last Verified:** ${target.cityProvenance?.last_verified || "Not recorded"}`);
    lines.push(`- **Line Provenance Status:** ${target.lineProvenance?.status || "unverified"}`);
    lines.push(`- **Line Source URL:** ${target.lineProvenance?.source_url || "None"}`);
    lines.push(`- **Line Last Verified:** ${target.lineProvenance?.last_verified || "Not recorded"}`);

    lines.push("");
    lines.push("### Map Permalink");
    lines.push(permalink);
  } else if (target.type === "route") {
    const route = target.data;
    const base = (siteUrl || SITE_CONFIG.siteUrl).replace(/\/+$/, "");
    const pageUrl = route.pageUrl || `${base}/city/${encodeURIComponent(route.cityId)}`;

    lines.push("### Route Diagnostics");
    lines.push(`- **City:** ${route.cityName} (\`${route.cityId}\`)`);
    lines.push(`- **Origin Station:** ${route.fromStation.name} (\`${route.fromStation.id}\`)`);
    lines.push(`- **Destination Station:** ${route.toStation.name} (\`${route.toStation.id}\`)`);
    lines.push(`- **Total Stations:** ${route.stationCount}`);
    lines.push(`- **Estimated Travel Time:** ${route.estimatedTime}`);
    lines.push(`- **Ordered Station IDs:** ${route.orderedStationIds.join(", ")}`);
    lines.push("");
    lines.push("### Page URL");
    lines.push(pageUrl);
  } else if (target.type === "city") {
    const city = target.data;
    const base = (siteUrl || SITE_CONFIG.siteUrl).replace(/\/+$/, "");
    const pageUrl = city.pageUrl || `${base}/city/${encodeURIComponent(city.cityId)}`;

    lines.push("### City Network Diagnostics");
    lines.push(`- **City:** ${city.cityName} (\`${city.cityId}\`)`);
    lines.push(`- **Provenance Status:** ${city.provenance?.status || "unverified"}`);
    lines.push(`- **Source URL:** ${city.provenance?.source_url || "None"}`);
    lines.push(`- **Last Verified:** ${city.provenance?.last_verified || "Not recorded"}`);
    lines.push("");
    lines.push("### Page URL");
    lines.push(pageUrl);
  }

  return lines.join("\n");
}

/**
 * Builds the GitHub new issue URL prefilled with template, labels, title,
 * and a Markdown diagnostics body. Enforces strict length limit (< 7,400 chars)
 * and safely encodes all query parameters.
 */
export function buildDataCorrectionIssueUrl(
  target: IssueTarget,
  options?: BuildIssueUrlOptions
): string {
  const repoBase = (options?.repoUrl || SITE_CONFIG.repoUrl).replace(/\/+$/, "");
  const baseUrl = `${repoBase}/issues/new`;

  let title = "";
  if (target.type === "segment") {
    title = `[Data Correction]: Line ${target.data.line_name} (${target.data.city})`;
  } else if (target.type === "station") {
    title = `[Data Correction]: Station ${target.data.name} (${target.data.city})`;
  } else if (target.type === "route") {
    title = `[Data Correction]: Route ${target.data.fromStation.name} to ${target.data.toStation.name} (${target.data.cityName})`;
  } else if (target.type === "city") {
    title = `[Data Correction]: City ${target.data.cityName}`;
  }

  const template = "data-correction.yml";
  const labels = "data-correction";

  let body = generateIssueBody(target, options?.siteUrl);

  const assembleUrl = (content: string): string => {
    const params = new URLSearchParams();
    params.set("template", template);
    params.set("labels", labels);
    params.set("title", title);
    params.set("body", content);
    return `${baseUrl}?${params.toString()}`;
  };

  let fullUrl = assembleUrl(body);

  if (fullUrl.length > MAX_ISSUE_URL_LENGTH) {
    // If it's a route with long station IDs, truncate station IDs first
    if (target.type === "route" && target.data.orderedStationIds.length > 5) {
      const routeData = { ...target.data };
      let stationList = [...routeData.orderedStationIds];
      while (fullUrl.length > MAX_ISSUE_URL_LENGTH && stationList.length > 4) {
        stationList = stationList.slice(0, Math.max(2, stationList.length - 10));
        const truncatedTarget: IssueTarget = {
          type: "route",
          data: {
            ...routeData,
            orderedStationIds: stationList,
          },
        };
        body =
          generateIssueBody(truncatedTarget, options?.siteUrl) +
          `\n*(Station list truncated from ${target.data.orderedStationIds.length} stations to stay under URL length limit)*`;
        fullUrl = assembleUrl(body);
      }
    }

    // If still overflowing, truncate body with notice
    if (fullUrl.length > MAX_ISSUE_URL_LENGTH) {
      const truncationNotice = "\n\n*(Diagnostics truncated to stay under URL length limit)*";
      while (fullUrl.length > MAX_ISSUE_URL_LENGTH && body.length > 50) {
        const overflow = fullUrl.length - MAX_ISSUE_URL_LENGTH;
        const step = Math.max(20, Math.ceil(overflow / 3) + 20);
        body = body.slice(0, Math.max(50, body.length - step));
        fullUrl = assembleUrl(body + truncationNotice);
      }
    }
  }

  return fullUrl;
}

/** Convenience URL builder for station issues */
export function buildStationIssueUrl(
  data: StationProperties,
  coordinates?: [number, number],
  lineProvenance?: Provenance | null,
  cityProvenance?: Provenance | null,
  options?: BuildIssueUrlOptions
): string {
  return buildDataCorrectionIssueUrl(
    {
      type: "station",
      data,
      coordinates,
      lineProvenance,
      cityProvenance,
    },
    options
  );
}

/** Convenience URL builder for segment issues */
export function buildSegmentIssueUrl(
  data: SegmentProperties,
  coordinates?: [number, number],
  lineProvenance?: Provenance | null,
  cityProvenance?: Provenance | null,
  options?: BuildIssueUrlOptions
): string {
  return buildDataCorrectionIssueUrl(
    {
      type: "segment",
      data,
      coordinates,
      lineProvenance,
      cityProvenance,
    },
    options
  );
}

/** Convenience URL builder for route issues */
export function buildRouteIssueUrl(
  data: RouteIssueData,
  options?: BuildIssueUrlOptions
): string {
  return buildDataCorrectionIssueUrl(
    {
      type: "route",
      data,
    },
    options
  );
}

/** Convenience URL builder for city issues */
export function buildCityIssueUrl(
  data: CityIssueData,
  options?: BuildIssueUrlOptions
): string {
  return buildDataCorrectionIssueUrl(
    {
      type: "city",
      data,
    },
    options
  );
}
