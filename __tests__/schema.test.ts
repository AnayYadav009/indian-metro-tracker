import { describe, it, expect } from "vitest";
import {
  StatusSchema,
  CitySchema,
  LineSchema,
  SegmentFeatureSchema,
  StationFeatureSchema,
  SegmentPropertiesSchema,
} from "@/types/schema";
import { validateMetroDataset } from "@/lib/data-validator";

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

  it("validates LineSchema color hex codes and requires source", () => {
    const validLine = {
      id: "del-yellow",
      name: "Yellow Line",
      city_id: "delhi",
      city: "Delhi",
      color: "#FFD700",
      operator: "DMRC",
      source: "osm+dmrc",
    };
    expect(LineSchema.safeParse(validLine).success).toBe(true);

    const missingSource = {
      ...validLine,
      source: undefined,
    };
    expect(LineSchema.safeParse(missingSource).success).toBe(false);

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
      city_id: "delhi",
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
      line_id: "del-golden",
      line_name: "Golden Line",
      city_id: "delhi",
      city: "Delhi",
      operator: "DMRC",
      status: "construction",
      phase: "IV",
      length_km: 15,
      gauge: "standard",
      inaugurated_on: null,
      expected_completion: "2026-12",
      stations_count: 8,
      color: "#B8860B",
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
        city_id: "delhi",
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
        city_id: "delhi",
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

    // Missing last_verified must fail
    const missingLastVerified = {
      ...validStation,
      properties: {
        ...validStation.properties,
        last_verified: undefined,
      },
    };
    expect(StationFeatureSchema.safeParse(missingLastVerified).success).toBe(false);

    // Missing source must fail
    const missingSource = {
      ...validStation,
      properties: {
        ...validStation.properties,
        source: undefined,
      },
    };
    expect(StationFeatureSchema.safeParse(missingSource).success).toBe(false);
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
        city_id: "delhi",
        city: "Delhi",
        color: "#FFD700",
        operator: "DMRC",
        source: "osm+dmrc",
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
            city_id: "delhi",
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

  it("rejects record with unrecognized or missing city_id in validateMetroDataset", () => {
    const testCities = [
      {
        id: "delhi",
        name: "Delhi",
        bbox: [76.84, 28.4, 77.35, 28.88] as [number, number, number, number],
        operator: "DMRC",
        phases: ["I", "II"],
      },
    ];

    const unknownCityLines = [
      {
        id: "del-yellow",
        name: "Yellow Line",
        city_id: "atlantis", // Unknown city_id
        city: "Delhi",
        color: "#FFD700",
        operator: "DMRC",
        source: "osm+dmrc",
      },
    ];

    const result = validateMetroDataset({
      cities: testCities,
      lines: unknownCityLines,
      segments: { type: "FeatureCollection", features: [] },
      stations: { type: "FeatureCollection", features: [] },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("unknown city_id 'atlantis'"))).toBe(true);
  });

  it("rejects manual segment when references array is missing or empty", () => {
    const invalidManualProps = {
      segment_id: "test-manual-1",
      line_id: "del-yellow",
      line_name: "Yellow Line",
      city_id: "delhi",
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
      source: "manual",
      references: [], // Empty references must fail
      last_verified: "2026-10-05",
    };

    expect(SegmentPropertiesSchema.safeParse(invalidManualProps).success).toBe(false);

    const validManualProps = {
      ...invalidManualProps,
      references: ["https://example.com/delhi-metro-spec"],
    };
    expect(SegmentPropertiesSchema.safeParse(validManualProps).success).toBe(true);
  });

  it("rejects record where city does not match the name in cities.json for city_id", () => {
    const testCities = [
      {
        id: "delhi",
        name: "Delhi",
        bbox: [76.84, 28.4, 77.35, 28.88] as [number, number, number, number],
        operator: "DMRC",
        phases: ["I", "II"],
      },
    ];

    const mismatchedCityLine = [
      {
        id: "del-yellow",
        name: "Yellow Line",
        city_id: "delhi",
        city: "Mumbai", // Mismatched: city_id is delhi, but city is Mumbai
        color: "#FFD700",
        operator: "DMRC",
        source: "osm+dmrc",
      },
    ];

    const result = validateMetroDataset({
      cities: testCities,
      lines: mismatchedCityLine,
      segments: { type: "FeatureCollection", features: [] },
      stations: { type: "FeatureCollection", features: [] },
    });

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) =>
        e.includes("must match city name 'Delhi' for city_id 'delhi'")
      )
    ).toBe(true);
  });

  it("enforces references validation for non-mock segments with source !== 'osm'", () => {
    const testCities = [
      {
        id: "bengaluru",
        name: "Bengaluru",
        bbox: [77.45, 12.8, 77.78, 13.15] as [number, number, number, number],
        operator: "BMRCL",
        phases: ["1", "2"],
      },
    ];
    const testLines = [
      {
        id: "blr-purple",
        name: "Purple Line",
        city_id: "bengaluru",
        city: "Bengaluru",
        color: "#800080",
        operator: "BMRCL",
        source: "osm+bmrcl",
      },
    ];

    // Construction segment with source osm+bmrcl and NO references: MUST BE ERROR
    const constructionNoRefs = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[77.5, 12.9], [77.51, 12.91]] },
      properties: {
        segment_id: "blr-const-seg",
        line_id: "blr-purple",
        line_name: "Purple Line",
        city_id: "bengaluru",
        city: "Bengaluru",
        operator: "BMRCL",
        status: "construction",
        phase: "2",
        length_km: 2.1,
        gauge: "standard",
        inaugurated_on: null,
        expected_completion: "2027",
        stations_count: 2,
        color: "#800080",
        source: "osm+bmrcl",
        references: [],
        last_verified: "2026-10-06",
      },
    };

    // Operational segment with source osm+bmrcl and NO references: MUST BE WARNING
    const operationalNoRefs = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[77.5, 12.9], [77.51, 12.91]] },
      properties: {
        segment_id: "blr-oper-seg",
        line_id: "blr-purple",
        line_name: "Purple Line",
        city_id: "bengaluru",
        city: "Bengaluru",
        operator: "BMRCL",
        status: "operational",
        phase: "1",
        length_km: 2.1,
        gauge: "standard",
        inaugurated_on: "2015-05-01",
        expected_completion: null,
        stations_count: 2,
        color: "#800080",
        source: "osm+bmrcl",
        references: [],
        last_verified: "2026-10-06",
      },
    };

    const resError = validateMetroDataset({
      cities: testCities,
      lines: testLines,
      segments: { type: "FeatureCollection", features: [constructionNoRefs] },
      stations: { type: "FeatureCollection", features: [] },
    });
    expect(resError.valid).toBe(false);
    expect(resError.errors.some((e) => e.includes("blr-const-seg") && e.includes("references"))).toBe(true);

    const resWarn = validateMetroDataset({
      cities: testCities,
      lines: testLines,
      segments: { type: "FeatureCollection", features: [operationalNoRefs] },
      stations: { type: "FeatureCollection", features: [] },
    });
    expect(resWarn.valid).toBe(true);
    expect(resWarn.warnings.some((w) => w.includes("blr-oper-seg") && w.includes("references"))).toBe(true);
  });

  it("prints a warning for construction segments whose expected_completion is earlier than injected clock date", () => {
    const testCities = [
      {
        id: "delhi",
        name: "Delhi",
        bbox: [76.84, 28.4, 77.35, 28.88] as [number, number, number, number],
        operator: "DMRC",
        phases: ["IV"],
      },
    ];
    const testLines = [
      {
        id: "del-magenta",
        name: "Magenta Line",
        city_id: "delhi",
        city: "Delhi",
        color: "#CC338B",
        operator: "DMRC",
        source: "osm",
      },
    ];

    const staleSegment = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[77.2, 28.6], [77.21, 28.61]] },
      properties: {
        segment_id: "del-stale-seg",
        line_id: "del-magenta",
        line_name: "Magenta Line",
        city_id: "delhi",
        city: "Delhi",
        operator: "DMRC",
        status: "construction",
        phase: "IV",
        length_km: 1.5,
        gauge: "standard",
        inaugurated_on: null,
        expected_completion: "2025-12", // In the past relative to 2026-10-06
        stations_count: 2,
        color: "#CC338B",
        source: "osm",
        references: [],
        last_verified: "2026-10-06",
      },
    };

    // Inject clock: 2026-10-06
    const result = validateMetroDataset(
      {
        cities: testCities,
        lines: testLines,
        segments: { type: "FeatureCollection", features: [staleSegment] },
        stations: { type: "FeatureCollection", features: [] },
      },
      { currentDate: "2026-10-06" }
    );

    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) =>
        w.includes("del-stale-seg") && w.includes("stale expected_completion '2025-12'")
      )
    ).toBe(true);
  });

  it("detects swapped lat/lng coordinates outside India envelope as an error", () => {
    const testCities = [
      {
        id: "delhi",
        name: "Delhi",
        bbox: [76.84, 28.4, 77.35, 28.88] as [number, number, number, number],
        operator: "DMRC",
        phases: ["IV"],
      },
    ];
    const testLines = [
      {
        id: "del-magenta",
        name: "Magenta Line",
        city_id: "delhi",
        city: "Delhi",
        color: "#CC338B",
        operator: "DMRC",
        source: "osm",
      },
    ];

    // Swapped coords: [28.6, 77.2] instead of [77.2, 28.6]
    const swappedSegment = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[28.6, 77.2], [28.61, 77.21]] },
      properties: {
        segment_id: "del-swapped-seg",
        line_id: "del-magenta",
        line_name: "Magenta Line",
        city_id: "delhi",
        city: "Delhi",
        operator: "DMRC",
        status: "operational",
        phase: "IV",
        length_km: 1.5,
        gauge: "standard",
        inaugurated_on: "2020-01-01",
        expected_completion: null,
        stations_count: 2,
        color: "#CC338B",
        source: "osm",
        references: [],
        last_verified: "2026-10-06",
      },
    };

    const swappedStation = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [28.6, 77.2] },
      properties: {
        station_id: "del-swapped-stn",
        name: "Swapped Station",
        city_id: "delhi",
        city: "Delhi",
        line_ids: ["del-magenta"],
        status: "operational",
        phase: "IV",
        is_interchange: false,
        opened_on: "2020-01-01",
        expected_completion: null,
        layout: "underground",
        source: "osm",
        last_verified: "2026-10-06",
      },
    };

    const result = validateMetroDataset({
      cities: testCities,
      lines: testLines,
      segments: { type: "FeatureCollection", features: [swappedSegment] },
      stations: { type: "FeatureCollection", features: [swappedStation] },
    });

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) =>
        e.includes("del-swapped-seg") && e.includes("India coordinate envelope")
      )
    ).toBe(true);
    expect(
      result.errors.some((e) =>
        e.includes("del-swapped-stn") && e.includes("India coordinate envelope")
      )
    ).toBe(true);
  });

  it("issues a warning for coordinates slightly outside city bbox but within India envelope", () => {
    const testCities = [
      {
        id: "delhi",
        name: "Delhi",
        bbox: [76.84, 28.4, 77.35, 28.88] as [number, number, number, number],
        operator: "DMRC",
        phases: ["I"],
      },
    ];
    const testLines = [
      {
        id: "del-red",
        name: "Red Line",
        city_id: "delhi",
        city: "Delhi",
        color: "#E31837",
        operator: "DMRC",
        source: "osm",
      },
    ];

    // Coordinate [77.41, 28.67] is in UP/Ghaziabad, slightly outside maxLng 77.35 + 0.05 (77.40)
    const ncrSegment = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[77.30, 28.67], [77.41, 28.67]] },
      properties: {
        segment_id: "del-ghaziabad-seg",
        line_id: "del-red",
        line_name: "Red Line",
        city_id: "delhi",
        city: "Delhi",
        operator: "DMRC",
        status: "operational",
        phase: "I",
        length_km: 11.0,
        gauge: "broad",
        inaugurated_on: "2002-12-25",
        expected_completion: null,
        stations_count: 5,
        color: "#E31837",
        source: "osm",
        references: [],
        last_verified: "2026-10-06",
      },
    };

    const result = validateMetroDataset({
      cities: testCities,
      lines: testLines,
      segments: { type: "FeatureCollection", features: [ncrSegment] },
      stations: { type: "FeatureCollection", features: [] },
    });

    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) =>
        w.includes("del-ghaziabad-seg") && w.includes("outside city bounding box margin")
      )
    ).toBe(true);
  });
});
