import { describe, it, expect } from "vitest";
import { normalizeSearchString, searchStations } from "@/lib/station-search";
import type { StationProperties } from "@/types/schema";

describe("Station Search Engine (M23 Shell Step 5)", () => {
  const mockStations = [
    {
      geometry: { coordinates: [77.2295, 28.6675] },
      properties: {
        station_id: "del-kashmere-gate",
        name: "Kashmere Gate",
        city_id: "delhi",
        city: "Delhi",
        line_ids: ["del-red", "del-yellow", "del-violet"],
        status: "operational",
        phase: "1",
        is_interchange: true,
      } as StationProperties,
    },
    {
      geometry: { coordinates: [77.2195, 28.6328] },
      properties: {
        station_id: "del-rajiv-chowk",
        name: "Rajiv Chowk",
        city_id: "delhi",
        city: "Delhi",
        line_ids: ["del-blue", "del-yellow"],
        status: "operational",
        phase: "1",
        is_interchange: true,
      } as StationProperties,
    },
    {
      geometry: { coordinates: [72.8347, 18.94] },
      properties: {
        station_id: "mum-csmt",
        name: "Chhatrapati Shivaji Maharaj Terminus",
        city_id: "mumbai",
        city: "Mumbai",
        line_ids: ["mum-aqua"],
        status: "operational",
        phase: "3",
        is_interchange: false,
      } as StationProperties,
    },
    {
      geometry: { coordinates: [77.5713, 12.9756] },
      properties: {
        station_id: "blr-majestic",
        name: "Nadaprabhu Kempegowda Station Majestic",
        city_id: "bengaluru",
        city: "Bengaluru",
        line_ids: ["blr-purple", "blr-green"],
        status: "operational",
        phase: "1",
        is_interchange: true,
      } as StationProperties,
    },
  ];

  it("normalizes search strings with diacritics and case", () => {
    expect(normalizeSearchString("  Kashméré Gate  ")).toBe("kashmere gate");
    expect(normalizeSearchString("MUMBAI")).toBe("mumbai");
    expect(normalizeSearchString("")).toBe("");
  });

  it("finds exact matches and prioritizes active city", () => {
    const results = searchStations("Kashmere Gate", mockStations, { activeCityId: "delhi" });
    expect(results).toHaveLength(1);
    expect(results[0].station.station_id).toBe("del-kashmere-gate");
    expect(results[0].matchType).toBe("exact");
    expect(results[0].score).toBe(100);
  });

  it("finds prefix matches across stations", () => {
    const results = searchStations("Rajiv", mockStations);
    expect(results).toHaveLength(1);
    expect(results[0].station.station_id).toBe("del-rajiv-chowk");
  });

  it("matches aliases when provided", () => {
    const aliases = {
      "Chhatrapati Shivaji Maharaj Terminus": ["CSMT", "VT"],
      "Nadaprabhu Kempegowda Station Majestic": ["Kempegowda Interchange"],
    };

    const results = searchStations("CSMT", mockStations, { activeCityId: "mumbai" }, aliases);
    expect(results).toHaveLength(1);
    expect(results[0].station.station_id).toBe("mum-csmt");
    expect(results[0].matchType).toBe("alias");
    expect(results[0].matchedAlias).toBe("CSMT");
  });

  it("prioritizes active city over other cities for common queries", () => {
    const multiCityStations = [
      {
        geometry: { coordinates: [77.0, 28.0] },
        properties: {
          station_id: "del-central",
          name: "Central",
          city_id: "delhi",
          city: "Delhi",
          line_ids: ["del-red"],
          status: "operational",
          phase: "1",
          is_interchange: false,
        } as StationProperties,
      },
      {
        geometry: { coordinates: [80.0, 13.0] },
        properties: {
          station_id: "che-central",
          name: "Central",
          city_id: "chennai",
          city: "Chennai",
          line_ids: ["che-blue"],
          status: "operational",
          phase: "1",
          is_interchange: false,
        } as StationProperties,
      },
    ];

    const results = searchStations("Central", multiCityStations, { activeCityId: "chennai" });
    expect(results).toHaveLength(2);
    expect(results[0].station.city_id).toBe("chennai");
    expect(results[1].station.city_id).toBe("delhi");
  });
});
