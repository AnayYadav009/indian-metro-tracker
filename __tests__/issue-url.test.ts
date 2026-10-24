import { describe, it, expect } from "vitest";
import {
  buildDataCorrectionIssueUrl,
  buildStationIssueUrl,
  buildSegmentIssueUrl,
  buildRouteIssueUrl,
  buildCityIssueUrl,
  buildMapPermalink,
  generateIssueBody,
  MAX_ISSUE_URL_LENGTH,
  type IssueTarget,
  type RouteIssueData,
  type CityIssueData,
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
    it("includes all required segment fields and separate network provenance section", () => {
      const target: IssueTarget = {
        type: "segment",
        data: sampleSegment,
        cityProvenance: { status: "unverified", source_url: null, last_verified: null },
        lineProvenance: { status: "verified", source_url: "https://dmrc.in", last_verified: "2026-10-15" },
      };
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

      expect(body).toContain("### Network Provenance");
      expect(body).toContain("- **City Provenance Status:** unverified");
      expect(body).toContain("- **City Source URL:** None");
      expect(body).toContain("- **City Last Verified:** Not recorded");
      expect(body).toContain("- **Line Provenance Status:** verified");
      expect(body).toContain("- **Line Source URL:** https://dmrc.in");
      expect(body).toContain("- **Line Last Verified:** 2026-10-15");

      expect(body).toContain("### Map Permalink");
      expect(body).toContain("selected=segment%3Adel-yellow-seg-01");
    });

    it("includes all required station fields with missing provenance falling back smoothly", () => {
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

      expect(body).toContain("### Network Provenance");
      expect(body).toContain("- **City Provenance Status:** unverified");
      expect(body).toContain("- **City Source URL:** None");
      expect(body).toContain("- **City Last Verified:** Not recorded");
      expect(body).toContain("- **Line Provenance Status:** unverified");

      expect(body).toContain("### Map Permalink");
      expect(body).toContain("selected=station%3Adel-rajiv-chowk");
    });

    it("generates structured route issue body", () => {
      const routeData: RouteIssueData = {
        cityId: "delhi",
        cityName: "Delhi",
        fromStation: { id: "del-kashmere-gate", name: "Kashmere Gate" },
        toStation: { id: "del-rajiv-chowk", name: "Rajiv Chowk" },
        stationCount: 5,
        estimatedTime: "12 min",
        orderedStationIds: [
          "del-kashmere-gate",
          "del-chandni-chowk",
          "del-chawri-bazar",
          "del-new-delhi",
          "del-rajiv-chowk",
        ],
      };

      const body = generateIssueBody({ type: "route", data: routeData });
      expect(body).toContain("### Route Diagnostics");
      expect(body).toContain("- **City:** Delhi (`delhi`)");
      expect(body).toContain("- **Origin Station:** Kashmere Gate (`del-kashmere-gate`)");
      expect(body).toContain("- **Destination Station:** Rajiv Chowk (`del-rajiv-chowk`)");
      expect(body).toContain("- **Total Stations:** 5");
      expect(body).toContain("- **Estimated Travel Time:** 12 min");
      expect(body).toContain(
        "- **Ordered Station IDs:** del-kashmere-gate, del-chandni-chowk, del-chawri-bazar, del-new-delhi, del-rajiv-chowk"
      );
      expect(body).toContain("### Page URL");
      expect(body).toContain("/city/delhi");
    });

    it("generates structured city issue body with provenance", () => {
      const cityData: CityIssueData = {
        cityId: "mumbai",
        cityName: "Mumbai",
        provenance: {
          status: "schematic",
          source_url: "https://mmrda.maharashtra.gov.in",
          last_verified: "2026-10-18",
        },
      };

      const body = generateIssueBody({ type: "city", data: cityData });
      expect(body).toContain("### City Network Diagnostics");
      expect(body).toContain("- **City:** Mumbai (`mumbai`)");
      expect(body).toContain("- **Provenance Status:** schematic");
      expect(body).toContain("- **Source URL:** https://mmrda.maharashtra.gov.in");
      expect(body).toContain("- **Last Verified:** 2026-10-18");
      expect(body).toContain("### Page URL");
      expect(body).toContain("/city/mumbai");
    });
  });

  describe("buildDataCorrectionIssueUrl and builder helpers", () => {
    it("constructs a valid GitHub issue new URL for segment", () => {
      const urlString = buildSegmentIssueUrl(sampleSegment);
      const parsedUrl = new URL(urlString);
      expect(parsedUrl.origin).toBe("https://github.com");
      expect(parsedUrl.pathname).toBe("/AnayYadav009/indian-metro-tracker/issues/new");
      expect(parsedUrl.searchParams.get("template")).toBe("data-correction.yml");
      expect(parsedUrl.searchParams.get("labels")).toBe("data-correction");
      expect(parsedUrl.searchParams.get("title")).toBe("[Data Correction]: Line Yellow Line (Delhi)");
      expect(parsedUrl.searchParams.get("body")).toContain("Yellow Line");
    });

    it("constructs a valid GitHub issue new URL for station", () => {
      const urlString = buildStationIssueUrl(sampleStation, [77.2183, 28.6328]);
      const parsedUrl = new URL(urlString);
      expect(parsedUrl.searchParams.get("title")).toBe("[Data Correction]: Station Rajiv Chowk (Delhi)");
      expect(parsedUrl.searchParams.get("body")).toContain("Rajiv Chowk");
    });

    it("constructs a valid GitHub issue new URL for route", () => {
      const routeData: RouteIssueData = {
        cityId: "delhi",
        cityName: "Delhi",
        fromStation: { id: "del-kashmere-gate", name: "Kashmere Gate" },
        toStation: { id: "del-rajiv-chowk", name: "Rajiv Chowk" },
        stationCount: 5,
        estimatedTime: "12 min",
        orderedStationIds: ["del-kashmere-gate", "del-chandni-chowk", "del-chawri-bazar", "del-new-delhi", "del-rajiv-chowk"],
      };
      const urlString = buildRouteIssueUrl(routeData);
      const parsedUrl = new URL(urlString);
      expect(parsedUrl.searchParams.get("title")).toBe("[Data Correction]: Route Kashmere Gate to Rajiv Chowk (Delhi)");
      expect(parsedUrl.searchParams.get("body")).toContain("**Estimated Travel Time:** 12 min");
    });

    it("constructs a valid GitHub issue new URL for city", () => {
      const cityData: CityIssueData = {
        cityId: "bengaluru",
        cityName: "Bengaluru",
        provenance: null,
      };
      const urlString = buildCityIssueUrl(cityData);
      const parsedUrl = new URL(urlString);
      expect(parsedUrl.searchParams.get("title")).toBe("[Data Correction]: City Bengaluru");
      expect(parsedUrl.searchParams.get("body")).toContain("Bengaluru (`bengaluru`)");
      expect(parsedUrl.searchParams.get("body")).toContain("**Provenance Status:** unverified");
    });

    it("properly handles special characters (&, #, %, +, quotes, newlines, non-Latin) and round-trips safely", () => {
      const specialStation: StationProperties = {
        ...sampleStation,
        name: 'Chhatrapati Shivaji #1 & 100% "CST" + Terminal \n(छत्रपती शिवाजी महाराज टर्मिनस)',
      };
      const urlString = buildStationIssueUrl(specialStation);

      const parsedUrl = new URL(urlString);
      const title = parsedUrl.searchParams.get("title");
      const body = parsedUrl.searchParams.get("body");

      expect(title).toContain('Chhatrapati Shivaji #1 & 100% "CST" + Terminal \n(छत्रपती शिवाजी महाराज टर्मिनस)');
      expect(body).toContain('छत्रपती शिवाजी महाराज टर्मिनस');
      expect(body).toContain('#1 & 100% "CST" + Terminal');
    });

    it("enforces strict URL length under 7,400 chars and truncates route station list appropriately", () => {
      const massiveStationList = Array.from({ length: 400 }, (_, i) => `stn-very-long-city-metro-line-extended-station-identifier-${i}`);
      const massiveRoute: RouteIssueData = {
        cityId: "delhi",
        cityName: "Delhi",
        fromStation: { id: massiveStationList[0], name: "Start Terminal Station" },
        toStation: { id: massiveStationList[massiveStationList.length - 1], name: "End Terminal Station" },
        stationCount: massiveStationList.length,
        estimatedTime: "240 min",
        orderedStationIds: massiveStationList,
      };

      const urlString = buildRouteIssueUrl(massiveRoute);
      expect(urlString.length).toBeLessThanOrEqual(MAX_ISSUE_URL_LENGTH);
      expect(urlString.length).toBeLessThan(7500);

      const parsedUrl = new URL(urlString);
      const body = parsedUrl.searchParams.get("body");
      expect(body).toContain("Station list truncated");
    });

    it("enforces strict URL length under 7,400 chars on massive segment references", () => {
      const hugeReferences = Array.from({ length: 300 }, (_, i) => `https://example.com/very/long/nested/path/document-${i}?source=government-gazette-notification-record-reference`);
      const massiveSegment: SegmentProperties = {
        ...sampleSegment,
        references: hugeReferences,
        line_name: "Super " + "Extremely ".repeat(50) + "Long Line Name",
      };

      const urlString = buildSegmentIssueUrl(massiveSegment);
      expect(urlString.length).toBeLessThanOrEqual(MAX_ISSUE_URL_LENGTH);
      expect(urlString.length).toBeLessThan(7500);

      const parsedUrl = new URL(urlString);
      const body = parsedUrl.searchParams.get("body");
      expect(body).toContain("*(Diagnostics truncated to stay under URL length limit)*");
    });
  });
});
