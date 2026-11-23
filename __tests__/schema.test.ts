import { describe, it, expect } from "vitest";
import {
  StatusSchema,
  CitySchema,
  LineSchema,
  SegmentFeatureSchema,
  StationFeatureSchema,
  SegmentPropertiesSchema,
} from "@/types/schema";
import { validateMetroDataset } from "@/lib/data";

describe("Schema Validation Tests", () => {
  it("validates StatusSchema correctly", () => {
    expect(StatusSchema.safeParse("operational").success).toBe(true);
    expect(StatusSchema.safeParse("construction").success).toBe(true);
    expect(StatusSchema.safeParse("planned").success).toBe(true);
    expect(StatusSchema.safeParse("proposed").success).toBe(false);
    expect(StatusSchema.safeParse("inactive").success).toBe(false);
  });

  it("validates CitySchema structure", () => {
    const validCity = {
      id: "delhi",
      name: "Delhi",
      bbox: [76.84, 28.4, 77.35, 28.88] as [number, number, number, number],
      operator: "DMRC",
      phases: ["I", "II", "III", "IV"],
    };
    expect(CitySchema.safeParse(validCity).success).toBe(true);

    const invalidCity = {
      ...validCity,
      phases: [], // must have at least 1 phase
    };
    expect(CitySchema.safeParse(invalidCity).success).toBe(false);
  });

  it("validates LineSchema color hex codes", () => {
    const validLine = {
      id: "del-yellow",
      name: "Yellow Line",
      city: "Delhi",
      color: "#FFD700",
      operator: "DMRC",
    };
    expect(LineSchema.safeParse(validLine).success).toBe(true);

    const invalidLine = {
      ...validLine,
      color: "yellow", // not a hex code
    };
    expect(LineSchema.safeParse(invalidLine).success).toBe(false);
  });

  it("enforces conditional date rules for operational segments", () => {
    const operationalSegmentProps = {
      segment_id: "test-seg-1",
      line_id: "del-yellow",
      line_name: "Yellow Line",
      city: "Delhi",
      operator: "DMRC",
      status: "operational",
      phase: "I",
      length_km: 10,
      gauge: "broad",
      inaugurated_on: "2004-12-20",
      expected_completion: null,
      stations_count: 5,
      color: "#FFD700",
      source: "mock",
      last_verified: "2026-10-05",
    };

    expect(SegmentPropertiesSchema.safeParse(operationalSegmentProps).success).toBe(true);

    // Missing inaugurated_on should fail
    const missingInaugurated = {
      ...operationalSegmentProps,
      inaugurated_on: null,
    };
    expect(SegmentPropertiesSchema.safeParse(missingInaugurated).success).toBe(false);

    // Having expected_completion when operational should fail
    const hasExpected = {
      ...operationalSegmentProps,
      expected_completion: "2027",
    };
    expect(SegmentPropertiesSchema.safeParse(hasExpected).success).toBe(false);
  });

  it("enforces conditional date rules for construction segments", () => {
    const constructionSegmentProps = {
      segment_id: "test-seg-2",
      line_id: "del-silver",
      line_name: "Silver Line",
      city: "Delhi",
      operator: "DMRC",
      status: "construction",
      phase: "IV",
      length_km: 15,
      gauge: "standard",
      inaugurated_on: null,
      expected_completion: "2026-12",
      stations_count: 8,
      color: "#A0A0A0",
      source: "mock",
      last_verified: "2026-10-05",
    };

    expect(SegmentPropertiesSchema.safeParse(constructionSegmentProps).success).toBe(true);

    // Missing expected_completion should fail
    const missingExpected = {
      ...constructionSegmentProps,
      expected_completion: null,
    };
    expect(SegmentPropertiesSchema.safeParse(missingExpected).success).toBe(false);

    // Having inaugurated_on when under construction should fail
    const hasInaugurated = {
      ...constructionSegmentProps,
      inaugurated_on: "2024-01-01",
    };
    expect(SegmentPropertiesSchema.safeParse(hasInaugurated).success).toBe(false);
  });

  it("validates SegmentFeature coordinate geometry", () => {
    const validFeature = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [77.2, 28.6],
          [77.25, 28.65],
        ],
      },
      properties: {
        segment_id: "test-seg",
        line_id: "test-line",
        line_name: "Test Line",
        city: "Delhi",
        operator: "DMRC",
        status: "planned",
        phase: "IV",
        length_km: 5.5,
        gauge: "standard",
        inaugurated_on: null,
        expected_completion: "2029",
        stations_count: 3,
        color: "#123456",
        source: "mock",
        last_verified: "2026-10-05",
      },
    };

    expect(SegmentFeatureSchema.safeParse(validFeature).success).toBe(true);

    // LineString with only 1 coordinate should fail
    const singleCoord = {
      ...validFeature,
      geometry: {
        type: "LineString",
        coordinates: [[77.2, 28.6]],
      },
    };
    expect(SegmentFeatureSchema.safeParse(singleCoord).success).toBe(false);
  });

  it("validates StationFeature schema and interchange property", () => {
    const validStation = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [77.2185, 28.6328],
      },
      properties: {
        station_id: "del-rajiv-chowk",
        name: "Rajiv Chowk",
        city: "Delhi",
        line_ids: ["del-yellow", "del-blue"],
        status: "operational",
        phase: "I",
        is_interchange: true,
        opened_on: "2005-07-03",
        expected_completion: null,
        layout: "underground",
        source: "mock",
        last_verified: "2026-10-05",
      },
    };

    expect(StationFeatureSchema.safeParse(validStation).success).toBe(true);
  });

  it("validates dynamic per-city phase constraints in validateMetroDataset", () => {
    const testCities = [
      {
        id: "delhi",
        name: "Delhi",
        bbox: [76.84, 28.4, 77.35, 28.88] as [number, number, number, number],
        operator: "DMRC",
        phases: ["I", "II"],
      },
    ];

    const testLines = [
      {
        id: "del-yellow",
        name: "Yellow Line",
        city: "Delhi",
        color: "#FFD700",
        operator: "DMRC",
      },
    ];

    const testSegments = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [77.2, 28.6],
              [77.21, 28.61],
            ],
          },
          properties: {
            segment_id: "del-invalid-phase",
            line_id: "del-yellow",
            line_name: "Yellow Line",
            city: "Delhi",
            operator: "DMRC",
            status: "planned",
            phase: "Phase-Unknown", // Not in ["I", "II"]
            length_km: 1.5,
            gauge: "standard",
            inaugurated_on: null,
            expected_completion: "2030",
            stations_count: 2,
            color: "#FFD700",
            source: "mock",
            last_verified: "2026-10-05",
          },
        },
      ],
    };

    const testStations = {
      type: "FeatureCollection",
      features: [],
    };

    const result = validateMetroDataset({
      cities: testCities,
      lines: testLines,
      segments: testSegments,
      stations: testStations,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Phase-Unknown"))).toBe(true);
  });
});
