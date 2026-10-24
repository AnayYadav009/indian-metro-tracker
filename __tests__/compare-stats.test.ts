import { describe, it, expect } from "vitest";
import {
  getCityCompareStats,
  getNationwideTotals,
  calculateCityCompareStats,
  calculateNationwideTotals,
  TIER_1_CITY_IDS,
} from "@/lib/compare-stats";
import { getMetroData } from "@/lib/data";

describe("M14 Compare Stats Calculation", () => {
  it("processes all 21 cities in dataset", () => {
    const stats = getCityCompareStats();
    expect(stats).toHaveLength(21);
    const cityIds = stats.map((s) => s.cityId);
    expect(cityIds).toContain("delhi");
    expect(cityIds).toContain("mumbai");
    expect(cityIds).toContain("bengaluru");
    expect(cityIds).toContain("surat");
    expect(cityIds).toContain("patna");
    expect(cityIds).toContain("agra");
  });

  it("calculates nationwide totals that exactly match map network stats and GeoJSON features", () => {
    const totals = getNationwideTotals();
    const dataset = getMetroData();

    // Sum operational, construction, and planned length directly from segments
    let directOpKm = 0;
    let directConstKm = 0;
    let directPlanKm = 0;
    for (const f of dataset.segments.features) {
      if (f.properties.status === "operational") directOpKm += f.properties.length_km;
      else if (f.properties.status === "construction") directConstKm += f.properties.length_km;
      else if (f.properties.status === "planned") directPlanKm += f.properties.length_km;
    }

    expect(totals.operationalKm).toBe(Math.round(directOpKm * 10) / 10);
    expect(totals.constructionKm).toBe(Math.round(directConstKm * 10) / 10);
    expect(totals.plannedKm).toBe(Math.round(directPlanKm * 10) / 10);
    expect(totals.totalKm).toBe(Math.round((directOpKm + directConstKm + directPlanKm) * 10) / 10);
    expect(totals.linesCount).toBe(dataset.lines.length);
    expect(totals.totalStations).toBe(dataset.stations.features.length);
  });

  it("correctly partitions cities into Tier 1 (6 cities) and Tier 2 (15 cities)", () => {
    const stats = getCityCompareStats();
    const tier1 = stats.filter((s) => s.tier === 1);
    const tier2 = stats.filter((s) => s.tier === 2);

    expect(tier1).toHaveLength(6);
    expect(tier2).toHaveLength(15);

    const tier1Names = new Set(tier1.map((s) => s.cityId));
    expect(tier1Names).toEqual(
      new Set(["delhi", "mumbai", "bengaluru", "chennai", "kolkata", "hyderabad"])
    );
  });

  it("correctly models Surat as 0 operational km and 0 operational stations with 36 construction stations", () => {
    const stats = getCityCompareStats();
    const surat = stats.find((s) => s.cityId === "surat");
    expect(surat).toBeDefined();
    expect(surat!.operationalKm).toBe(0);
    expect(surat!.operationalStations).toBe(0);
    expect(surat!.constructionStations).toBe(36);
    expect(surat!.constructionKm).toBeGreaterThan(30);
    expect(surat!.completionPercent).toBe(0);
    expect(surat!.firstOpenedYear).toBeNull();
  });

  it("records Kolkata as the earliest opened metro (1984) and nationwide earliest year as 1984", () => {
    const stats = getCityCompareStats();
    const kolkata = stats.find((s) => s.cityId === "kolkata");
    expect(kolkata).toBeDefined();
    expect(kolkata!.firstOpenedYear).toBe(1984);

    const totals = getNationwideTotals();
    expect(totals.earliestOpenedYear).toBe(1984);
  });

  it("flags cities where computed length differs from official reference by > 3%", () => {
    const stats = getCityCompareStats();
    const bhopal = stats.find((s) => s.cityId === "bhopal");
    expect(bhopal).toBeDefined();
    expect(bhopal!.hasLengthMismatch).toBe(true);
    expect(bhopal!.lengthVariancePercent).toBeGreaterThan(3);
    expect(bhopal!.lengthMismatchNote).toContain("differs from official");

    // Pune is < 3% variance (0.3%)
    const pune = stats.find((s) => s.cityId === "pune");
    expect(pune).toBeDefined();
    expect(pune!.hasLengthMismatch).toBe(false);
  });

  it("attaches data completeness caveats for cities with tracked coverage gaps or pending rules", () => {
    const stats = getCityCompareStats();

    // Bhopal has Orange line mismatch notice
    const bhopal = stats.find((s) => s.cityId === "bhopal");
    expect(bhopal!.hasCompletenessCaveat).toBe(true);
    expect(bhopal!.completenessCaveatText).toContain("Data incomplete for this line");

    // Chennai has Corridor 3 unmapped notice
    const chennai = stats.find((s) => s.cityId === "chennai");
    expect(chennai!.hasCompletenessCaveat).toBe(true);

    // Kochi and Lucknow have 0 active caveats
    const kochi = stats.find((s) => s.cityId === "kochi");
    expect(kochi!.hasCompletenessCaveat).toBe(false);
    expect(kochi!.completenessCaveatText).toBeNull();

    const lucknow = stats.find((s) => s.cityId === "lucknow");
    expect(lucknow!.hasCompletenessCaveat).toBe(false);
  });

  it("handles custom fixture data purely in calculateCityCompareStats", () => {
    const mockCities = [
      { id: "test-city", name: "Test City", bbox: [77, 28, 78, 29] as [number, number, number, number], operator: "TMR", phases: ["1"], provenance: { status: "unverified" as const } },
    ];
    const mockLines = [
      { id: "t-line1", name: "Line 1", city_id: "test-city", city: "Test City", color: "#FF0000", operator: "TMR", source: "osm", provenance: { status: "unverified" as const } },
    ];
    const mockSegments = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: { type: "LineString" as const, coordinates: [[77, 28], [77.1, 28.1]] },
          properties: {
            segment_id: "t-seg1",
            line_id: "t-line1",
            city_id: "test-city",
            city: "Test City",
            status: "operational" as const,
            length_km: 15.5,
            inaugurated_on: "2010-05-20",
            phase: "1",
            source: "osm",
          },
        },
      ],
    };
    const mockStations = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [77, 28] },
          properties: {
            station_id: "t-st1",
            name: "Test Station 1",
            city_id: "test-city",
            city: "Test City",
            line_ids: ["t-line1"],
            status: "operational" as const,
            is_interchange: false,
            opened_on: "2010-05-20",
            source: "osm",
          },
        },
      ],
    };
    const mockRefs = {
      "test-city": {
        city_id: "test-city",
        lines: [{ operational_length_km: 15.0 }],
      },
    };

    const calculated = calculateCityCompareStats(
      mockCities,
      mockLines,
      mockSegments as unknown as Parameters<typeof calculateCityCompareStats>[2],
      mockStations as unknown as Parameters<typeof calculateCityCompareStats>[3],
      mockRefs
    );

    expect(calculated).toHaveLength(1);
    expect(calculated[0].operationalKm).toBe(15.5);
    expect(calculated[0].operationalStations).toBe(1);
    expect(calculated[0].firstOpenedYear).toBe(2010);
    expect(calculated[0].referenceOperationalKm).toBe(15.0);
    expect(calculated[0].lengthVariancePercent).toBe(3.3);
    expect(calculated[0].hasLengthMismatch).toBe(true);

    const national = calculateNationwideTotals(calculated);
    expect(national.operationalKm).toBe(15.5);
    expect(national.totalStations).toBe(1);
    expect(national.earliestOpenedYear).toBe(2010);
  });
});
