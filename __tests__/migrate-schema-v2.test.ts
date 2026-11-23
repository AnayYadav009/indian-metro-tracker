import { describe, it, expect } from "vitest";
import { migrateDatasetV2 } from "../scripts/migrate-schema-v2";
import { validateMetroDataset } from "../lib/data-validator";

describe("M9 Schema Migration (migrateDatasetV2)", () => {
  const sampleV1Dataset = {
    cities: [
      {
        id: "delhi",
        name: "Delhi",
        bbox: [76.84, 28.4, 77.35, 28.88],
        operator: "DMRC",
        phases: ["I", "II", "III", "IV"],
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
        source: "osm+dmrc",
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
              [77.1234567, 28.1234567],
              [77.2345678, 28.2345678],
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
            phase: "I",
            length_km: 15.5,
            gauge: "broad",
            inaugurated_on: "2002-12-24",
            expected_completion: null,
            stations_count: 10,
            color: "#FF4040",
            source: "osm",
            references: [],
            last_verified: null,
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
            coordinates: [77.1234567, 28.1234567],
          },
          properties: {
            station_id: "del-rithala",
            name: "Rithala",
            city_id: "delhi",
            city: "Delhi",
            line_ids: ["del-red"],
            status: "operational",
            phase: "I",
            is_interchange: false,
            opened_on: "2004-03-31",
            expected_completion: null,
            layout: "elevated",
            source: "osm",
            last_verified: null,
          },
        },
      ],
    },
  };

  it("adds default tier: 1 to cities without tier", () => {
    const result = migrateDatasetV2(sampleV1Dataset, { currentDate: "2026-10-07" });
    expect(result.cities[0].tier).toBe(1);
    expect(result.cities[0].retrieved_at).toBe("2026-10-07");
  });

  it("preserves explicit tier and network_id when present", () => {
    const custom = {
      ...sampleV1Dataset,
      cities: [
        {
          ...sampleV1Dataset.cities[0],
          tier: 2 as const,
          network_id: "delhi-ncr",
        },
      ],
    };
    const result = migrateDatasetV2(custom, { currentDate: "2026-10-07" });
    expect(result.cities[0].tier).toBe(2);
    expect(result.cities[0].network_id).toBe("delhi-ncr");
  });

  it("truncates coordinate points to 5 decimals", () => {
    const result = migrateDatasetV2(sampleV1Dataset, { currentDate: "2026-10-07" });
    const segCoords = result.segments.features[0].geometry.coordinates;
    expect(segCoords[0]).toEqual([77.12346, 28.12346]);
    expect(segCoords[1]).toEqual([77.23457, 28.23457]);

    const stCoords = result.stations.features[0].geometry.coordinates;
    expect(stCoords).toEqual([77.12346, 28.12346]);
  });

  it("preserves optional segment official_length_km and station segment_id", () => {
    const custom = {
      ...sampleV1Dataset,
      segments: {
        type: "FeatureCollection",
        features: [
          {
            ...sampleV1Dataset.segments.features[0],
            properties: {
              ...sampleV1Dataset.segments.features[0].properties,
              official_length_km: 15.6,
            },
          },
        ],
      },
      stations: {
        type: "FeatureCollection",
        features: [
          {
            ...sampleV1Dataset.stations.features[0],
            properties: {
              ...sampleV1Dataset.stations.features[0].properties,
              segment_id: "del-red-seg-01",
            },
          },
        ],
      },
    };

    const result = migrateDatasetV2(custom, { currentDate: "2026-10-07" });
    expect(result.segments.features[0].properties.official_length_km).toBe(15.6);
    expect(result.stations.features[0].properties.segment_id).toBe("del-red-seg-01");
  });

  it("migrated dataset passes full Zod and relational validation", () => {
    const result = migrateDatasetV2(sampleV1Dataset, { currentDate: "2026-10-07" });
    const validation = validateMetroDataset(result);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });
});
