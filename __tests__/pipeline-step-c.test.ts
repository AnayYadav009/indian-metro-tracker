import { describe, it, expect } from "vitest";
import { mergeCityOverrides, type CityOverrideData } from "@/scripts/pipeline/merge-overrides";
import { normalizeOverpassCity, type NormalizedCityData } from "@/scripts/pipeline/normalize";
import { runAudit } from "@/scripts/audit/audit-engine";
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

  it("10. Requirement: twin-track ways merge into a single centreline in relation normalization", () => {
    const rawRelationData = {
      elements: [
        {
          type: "relation",
          id: 999999,
          tags: {
            route: "subway",
            name: "Test Metro Line",
            operator: "Test Metro Operator",
          },
          members: [
            // Direction 1 track: A -> B
            {
              type: "way",
              ref: 101,
              role: "",
              geometry: [
                { lat: 18.50, lon: 73.80 },
                { lat: 18.55, lon: 73.82 },
              ],
            },
            // Direction 2 track (side-by-side, ~20m apart)
            {
              type: "way",
              ref: 102,
              role: "platform", // platform way should be filtered out
              geometry: [
                { lat: 18.5001, lon: 73.8001 },
                { lat: 18.5501, lon: 73.8201 },
              ],
            },
            // Contiguous continuation of Direction 1 track: B -> C
            {
              type: "way",
              ref: 103,
              role: "",
              geometry: [
                { lat: 18.55, lon: 73.82 },
                { lat: 18.60, lon: 73.84 },
              ],
            },
          ],
        },
      ],
    };

    const normalized = normalizeOverpassCity("testcity", rawRelationData);

    // Platform way (ref 102) should be excluded, leaving a single continuous centreline (101 + 103)
    expect(normalized.segments.length).toBe(1);
    const seg = normalized.segments[0];
    expect(seg.coordinates.length).toBe(3); // [73.80, 18.50] -> [73.82, 18.55] -> [73.84, 18.60]
    expect(seg.coordinates[0]).toEqual([73.80, 18.50]);
    expect(seg.coordinates[2]).toEqual([73.84, 18.60]);
  });

  it("collapses a documented shared track section to a midpoint and counts it once", () => {
    const overrides: CityOverrideData = {
      ...baseCityOverride,
      segments: [
        {
          segment_id: "phase-3",
          line_id: "test-line-1",
          line_name: "Line 1",
          phase: "Phase 1",
          status: "operational",
          gauge: "standard",
          inaugurated_on: "2024-01-01",
          expected_completion: null,
          color: "#FF0000",
          stations_count: 2,
          last_verified: "2026-10-19",
          references: ["https://example.com/route-map"],
          coordinates: [[77.1, 28.1], [77.11, 28.1], [77.12, 28.1]],
        },
        {
          segment_id: "phase-4",
          line_id: "test-line-1",
          line_name: "Line 1",
          phase: "Phase 2",
          status: "operational",
          gauge: "standard",
          inaugurated_on: "2024-01-01",
          expected_completion: null,
          color: "#FF0000",
          stations_count: 2,
          last_verified: "2026-10-19",
          references: ["https://example.com/route-map"],
          coordinates: [[77.1, 28.10018], [77.11, 28.10018], [77.12, 28.10018], [77.13, 28.1]],
        },
      ],
      centerlineSections: [{
        primary_segment_id: "phase-3",
        secondary_segment_id: "phase-4",
        primary_start: [77.11, 28.1],
        secondary_start: [77.11, 28.10018],
        primary_end: [77.12, 28.1],
        secondary_end: [77.12, 28.10018],
        source_urls: ["https://example.com/route-map"],
        reason: "The source map shows the two phases using the same approach track.",
      }],
    };
    const result = mergeCityOverrides(
      { cityId: "testcity", cityName: "Test City", segments: [], stations: [] },
      overrides
    );
    const phase3 = result.segments.find((segment) => segment.properties.segment_id === "phase-3")!;
    const phase4 = result.segments.find((segment) => segment.properties.segment_id === "phase-4")!;
    const phase3Midpoint = phase3.geometry.coordinates.find(
      ([, lat]) => Math.abs(lat - 28.10009) < 0.00002
    );

    expect(phase3Midpoint).toBeDefined();
    expect(phase4.geometry.coordinates.at(-1)?.[1]).toBeCloseTo(28.10009, 4);
    expect(phase4.properties.length_km).toBeLessThan(phase3.properties.length_km);

    const divergingOverrides = structuredClone(overrides);
    divergingOverrides.segments[1].coordinates = [
      [77.1, 28.10018],
      [77.11, 28.10018],
      [77.115, 28.102],
      [77.12, 28.10018],
      [77.13, 28.1],
    ];
    expect(() => mergeCityOverrides(
      { cityId: "testcity", cityName: "Test City", segments: [], stations: [] },
      divergingOverrides
    )).toThrow(/traces diverge/);
  });

  it("orders relation ways from an explicit source override", () => {
    const raw = {
      elements: [{
        type: "relation", id: 7, tags: { route: "subway", name: "Line" },
        members: [
          { type: "way", ref: 2, role: "", geometry: [{ lat: 0, lon: 2 }, { lat: 0, lon: 1 }] },
          { type: "way", ref: 1, role: "", geometry: [{ lat: 0, lon: 1 }, { lat: 0, lon: 0 }] },
        ],
      }],
    };
    const normalized = normalizeOverpassCity("testcity", raw, {
      7: [{ id: 1, reversed: true }, { id: 2, reversed: true }],
    });
    expect(normalized.segments[0].coordinates).toEqual([[0, 0], [1, 0], [2, 0]]);
  });

  it("counts every inactive relation way omitted during normalization", () => {
    const normalized = normalizeOverpassCity("testcity", {
      elements: [{
        type: "relation",
        id: 77,
        tags: { route: "subway", name: "Inactive corridor" },
        members: [
          { type: "way", ref: 701, role: "inactive", geometry: [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }] },
          { type: "way", ref: 702, role: "inactive", geometry: [{ lat: 1, lon: 0 }, { lat: 1, lon: 1 }] },
          { type: "way", ref: 703, role: "", geometry: [{ lat: 2, lon: 0 }, { lat: 2, lon: 1 }] },
        ],
      }],
    });

    expect(normalized.filteredInactiveWays).toEqual([
      { relationId: 77, wayId: 701 },
      { relationId: 77, wayId: 702 },
    ]);
    expect(normalized.segments).toHaveLength(1);
    expect(normalized.segments[0].coordinates).toEqual([[0, 2], [1, 2]]);
  });

  it("11. Requirement: hairpin spurs and backtracking spikes are pruned from segment polylines", () => {
    const overrides: CityOverrideData = {
      ...baseCityOverride,
      segments: [
        {
          segment_id: "test-hairpin-seg",
          line_id: "test-line-1",
          line_name: "Line 1",
          phase: "Phase 1",
          status: "operational",
          gauge: "standard",
          inaugurated_on: "2024-01-01",
          expected_completion: null,
          color: "#FF0000",
          stations_count: 2,
          // Segment with a 180-degree backtracking spike at vertex 1: (0,0) -> (0, 0.001) -> (0,0) -> (0.01, 0)
          coordinates: [
            [77.10, 28.10],
            [77.10, 28.101], // spike vertex ~111m away
            [77.10, 28.10],
            [77.12, 28.10],
          ],
          last_verified: "2026-10-01",
        },
      ],
    };

    const result = mergeCityOverrides(
      { cityId: "testcity", cityName: "Test City", segments: [], stations: [] },
      overrides
    );

    expect(result.segments.length).toBe(1);
    const coords = result.segments[0].geometry.coordinates;
    // Backtracking spike removed, leaving clean path
    expect(coords.length).toBe(2);
    expect(coords[0]).toEqual([77.10, 28.10]);
    expect(coords[1]).toEqual([77.12, 28.10]);
  });
});


