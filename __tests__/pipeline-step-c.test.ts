import { describe, it, expect } from "vitest";
import { mergeCityOverrides, type CityOverrideData } from "@/scripts/pipeline/merge-overrides";
import { runAudit } from "@/scripts/audit/audit-engine";
import type { NormalizedCityData } from "@/scripts/pipeline/normalize";
import type { City, Line } from "@/types/metro";

describe("Step C Pipeline Code & Rules", () => {
  const baseCityOverride: CityOverrideData = {
    city: {
      id: "testcity",
      name: "Test City",
      bbox: [77.0, 28.0, 77.5, 28.5],
      operator: "Primary Operator",
      phases: ["Phase 1", "Phase 2"],
    },
    lines: [
      {
        id: "test-line-1",
        name: "Line 1",
        city: "Test City",
        city_id: "testcity",
        color: "#FF0000",
        operator: "Line 1 Specific Operator",
        source: "osm+test",
      },
      {
        id: "test-line-2",
        name: "Line 2",
        city: "Test City",
        city_id: "testcity",
        color: "#0000FF",
        operator: "Line 2 Specific Operator",
        source: "osm+test",
      },
    ],
    segments: [],
  };

  it("1. Requirement: stations_count has no default (fails if uncomputable)", () => {
    const overrides: CityOverrideData = {
      ...baseCityOverride,
      segments: [
        {
          segment_id: "test-seg-1",
          line_id: "test-line-1",
          line_name: "Line 1",
          phase: "Phase 1",
          status: "operational",
          gauge: "standard",
          inaugurated_on: "2024-01-01",
          expected_completion: null,
          color: "#FF0000",
          coordinates: [
            [77.1, 28.1],
            [77.2, 28.2],
          ],
          last_verified: "2026-10-01",
          // stations_count not provided, and no stations exist near this segment
        },
      ],
    };

    const emptyNormalized: NormalizedCityData = {
      cityId: "testcity",
      cityName: "Test City",
      segments: [],
      stations: [],
    };

    expect(() => mergeCityOverrides(emptyNormalized, overrides)).toThrow(
      /stations_count could not be computed/
    );
  });

  it("1a. Requirement: construction/planned segments with 0 nearby stations are allowed", () => {
    const overrides: CityOverrideData = {
      ...baseCityOverride,
      segments: [
        {
          segment_id: "test-seg-construction",
          line_id: "test-line-1",
          line_name: "Line 1",
          phase: "Phase 2",
          status: "construction",
          gauge: "standard",
          inaugurated_on: null,
          expected_completion: null,
          completion_unconfirmed: true,
          color: "#FF0000",
          coordinates: [
            [77.1, 28.1],
            [77.2, 28.2],
          ],
          last_verified: "2026-10-01",
          // No stations_count, no stations nearby — allowed for non-operational
        },
      ],
    };

    const emptyNormalized: NormalizedCityData = {
      cityId: "testcity",
      cityName: "Test City",
      segments: [],
      stations: [],
    };

    const { segments } = mergeCityOverrides(emptyNormalized, overrides);
    expect(segments[0].properties.stations_count).toBe(0);
  });


  it("2. Requirement: stations_count is derived from deduplicated assigned stations along segment", () => {
    const overrides: CityOverrideData = {

      ...baseCityOverride,
      segments: [
        {
          segment_id: "test-seg-1",
          line_id: "test-line-1",
          line_name: "Line 1",
          phase: "Phase 1",
          status: "operational",
          gauge: "standard",
          inaugurated_on: "2024-01-01",
          expected_completion: null,
          color: "#FF0000",
          coordinates: [
            [77.1, 28.1],
            [77.2, 28.2],
          ],
          last_verified: "2026-10-01",
        },
      ],
    };

    const normalized: NormalizedCityData = {
      cityId: "testcity",
      cityName: "Test City",
      segments: [],
      stations: [
        {
          osmId: 101,
          name: "Station Alpha",
          coordinates: [77.1001, 28.1001], // On seg 1
          tags: {},
          lineRefs: [],
        },
        {
          osmId: 102,
          name: "Station Beta",
          coordinates: [77.1501, 28.1501], // On seg 1
          tags: {},
          lineRefs: [],
        },
      ],
    };

    const { segments } = mergeCityOverrides(normalized, overrides);
    expect(segments[0].properties.stations_count).toBe(2);
  });

  it("3. Requirement: opened_on is null by default on operational stations (2006-11-11 placeholder removed)", () => {
    const overrides: CityOverrideData = {
      ...baseCityOverride,
      segments: [
        {
          segment_id: "test-seg-1",
          line_id: "test-line-1",
          line_name: "Line 1",
          phase: "Phase 1",
          status: "operational",
          gauge: "standard",
          inaugurated_on: "2024-01-01",
          expected_completion: null,
          color: "#FF0000",
          coordinates: [
            [77.1, 28.1],
            [77.2, 28.2],
          ],
          last_verified: "2026-10-01",
        },
      ],
    };

    const normalized: NormalizedCityData = {
      cityId: "testcity",
      cityName: "Test City",
      segments: [],
      stations: [
        {
          osmId: 101,
          name: "Station Alpha",
          coordinates: [77.1001, 28.1001],
          tags: {},
          lineRefs: [],
        },
      ],
    };

    const { stations } = mergeCityOverrides(normalized, overrides);
    expect(stations[0].properties.opened_on).toBeNull();
  });

  it("4. Requirement: last_verified is null for OSM-sourced stations, and retrieved_at is populated from cache", () => {
    const overrides: CityOverrideData = {
      ...baseCityOverride,
      segments: [
        {
          segment_id: "test-seg-1",
          line_id: "test-line-1",
          line_name: "Line 1",
          phase: "Phase 1",
          status: "operational",
          gauge: "standard",
          inaugurated_on: "2024-01-01",
          expected_completion: null,
          color: "#FF0000",
          coordinates: [
            [77.1, 28.1],
            [77.2, 28.2],
          ],
          last_verified: "2026-10-01",
        },
      ],
    };

    const normalized: NormalizedCityData = {
      cityId: "testcity",
      cityName: "Test City",
      segments: [],
      stations: [
        {
          osmId: 101,
          name: "Station Alpha",
          coordinates: [77.1001, 28.1001],
          tags: {},
          lineRefs: [],
        },
      ],
    };

    const retrievedDate = "2026-09-20";
    const { stations } = mergeCityOverrides(normalized, overrides, retrievedDate);
    expect(stations[0].properties.last_verified).toBeNull();
    expect(stations[0].properties.retrieved_at).toBe("2026-09-20");
  });

  it("5. Requirement: Segment inherits operator from parent line", () => {
    const overrides: CityOverrideData = {
      ...baseCityOverride,
      segments: [
        {
          segment_id: "test-seg-1",
          line_id: "test-line-1",
          line_name: "Line 1",
          phase: "Phase 1",
          status: "operational",
          gauge: "standard",
          inaugurated_on: "2024-01-01",
          expected_completion: null,
          color: "#FF0000",
          coordinates: [
            [77.1, 28.1],
            [77.2, 28.2],
          ],
          stations_count: 2,
          last_verified: "2026-10-01",
        },
        {
          segment_id: "test-seg-2",
          line_id: "test-line-2",
          line_name: "Line 2",
          phase: "Phase 1",
          status: "operational",
          gauge: "standard",
          inaugurated_on: "2024-01-01",
          expected_completion: null,
          color: "#0000FF",
          coordinates: [
            [77.3, 28.3],
            [77.4, 28.4],
          ],
          stations_count: 2,
          last_verified: "2026-10-01",
        },
      ],
    };

    const normalized: NormalizedCityData = {
      cityId: "testcity",
      cityName: "Test City",
      segments: [],
      stations: [],
    };

    const { segments } = mergeCityOverrides(normalized, overrides);
    expect(segments[0].properties.operator).toBe("Line 1 Specific Operator");
    expect(segments[1].properties.operator).toBe("Line 2 Specific Operator");
  });

  it("6. Requirement: Schematic connectors generated for construction stretches lacking geometry, but prohibited on operational", () => {
    const overrides: CityOverrideData = {
      ...baseCityOverride,
      segments: [
        {
          segment_id: "test-seg-construction",
          line_id: "test-line-1",
          line_name: "Line 1",
          phase: "Phase 2",
          status: "construction",
          gauge: "standard",
          inaugurated_on: null,
          expected_completion: "2027-12",
          color: "#FF0000",
          references: ["https://example.com/ref"],
          last_verified: "2026-10-01",
          // No coordinates given
        },
      ],
      stationOverrides: {
        "Station C1": {
          line_ids: ["test-line-1"],
          phase: "Phase 2",
          status: "construction",
        },
        "Station C2": {
          line_ids: ["test-line-1"],
          phase: "Phase 2",
          status: "construction",
        },
      },
    };

    const normalized: NormalizedCityData = {
      cityId: "testcity",
      cityName: "Test City",
      segments: [],
      stations: [
        {
          osmId: 201,
          name: "Station C1",
          coordinates: [77.1, 28.1],
          tags: {},
          lineRefs: [],
        },
        {
          osmId: 202,
          name: "Station C2",
          coordinates: [77.2, 28.2],
          tags: {},
          lineRefs: [],
        },
      ],
    };

    const { segments } = mergeCityOverrides(normalized, overrides);
    expect(segments).toHaveLength(1);
    expect(segments[0].properties.geometry_quality).toBe("schematic");
    expect(segments[0].geometry.coordinates).toHaveLength(2);

    // Now test that operational segment without coordinates throws error
    const operationalOverrides: CityOverrideData = {
      ...baseCityOverride,
      segments: [
        {
          segment_id: "test-seg-operational",
          line_id: "test-line-1",
          line_name: "Line 1",
          phase: "Phase 1",
          status: "operational",
          gauge: "standard",
          inaugurated_on: "2024-01-01",
          expected_completion: null,
          color: "#FF0000",
          last_verified: "2026-10-01",
        },
      ],
    };

    expect(() => mergeCityOverrides(normalized, operationalOverrides)).toThrow(
      /Operational segment 'test-seg-operational' has no geometry coordinates/
    );
  });

  it("7. Requirement: Audit rule line-operator-matches-reference flags operator mismatch against reference", () => {
    const cities: City[] = [
      {
        id: "delhi",
        name: "Delhi",
        bbox: [76.84, 28.4, 77.35, 28.88],
        operator: "DMRC",
        phases: ["I", "II"],
      },
    ];

    const lines: Line[] = [
      {
        id: "del-red",
        name: "Red Line",
        city_id: "delhi",
        city: "Delhi",
        color: "#FF0000",
        operator: "Wrong Operator", // Mismatch against reference (DMRC)
        source: "osm",
      },
    ];

    const result = runAudit({
      cities,
      lines,
      segments: { type: "FeatureCollection", features: [] },
      stations: { type: "FeatureCollection", features: [] },
    });

    const operatorFinding = result.findings.find(
      (f) => f.rule === "line-operator-matches-reference" && f.subject === "del-red"
    );
    expect(operatorFinding).toBeDefined();
    expect(operatorFinding?.severity).toMatch(/^(warn|error)$/);
    expect(operatorFinding?.message).toContain("Wrong Operator");
  });

  it("8. Requirement: Audit rule out-of-scope-station flags excluded stations present in dataset", () => {
    const cities: City[] = [
      {
        id: "delhi",
        name: "Delhi",
        bbox: [76.84, 28.4, 77.35, 28.88],
        operator: "DMRC",
        phases: ["I"],
      },
    ];

    const lines: Line[] = [
      {
        id: "del-red",
        name: "Red Line",
        city_id: "delhi",
        city: "Delhi",
        color: "#FF0000",
        operator: "DMRC",
        source: "osm",
      },
    ];

    const stations = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [77.1, 28.5] as [number, number],
          },
          properties: {
            station_id: "del-belvedere-towers",
            name: "Belvedere Towers",
            city_id: "delhi",
            city: "Delhi",
            line_ids: ["del-red"],
            status: "operational" as const,
            phase: "I",
            is_interchange: false,
            opened_on: null,
            expected_completion: null,
            layout: "elevated" as const,
            source: "osm",
            last_verified: null,
          },
        },
      ],
    };

    const result = runAudit(
      {
        cities,
        lines,
        segments: { type: "FeatureCollection", features: [] },
        stations,
      },
      {
        outOfScopeStations: {
          delhi: ["del-belvedere-towers"],
        },
      }
    );

    const outOfScopeFinding = result.findings.find(
      (f) => f.rule === "out-of-scope-station" && f.subject === "del-belvedere-towers"
    );
    expect(outOfScopeFinding).toBeDefined();
    expect(outOfScopeFinding?.severity).toBe("error");
    expect(outOfScopeFinding?.message).toContain("marked out of scope");
  });
});
