import { describe, it, expect } from "vitest";
import {
  buildDataCorrectionIssueUrl,
  buildMapPermalink,
  generateIssueBody,
  MAX_ISSUE_URL_LENGTH,
  type IssueTarget,
} from "@/lib/issue-url";
import type { SegmentProperties, StationProperties } from "@/types/schema";

describe("Issue URL and Permalink Generator", () => {
  const sampleSegment: SegmentProperties = {
    segment_id: "del-yellow-seg-01",
    line_id: "del-yellow",
    line_name: "Yellow Line",
    city_id: "delhi",
    city: "Delhi",
    operator: "Delhi Metro Rail Corporation (DMRC)",
    status: "operational",
    phase: "Phase 1",
    length_km: 12.5,
    gauge: "broad",
    inaugurated_on: "2004-12-20",
    expected_completion: null,
    stations_count: 10,
    color: "#FFD700",
    source: "osm",
    references: ["https://www.delhimetrorail.com/corporate"],
    last_verified: "2026-03-15",
    retrieved_at: "2026-03-10",
  };

  const sampleStation: StationProperties = {
    station_id: "del-rajiv-chowk",
    name: "Rajiv Chowk",
    city_id: "delhi",
    city: "Delhi",
    line_ids: ["del-yellow", "del-blue"],
    status: "operational",
    phase: "Phase 1",
    is_interchange: true,
    opened_on: "2005-01-01",
    expected_completion: null,
    layout: "underground",
    source: "osm",
    last_verified: "2026-03-15",
    retrieved_at: "2026-03-10",
  };

  describe("buildMapPermalink", () => {
    it("generates correct permalink for segment", () => {
      const permalink = buildMapPermalink("delhi", "segment", "del-yellow-seg-01");
      expect(permalink).toContain("?city=delhi&selected=segment%3Adel-yellow-seg-01");
    });

    it("generates correct permalink for station", () => {
      const permalink = buildMapPermalink("delhi", "station", "del-rajiv-chowk");
      expect(permalink).toContain("?city=delhi&selected=station%3Adel-rajiv-chowk");
    });

    it("respects custom siteUrl option", () => {
      const permalink = buildMapPermalink(
        "delhi",
        "station",
        "del-rajiv-chowk",
        "https://custom-site.org/tracker"
      );
      expect(permalink.startsWith("https://custom-site.org/tracker/?city=delhi")).toBe(true);
    });
  });

  describe("generateIssueBody", () => {
    it("includes all required segment fields: type, id, name, city, timestamps, and displayed values", () => {
      const target: IssueTarget = { type: "segment", data: sampleSegment };
      const body = generateIssueBody(target);

      expect(body).toContain("### Feature Diagnostics");
      expect(body).toContain("- **Feature Type:** Segment (Line)");
      expect(body).toContain("- **Feature ID:** `del-yellow-seg-01`");
      expect(body).toContain("- **Name:** Yellow Line");
      expect(body).toContain("- **City:** Delhi (`delhi`)");
      expect(body).toContain("- **Retrieved At:** 2026-03-10");
      expect(body).toContain("- **Last Verified:** 2026-03-15");
      expect(body).toContain("- **Data Source:** osm");

      expect(body).toContain("### Displayed Values");
      expect(body).toContain("- **Status:** operational");
      expect(body).toContain("- **Phase:** Phase 1");
      expect(body).toContain("- **Operator:** Delhi Metro Rail Corporation (DMRC)");
      expect(body).toContain("- **Length:** 12.5 km");
      expect(body).toContain("- **Stations Count:** 10 stations");
      expect(body).toContain("- **Track Gauge:** broad");
      expect(body).toContain("- **Inaugurated On:** 2004-12-20");
      expect(body).toContain("- **References:** https://www.delhimetrorail.com/corporate");

      expect(body).toContain("### Map Permalink");
      expect(body).toContain("selected=segment%3Adel-yellow-seg-01");
    });

    it("includes all required station fields: type, id, name, city, timestamps, layout, and coordinates", () => {
      const target: IssueTarget = {
        type: "station",
        data: sampleStation,
        coordinates: [77.2183, 28.6328],
      };
      const body = generateIssueBody(target);

      expect(body).toContain("### Feature Diagnostics");
      expect(body).toContain("- **Feature Type:** Station");
      expect(body).toContain("- **Feature ID:** `del-rajiv-chowk`");
      expect(body).toContain("- **Name:** Rajiv Chowk");
      expect(body).toContain("- **City:** Delhi (`delhi`)");
      expect(body).toContain("- **Retrieved At:** 2026-03-10");
      expect(body).toContain("- **Last Verified:** 2026-03-15");

      expect(body).toContain("### Displayed Values");
      expect(body).toContain("- **Layout:** underground");
      expect(body).toContain("- **Interchange:** Yes");
      expect(body).toContain("- **Connected Line IDs:** del-yellow, del-blue");
      expect(body).toContain("- **Opened On:** 2005-01-01");
      expect(body).toContain("- **Coordinates:** 28.6328° N, 77.2183° E");

      expect(body).toContain("### Map Permalink");
      expect(body).toContain("selected=station%3Adel-rajiv-chowk");
    });
  });

  describe("buildDataCorrectionIssueUrl", () => {
    it("constructs a valid GitHub issue new URL with template, labels, and prefilled title and body", () => {
      const target: IssueTarget = { type: "segment", data: sampleSegment };
      const urlString = buildDataCorrectionIssueUrl(target);

      const parsedUrl = new URL(urlString);
      expect(parsedUrl.origin).toBe("https://github.com");
      expect(parsedUrl.pathname).toBe("/AnayYadav009/indian-metro-tracker/issues/new");

      const params = parsedUrl.searchParams;
      expect(params.get("template")).toBe("data-correction.yml");
      expect(params.get("labels")).toBe("data-correction");
      expect(params.get("title")).toBe("[Data Correction]: Line Yellow Line (Delhi)");

      const body = params.get("body");
      expect(body).not.toBeNull();
      expect(body).toContain("Yellow Line");
      expect(body).toContain("del-yellow-seg-01");
      expect(body).toContain("2026-03-15");
    });

    it("properly handles special characters and unicode in names", () => {
      const specialStation: StationProperties = {
        ...sampleStation,
        name: 'Chhatrapati Shivaji Maharaj Terminus & "CST" (व्हिटोरिया)',
      };
      const target: IssueTarget = { type: "station", data: specialStation };
      const urlString = buildDataCorrectionIssueUrl(target);

      const parsedUrl = new URL(urlString);
      const title = parsedUrl.searchParams.get("title");
      const body = parsedUrl.searchParams.get("body");

      expect(title).toContain('Chhatrapati Shivaji Maharaj Terminus & "CST" (व्हिटोरिया)');
      expect(body).toContain("व्हिटोरिया");
    });

    it("enforces strict URL length under 6 KB (MAX_ISSUE_URL_LENGTH = 6000)", () => {
      // Create a segment with an extraordinarily large reference list and massive strings
      const hugeReferences = Array.from({ length: 200 }, (_, i) => `https://example.com/very/long/nested/path/document-${i}?source=government-gazette-notification-record-reference`);
      const massiveSegment: SegmentProperties = {
        ...sampleSegment,
        references: hugeReferences,
        line_name: "Super " + "Extremely ".repeat(50) + "Long Line Name",
      };

      const target: IssueTarget = { type: "segment", data: massiveSegment };
      const urlString = buildDataCorrectionIssueUrl(target);

      expect(urlString.length).toBeLessThanOrEqual(MAX_ISSUE_URL_LENGTH);
      expect(urlString.length).toBeLessThan(6144); // 6 KB

      const parsedUrl = new URL(urlString);
      const body = parsedUrl.searchParams.get("body");
      expect(body).toContain("*(Diagnostics truncated to stay under URL length limit)*");
    });
  });
});
