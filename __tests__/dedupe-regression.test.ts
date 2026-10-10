import { describe, it, expect } from "vitest";
import { generateDedupeReport } from "@/scripts/audit/dedupe-report";
import { mergeCityOverrides, type CityOverrideData } from "@/scripts/pipeline/merge-overrides";
import type { NormalizedCityData } from "@/scripts/pipeline/normalize";

describe("Station Deduplication Regression & Rule Tests", () => {
  it("proves same-name pairs at the known dedupe distances merge in Delhi dataset", () => {
    const report = generateDedupeReport("delhi");
    const merged = report.mergedNodes;

    // Delhi Gate has a newer OSM duplicate in the refreshed relation-member
    // response; it now merges at 3 m instead of the previous 207 m pair.
    const delhiGate = merged.find((m) => m.droppedOsmId === 7282286733);
    expect(delhiGate).toBeDefined();
    expect(delhiGate?.distanceMetres).toBe(3);
    expect(delhiGate?.mergedIntoOsmId).toBe(2837165876);

    // 2. Chirag Delhi: 212.3 m
    const chiragDelhi = merged.find((m) => m.droppedOsmId === 5215706132);
    expect(chiragDelhi).toBeDefined();
    expect(chiragDelhi?.distanceMetres).toBe(212.3);
    expect(chiragDelhi?.mergedIntoOsmId).toBe(3832323219);

    // 3. Madhuban Chowk: 215.0 m
    const madhubanChowk = merged.find((m) => m.droppedOsmId === 5215706520);
    expect(madhubanChowk).toBeDefined();
    expect(madhubanChowk?.distanceMetres).toBe(215);
    expect(madhubanChowk?.mergedIntoOsmId).toBe(663765153);

    // 4. Kalkaji Mandir: 231.0 m
    const kalkajiMandir = merged.find((m) => m.droppedOsmId === 2833058719);
    expect(kalkajiMandir).toBeDefined();
    expect(kalkajiMandir?.distanceMetres).toBe(231);
    expect(kalkajiMandir?.mergedIntoOsmId).toBe(927873510);

    // 5. New Delhi: 280.1 m
    const newDelhi = merged.find((m) => m.droppedOsmId === 5215706722);
    expect(newDelhi).toBeDefined();
    expect(newDelhi?.distanceMetres).toBe(280.1);
    expect(newDelhi?.mergedIntoOsmId).toBe(554257841);
  });

  it("ensures final merged station names do NOT keep line qualifiers like '(Blue Line)'", () => {
    const report = generateDedupeReport("delhi");
    for (const stn of report.retainedNodes) {
      expect(stn.resolvedName).not.toMatch(/\((Blue|Pink|Yellow|Red|Green|Violet|Magenta|Grey|Orange)\s*Line\)/i);
    }
    for (const m of report.mergedNodes) {
      expect(m.mergedIntoFinalName).not.toMatch(/\((Blue|Pink|Yellow|Red|Green|Violet|Magenta|Grey|Orange)\s*Line\)/i);
    }
  });

  it("never merges distinct stations on the < 80m fallback when base names differ and no alias/interchange tags exist", () => {
    const normalizedData: NormalizedCityData = {
      cityId: "delhi",
      cityName: "Delhi",
      segments: [],
      stations: [
        {
          osmId: 101,
          name: "Station Alpha",
          coordinates: [77.2000, 28.6000],
          status: "operational",
          tags: {},
          lineRefs: [],
        },
        {
          osmId: 102,
          name: "Station Beta", // Different base name
          coordinates: [77.2005, 28.6002], // ~50 meters apart (< 80m)
          status: "operational",
          tags: {},
          lineRefs: [],
        },
      ],
    };

    const overrides: CityOverrideData = {
      city: {
        id: "delhi",
        name: "Delhi",
        bbox: [77.0, 28.0, 78.0, 29.0],
        operator: "DMRC",
        phases: ["I"],
      },
      lines: [],
      segments: [],
      dedupeRadiusM: 350,
      stationAliases: {}, // No alias
    };

    const result = mergeCityOverrides(normalizedData, overrides);
    // Must NOT merge: both stations retained
    expect(result.stations.length).toBe(2);
    expect(result.stations.map((s) => s.properties.name)).toEqual(["Station Alpha", "Station Beta"]);
  });
});
