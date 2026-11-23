import { describe, it, expect } from "vitest";
import { mergeCityOverrides, type CityOverrideData } from "@/scripts/pipeline/merge-overrides";
import { normalizeOverpassCity } from "@/scripts/pipeline/normalize";

describe("Endpoint Station Trimming", () => {
  // Polyline running west to east: (77.0, 28.0) -> (77.1, 28.0) -> (77.2, 28.0) -> (77.3, 28.0) -> (77.4, 28.0)
  // Station Alpha at 77.1, Beta at 77.2, Gamma at 77.3, Delta at 77.4
  const rawOverpass = {
    version: 0.6,
    generator: "test",
    osm3s: { timestamp_osm_base: "2026-10-17T00:00:00Z" },
    elements: [
      {
        type: "relation",
        id: 999001,
        tags: {
          type: "route",
          route: "subway",
          name: "Test Subway Line",
          colour: "#FF00FF",
        },
        members: [
          {
            type: "way",
            ref: 101,
            role: "",
            geometry: [
              { lat: 28.0, lon: 77.0 },
              { lat: 28.0, lon: 77.1 },
              { lat: 28.0, lon: 77.2 },
              { lat: 28.0, lon: 77.3 },
              { lat: 28.0, lon: 77.4 },
            ],
          },
          { type: "node", ref: 201, role: "stop" },
          { type: "node", ref: 202, role: "stop" },
          { type: "node", ref: 203, role: "stop" },
          { type: "node", ref: 204, role: "stop" },
        ],
      },
      {
        type: "node",
        id: 201,
        lat: 28.0,
        lon: 77.1,
        tags: { name: "Station Alpha", railway: "station" },
      },
      {
        type: "node",
        id: 202,
        lat: 28.0,
        lon: 77.2,
        tags: { name: "Station Beta", railway: "station" },
      },
      {
        type: "node",
        id: 203,
        lat: 28.0,
        lon: 77.3,
        tags: { name: "Station Gamma", railway: "station" },
      },
      {
        type: "node",
        id: 204,
        lat: 28.0,
        lon: 77.4,
        tags: { name: "Station Delta", railway: "station" },
      },
    ],
  };

  it("trims coordinates between projections of two specified endpoint stations when trim_to_endpoints is true", () => {
    const normalized = normalizeOverpassCity("testcity", rawOverpass);

    const overrides: CityOverrideData = {
      city: {
        id: "testcity",
        name: "Test City",
        bbox: [76.9, 27.9, 77.5, 28.5],
        operator: "Test Operator",
        phases: ["Phase 1"],
      },
      lines: [
        {
          id: "test-line",
          name: "Test Line",
          city: "Test City",
          city_id: "testcity",
          color: "#FF00FF",
          operator: "Test Operator",
          source: "osm",
        },
      ],
      segments: [
        {
          osmId: 999001,
          segment_id: "test-seg-01",
          line_id: "test-line",
          line_name: "Test Line",
          phase: "Phase 1",
          status: "operational",
          gauge: "standard",
          inaugurated_on: "2024-01-01",
          expected_completion: null,
          color: "#FF00FF",
          // Opt-in flag ON: endpoints specify Alpha (77.1) and Gamma (77.3)
          trim_to_endpoints: true,
          endpoint_station_ids: ["testcity-station-alpha", "testcity-station-gamma"],
        },
      ],
    };

    const merged = mergeCityOverrides(normalized, overrides);
    const seg = merged.segments.find((s) => s.properties.segment_id === "test-seg-01");
    expect(seg).toBeDefined();

    // The coords should start near Alpha (77.1, 28.0) and end near Gamma (77.3, 28.0)
    // rather than extending to Delta (77.4)
    const coords = seg!.geometry.coordinates;
    expect(coords[0][0]).toBeCloseTo(77.1, 4);
    expect(coords[0][1]).toBeCloseTo(28.0, 4);
    expect(coords[coords.length - 1][0]).toBeCloseTo(77.3, 4);
    expect(coords[coords.length - 1][1]).toBeCloseTo(28.0, 4);
  });

  it("leaves coordinates untrimmed by endpoint stations when trim_to_endpoints is absent or false", () => {
    const normalized = normalizeOverpassCity("testcity", rawOverpass);

    const overrides: CityOverrideData = {
      city: {
        id: "testcity",
        name: "Test City",
        bbox: [76.9, 27.9, 77.5, 28.5],
        operator: "Test Operator",
        phases: ["Phase 1"],
      },
      lines: [
        {
          id: "test-line",
          name: "Test Line",
          city: "Test City",
          city_id: "testcity",
          color: "#FF00FF",
          operator: "Test Operator",
          source: "osm",
        },
      ],
      segments: [
        {
          osmId: 999001,
          segment_id: "test-seg-01",
          line_id: "test-line",
          line_name: "Test Line",
          phase: "Phase 1",
          status: "operational",
          gauge: "standard",
          inaugurated_on: "2024-01-01",
          expected_completion: null,
          color: "#FF00FF",
          // Opt-in flag OFF (absent)
          endpoint_station_ids: ["testcity-station-alpha", "testcity-station-gamma"],
        },
      ],
    };

    const merged = mergeCityOverrides(normalized, overrides);
    const seg = merged.segments.find((s) => s.properties.segment_id === "test-seg-01");
    expect(seg).toBeDefined();

    // Default 3e607d7 behavior: slices between first and last projected line stations (Alpha 77.1 to Delta 77.4)
    // endpoint_station_ids are NOT used to trim when trim_to_endpoints is absent.
    const coords = seg!.geometry.coordinates;
    expect(coords[0][0]).toBeCloseTo(77.1, 4);
    expect(coords[0][1]).toBeCloseTo(28.0, 4);
    expect(coords[coords.length - 1][0]).toBeCloseTo(77.4, 4);
    expect(coords[coords.length - 1][1]).toBeCloseTo(28.0, 4);
  });
});
