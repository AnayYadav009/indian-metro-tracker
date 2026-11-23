import { SITE_CONFIG } from "./site-config";
import type { SegmentProperties, StationProperties } from "@/types/schema";

export type IssueTarget =
  | { type: "segment"; data: SegmentProperties; coordinates?: [number, number] }
  | { type: "station"; data: StationProperties; coordinates?: [number, number] };

export interface BuildIssueUrlOptions {
  siteUrl?: string;
  repoUrl?: string;
}

export const MAX_ISSUE_URL_LENGTH = 6000;

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
 * displayed properties, and a deep permalink to the map.
 */
export function generateIssueBody(target: IssueTarget, siteUrl?: string): string {
  const isSegment = target.type === "segment";
  const data = target.data;
  const permalink = buildMapPermalink(
    data.city_id,
    target.type,
    isSegment ? (data as SegmentProperties).segment_id : (data as StationProperties).station_id,
    siteUrl
  );

  const lines: string[] = [];

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

  lines.push("");
  lines.push("### Map Permalink");
  lines.push(permalink);

  return lines.join("\n");
}

/**
 * Builds the GitHub new issue URL prefilled with template, labels, title,
 * and a Markdown diagnostics body. Enforces a strict length limit (< 6 KB)
 * and safely encodes all query parameters.
 */
export function buildDataCorrectionIssueUrl(
  target: IssueTarget,
  options?: BuildIssueUrlOptions
): string {
  const repoBase = (options?.repoUrl || SITE_CONFIG.repoUrl).replace(/\/+$/, "");
  const baseUrl = `${repoBase}/issues/new`;

  const isSegment = target.type === "segment";
  const featureName = isSegment
    ? (target.data as SegmentProperties).line_name
    : (target.data as StationProperties).name;
  const featureTypeLabel = isSegment ? "Line" : "Station";
  const title = `[Data Correction]: ${featureTypeLabel} ${featureName} (${target.data.city})`;

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
    const truncationNotice = "\n\n*(Diagnostics truncated to stay under URL length limit)*";
    while (fullUrl.length > MAX_ISSUE_URL_LENGTH && body.length > 50) {
      // Step down proportional to remaining overflow
      const overflow = fullUrl.length - MAX_ISSUE_URL_LENGTH;
      const step = Math.max(20, Math.ceil(overflow / 3) + 20);
      body = body.slice(0, Math.max(50, body.length - step));
      fullUrl = assembleUrl(body + truncationNotice);
    }
  }

  return fullUrl;
}
