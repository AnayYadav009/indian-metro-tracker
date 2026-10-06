import { describe, it, expect } from "vitest";
import {
  DATA_SOURCE,
  getMetroData,
  getCities,
  getLines,
  getSegments,
  getStations,
  getSegmentById,
  getStationById,
  getDatasetMetadataSummary,
} from "@/lib/data";
import { validateMetroDataset } from "@/lib/data-validator";

describe("Metro Data Loader & Dataset Invariants", () => {
  it("exports a valid DATA_SOURCE ('mock' | 'real' | 'mixed')", () => {
    expect(["mock", "real", "mixed"]).toContain(DATA_SOURCE);
  });

  it("loads the complete metro dataset without error", () => {
    const dataset = getMetroData();
    expect(dataset).toBeDefined();
    expect(dataset.cities.length).toBeGreaterThan(0);
    expect(dataset.lines.length).toBeGreaterThan(0);
    expect(dataset.segments.features.length).toBeGreaterThan(0);
    expect(dataset.stations.features.length).toBeGreaterThan(0);
  });

  it("proves real dataset passes full validateMetroDataset schema and relational rules", () => {
    const dataset = getMetroData();
    const result = validateMetroDataset({
      cities: dataset.cities,
      lines: dataset.lines,
      segments: dataset.segments,
      stations: dataset.stations,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("derives dynamic dataset metadata summary with last verified date and sources", () => {
    const summary = getDatasetMetadataSummary();
    expect(summary).toBeDefined();
    expect(summary.badgeLabel).toMatch(/^Data: [A-Z][a-z]{2} \d{4} \(.+\)$/);
    expect(summary.badgeLabel).not.toContain("MoHUA");
  });

  describe("Dataset Structural & Relational Invariants", () => {
    const dataset = getMetroData();

    it("criterion: at least 2 segments per status (operational, construction, planned)", () => {
      const operational = dataset.segments.features.filter(
        (f) => f.properties.status === "operational"
      );
      const construction = dataset.segments.features.filter(
        (f) => f.properties.status === "construction"
      );
      const planned = dataset.segments.features.filter(
        (f) => f.properties.status === "planned"
      );

      expect(operational.length).toBeGreaterThanOrEqual(2);
      expect(construction.length).toBeGreaterThanOrEqual(2);
      expect(planned.length).toBeGreaterThanOrEqual(2);
    });

    it("criterion: at least 2 phases represented in the dataset", () => {
      const phases = new Set(
        dataset.segments.features.map((f) => f.properties.phase)
      );
      expect(phases.size).toBeGreaterThanOrEqual(2);
    });

    it("criterion: all data records have valid source field", () => {
      for (const segment of dataset.segments.features) {
        if (DATA_SOURCE === "mock") {
          expect(segment.properties.source).toBe("mock");
        } else {
          expect(segment.properties.source).toMatch(/^(osm|manual|mock)/);
        }
      }
      for (const station of dataset.stations.features) {
        if (DATA_SOURCE === "mock") {
          expect(station.properties.source).toBe("mock");
        } else {
          expect(station.properties.source).toMatch(/^(osm|manual|mock)/);
        }
      }
    });

    it("criterion: zero-code-change requirement (adding a city requires only data files)", () => {
      const mockRawData = {
        cities: [
          ...dataset.cities,
          {
            id: "chennai",
            name: "Chennai",
            bbox: [80.1, 12.9, 80.3, 13.2] as [number, number, number, number],
            operator: "CMRL",
            phases: ["Phase 1", "Phase 2"],
          },
        ],
        lines: [
          ...dataset.lines,
          {
            id: "chn-blue",
            name: "Blue Line",
            city_id: "chennai",
            city: "Chennai",
            color: "#0066CC",
            operator: "CMRL",
            source: "mock",
          },
        ],
        segments: {
          type: "FeatureCollection",
          features: [
            ...dataset.segments.features,
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  [80.20, 13.01],
                  [80.25, 13.08],
                ],
              },
              properties: {
                segment_id: "chn-blue-seg-01",
                line_id: "chn-blue",
                line_name: "Blue Line",
                city_id: "chennai",
                city: "Chennai",
                operator: "CMRL",
                status: "operational",
                phase: "Phase 1",
                length_km: 8.5,
                gauge: "standard",
                inaugurated_on: "2015-06-29",
                expected_completion: null,
                stations_count: 7,
                color: "#0066CC",
                source: "mock",
                last_verified: "2026-10-05",
              },
            },
          ],
        },
        stations: dataset.stations,
      };

      const result = validateMetroDataset(mockRawData);
      expect(result.valid).toBe(true);
      expect(result.dataset?.cities.some((c) => c.id === "chennai")).toBe(true);
      expect(
        result.dataset?.segments.features.some(
          (s) => s.properties.segment_id === "chn-blue-seg-01"
        )
      ).toBe(true);
    });
  });

  describe("Query and Filter Utilities", () => {
    it("getCities returns all configured cities", () => {
      const cities = getCities();
      expect(cities.length).toBeGreaterThan(0);
      expect(cities.map((c) => c.name)).toEqual(
        expect.arrayContaining(["Delhi", "Bengaluru", "Mumbai"])
      );
    });

    it("getLines filters lines by city", () => {
      const delhiLines = getLines("Delhi");
      expect(delhiLines.length).toBeGreaterThan(0);
      delhiLines.forEach((l) => expect(l.city).toBe("Delhi"));

      const blrLines = getLines("bengaluru");
      expect(blrLines.length).toBeGreaterThan(0);
      blrLines.forEach((l) => expect(l.city).toBe("Bengaluru"));
    });

    it("getSegments filters by city and status", () => {
      const delhiOperational = getSegments({
        city: "Delhi",
        status: "operational",
      });
      expect(delhiOperational.length).toBeGreaterThan(0);
      delhiOperational.forEach((s) => {
        expect(s.properties.city).toBe("Delhi");
        expect(s.properties.status).toBe("operational");
      });
    });

    it("getStations filters by interchange and city", () => {
      const interchanges = getStations({ isInterchange: true });
      expect(interchanges.length).toBeGreaterThan(0);
      interchanges.forEach((st) => {
        expect(st.properties.is_interchange).toBe(true);
      });
    });

    it("finds individual segment and station by id", () => {
      const segment = getSegmentById("del-yellow-seg-01");
      expect(segment).toBeDefined();
      expect(segment?.properties.line_name).toBe("Yellow Line");

      const station = getStationById("del-rajiv-chowk");
      expect(station).toBeDefined();
      expect(station?.properties.name).toBe("Rajiv Chowk");
    });
  });
});
