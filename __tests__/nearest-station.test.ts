import { describe, it, expect } from "vitest";
import {
  findNearestStations,
  MAX_DISTANCE_THRESHOLD_KM,
  type NearestStationOutcome,
} from "@/lib/nearest-station";

describe("Nearest Station Finder Engine (M16)", () => {
  // Test coordinate 1: Connaught Place, New Delhi (near Rajiv Chowk)
  // [77.2183, 28.6328]
  const RAJIV_CHOWK_COORDS: [number, number] = [77.2183, 28.6328];

  it("calculates straight-line distance and ranks nearest operational stations in ascending order", () => {
    const outcome = findNearestStations(RAJIV_CHOWK_COORDS, { limit: 5 });

    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;

    expect(outcome.stations.length).toBe(5);
    expect(outcome.nearestDistanceKm).toBeLessThan(1.0); // Rajiv Chowk is right there (< 1 km)

    // First station should be Rajiv Chowk or an immediate adjacent station in central Delhi
    const firstStation = outcome.stations[0];
    expect(firstStation.cityName).toBe("Delhi");
    expect(firstStation.status).toBe("operational");
    expect(firstStation.isNotYetOpen).toBe(false);

    // Verify distance sorting
    for (let i = 1; i < outcome.stations.length; i++) {
      expect(outcome.stations[i].distanceKm).toBeGreaterThanOrEqual(
        outcome.stations[i - 1].distanceKm
      );
    }
  });

  it("correctly labels straight-line distance in metres for <1 km and km for >=1 km", () => {
    const outcome = findNearestStations(RAJIV_CHOWK_COORDS, { limit: 5 });
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;

    // Check distance label format
    for (const station of outcome.stations) {
      expect(station.formattedDistance).toMatch(/straight-line$/);
      if (station.distanceKm < 1.0) {
        expect(station.formattedDistance).toMatch(/^\d+\s+m\s+straight-line$/);
      } else {
        expect(station.formattedDistance).toMatch(/^\d+\.\d+\s+km\s+straight-line$/);
      }
    }
  });

  it("resolves lines served, line colors, and interchange flags", () => {
    const outcome = findNearestStations(RAJIV_CHOWK_COORDS, { limit: 5 });
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;

    const rajivChowk = outcome.stations.find(
      (s) => s.station.properties.name.toLowerCase().includes("rajiv chowk")
    );
    expect(rajivChowk).toBeDefined();
    if (!rajivChowk) return;

    expect(rajivChowk.isInterchange).toBe(true);
    expect(rajivChowk.lines.length).toBeGreaterThanOrEqual(2);
    // Delhi Yellow & Blue
    const lineIds = rajivChowk.lines.map((l) => l.id);
    expect(lineIds).toContain("del-yellow");
    expect(lineIds).toContain("del-blue");
  });

  it("excludes under-construction stations by default", () => {
    const outcome = findNearestStations(RAJIV_CHOWK_COORDS, {
      includeConstruction: false,
      limit: 10,
    });
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;

    for (const station of outcome.stations) {
      expect(station.status).toBe("operational");
      expect(station.isNotYetOpen).toBe(false);
    }
  });

  it("includes under-construction stations when toggle is enabled, labelling them as not yet open", () => {
    // Surat coordinates: [72.83, 21.17] - all Surat stations are currently under construction
    const SURAT_COORDS: [number, number] = [72.83, 21.17];

    const outcome = findNearestStations(SURAT_COORDS, {
      includeConstruction: true,
      limit: 5,
    });

    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;

    const suratStations = outcome.stations.filter((s) => s.cityName === "Surat");
    expect(suratStations.length).toBeGreaterThan(0);
    for (const st of suratStations) {
      expect(st.status).toBe("construction");
      expect(st.isNotYetOpen).toBe(true);
    }
  });

  it("detects when a user is in a city with no operational metro network", () => {
    // Surat coordinates: Surat has only construction stations and 0 operational stations
    const SURAT_COORDS: [number, number] = [72.83, 21.17];

    const outcome = findNearestStations(SURAT_COORDS, {
      includeConstruction: false,
      limit: 5,
    });

    expect(outcome.status).toBe("no_operational_network");
    if (outcome.status === "no_operational_network") {
      expect(outcome.cityName).toBe("Surat");
      expect(outcome.message).toContain("Surat metro is currently under construction");
      expect(outcome.message).toContain("no operational stations yet");
    }
  });

  it("flags too_far when nearest station exceeds 50 km threshold", () => {
    // Remote coordinate in the Thar Desert far from Jaipur/Jodhpur/Delhi: [71.0, 26.5]
    const DESERT_COORDS: [number, number] = [71.0, 26.5];

    const outcome = findNearestStations(DESERT_COORDS, {
      maxDistanceKm: MAX_DISTANCE_THRESHOLD_KM,
    });

    expect(outcome.status).toBe("too_far");
    if (outcome.status === "too_far") {
      expect(outcome.nearestDistanceKm).toBeGreaterThan(MAX_DISTANCE_THRESHOLD_KM);
      expect(outcome.message).toContain("out of range");
      expect(outcome.message).toContain("50 km");
    }
  });

  it("attaches data completeness caveats for affected lines and leaves clean lines unaffected", () => {
    // Majlis Park (Delhi Pink line has an active data gap notice)
    // [77.178, 28.718]
    const MAJLIS_PARK_COORDS: [number, number] = [77.178, 28.718];
    const outcomeDelhi = findNearestStations(MAJLIS_PARK_COORDS, { limit: 5 });

    expect(outcomeDelhi.status).toBe("success");
    if (outcomeDelhi.status === "success") {
      const pinkStation = outcomeDelhi.stations.find((s) =>
        s.lines.some((l) => l.id === "del-pink")
      );
      if (pinkStation) {
        expect(pinkStation.caveatNotice).toBeDefined();
        expect(pinkStation.caveatNotice).toContain("Data incomplete for this line");
      }
    }

    // Kochi Metro (Line 1 has zero caveats)
    // [76.29, 9.98]
    const KOCHI_COORDS: [number, number] = [76.29, 9.98];
    const outcomeKochi = findNearestStations(KOCHI_COORDS, { limit: 3 });

    expect(outcomeKochi.status).toBe("success");
    if (outcomeKochi.status === "success") {
      const kochiStation = outcomeKochi.stations[0];
      expect(kochiStation.cityName).toBe("Kochi");
      expect(kochiStation.caveatNotice).toBeUndefined();
    }
  });
});
