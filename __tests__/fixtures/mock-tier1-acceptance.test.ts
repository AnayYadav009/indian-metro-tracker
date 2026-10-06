import { describe, it, expect } from "vitest";
import { validateMetroDataset } from "@/lib/data-validator";

const mockTier1Dataset: Parameters<typeof validateMetroDataset>[0] = {
  cities: [
    {
      id: "delhi",
      name: "Delhi",
      bbox: [76.84, 28.4, 77.35, 28.88],
      operator: "DMRC",
      phases: ["Phase 1", "Phase 2", "Phase 3"],
    },
    {
      id: "bengaluru",
      name: "Bengaluru",
      bbox: [77.45, 12.85, 77.75, 13.15],
      operator: "BMRCL",
      phases: ["Phase 1", "Phase 2"],
    },
    {
      id: "mumbai",
      name: "Mumbai",
      bbox: [72.75, 18.88, 73.0, 19.3],
      operator: "MMRDA",
      phases: ["Phase 1", "Phase 2"],
    },
  ],
  lines: [
    {
      id: "del-red",
      name: "Red Line",
      city_id: "delhi",
      city: "Delhi",
      color: "#FF4040",
      operator: "DMRC",
    },
    {
      id: "blr-purple",
      name: "Purple Line",
      city_id: "bengaluru",
      city: "Bengaluru",
      color: "#800080",
      operator: "BMRCL",
    },
    {
      id: "mum-line-1",
      name: "Line 1",
      city_id: "mumbai",
      city: "Mumbai",
      color: "#0000FF",
      operator: "MMRDA",
    },
  ],
  segments: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.2, 28.6],
            [77.25, 28.65],
          ],
        },
        properties: {
          segment_id: "del-red-seg-01",
          line_id: "del-red",
          line_name: "Red Line",
          city_id: "delhi",
          city: "Delhi",
          operator: "DMRC",
          status: "operational",
          phase: "Phase 1",
          length_km: 8.5,
          gauge: "broad",
          inaugurated_on: "2002-12-24",
          expected_completion: null,
          stations_count: 6,
          color: "#FF4040",
          source: "mock",
          last_verified: "2026-10-05",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.25, 28.65],
            [77.3, 28.7],
          ],
        },
        properties: {
          segment_id: "del-red-seg-02",
          line_id: "del-red",
          line_name: "Red Line",
          city_id: "delhi",
          city: "Delhi",
          operator: "DMRC",
          status: "operational",
          phase: "Phase 2",
          length_km: 9.1,
          gauge: "broad",
          inaugurated_on: "2008-06-04",
          expected_completion: null,
          stations_count: 7,
          color: "#FF4040",
          source: "mock",
          last_verified: "2026-10-05",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.5, 12.9],
            [77.6, 13.0],
          ],
        },
        properties: {
          segment_id: "blr-purple-seg-01",
          line_id: "blr-purple",
          line_name: "Purple Line",
          city_id: "bengaluru",
          city: "Bengaluru",
          operator: "BMRCL",
          status: "construction",
          phase: "Phase 2",
          length_km: 12.0,
          gauge: "standard",
          inaugurated_on: null,
          expected_completion: "2026-12",
          stations_count: 8,
          color: "#800080",
          source: "mock",
          last_verified: "2026-10-05",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.6, 13.0],
            [77.7, 13.1],
          ],
        },
        properties: {
          segment_id: "blr-purple-seg-02",
          line_id: "blr-purple",
          line_name: "Purple Line",
          city_id: "bengaluru",
          city: "Bengaluru",
          operator: "BMRCL",
          status: "construction",
          phase: "Phase 2",
          length_km: 10.5,
          gauge: "standard",
          inaugurated_on: null,
          expected_completion: "2027",
          stations_count: 6,
          color: "#800080",
          source: "mock",
          last_verified: "2026-10-05",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [72.8, 19.0],
            [72.9, 19.1],
          ],
        },
        properties: {
          segment_id: "mum-line1-seg-01",
          line_id: "mum-line-1",
          line_name: "Line 1",
          city_id: "mumbai",
          city: "Mumbai",
          operator: "MMRDA",
          status: "planned",
          phase: "Phase 2",
          length_km: 11.2,
          gauge: "standard",
          inaugurated_on: null,
          expected_completion: "2028",
          stations_count: 8,
          color: "#0000FF",
          source: "mock",
          last_verified: "2026-10-05",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [72.9, 19.1],
            [73.0, 19.2],
          ],
        },
        properties: {
          segment_id: "mum-line1-seg-02",
          line_id: "mum-line-1",
          line_name: "Line 1",
          city_id: "mumbai",
          city: "Mumbai",
          operator: "MMRDA",
          status: "planned",
          phase: "Phase 2",
          length_km: 7.8,
          gauge: "standard",
          inaugurated_on: null,
          expected_completion: "2029",
          stations_count: 5,
          color: "#0000FF",
          source: "mock",
          last_verified: "2026-10-05",
        },
      },
    ],
  },
  stations: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [77.2, 28.6],
        },
        properties: {
          station_id: "del-kashmere-gate",
          name: "Kashmere Gate",
          city_id: "delhi",
          city: "Delhi",
          line_ids: ["del-red"],
          is_interchange: true,
          layout: "underground",
          status: "operational",
          phase: "Phase 1",
          opened_on: "2002-12-24",
          expected_completion: null,
          source: "mock",
          last_verified: "2026-10-05",
        },
      },
    ],
  },
};

describe("Mock Dataset Fixtures Acceptance Criteria", () => {
  const result = validateMetroDataset(mockTier1Dataset);

  it("validates that mock dataset contains only allowed Tier-1 cities", () => {
    expect(result.valid).toBe(true);
    const cities = result.dataset?.cities.map((c) => c.id.toLowerCase()) || [];
    expect(cities).toContain("delhi");
    expect(cities).toContain("bengaluru");
    expect(cities).toContain("mumbai");

    const tier1Allowed = [
      "delhi",
      "bengaluru",
      "mumbai",
      "chennai",
      "kolkata",
      "hyderabad",
    ];
    cities.forEach((c) => {
      expect(tier1Allowed).toContain(c);
    });
  });

  it("validates that mock dataset contains at least 2 segments per status", () => {
    const segments = result.dataset?.segments.features || [];
    const operational = segments.filter((s) => s.properties.status === "operational");
    const construction = segments.filter((s) => s.properties.status === "construction");
    const planned = segments.filter((s) => s.properties.status === "planned");

    expect(operational.length).toBeGreaterThanOrEqual(2);
    expect(construction.length).toBeGreaterThanOrEqual(2);
    expect(planned.length).toBeGreaterThanOrEqual(2);
  });

  it("validates that all records in mock dataset have source 'mock'", () => {
    const segments = result.dataset?.segments.features || [];
    const stations = result.dataset?.stations.features || [];

    segments.forEach((s) => expect(s.properties.source).toBe("mock"));
    stations.forEach((s) => expect(s.properties.source).toBe("mock"));
  });
});
