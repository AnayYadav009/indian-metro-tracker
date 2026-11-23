import { describe, expect, it } from "vitest";
import { getLineStatusLabels } from "@/lib/line-status";

describe("connected line status labels", () => {
  it("shows every unique status represented by a line's segments", () => {
    expect(
      getLineStatusLabels(["operational", "construction", "operational"])
    ).toEqual(["Operational", "Under Construction"]);
  });

  it("returns no label when the line has no compiled segments", () => {
    expect(getLineStatusLabels([])).toEqual([]);
  });
});

describe("Bengaluru Pink Line split verification", () => {
  it("compiles blr-pink-seg-01 as operational with 6 stations and blr-pink-seg-02 as construction", () => {
    const fs = require("node:fs");
    const segments = JSON.parse(fs.readFileSync("data/segments.geojson", "utf8")).features;
    const stations = JSON.parse(fs.readFileSync("data/stations.geojson", "utf8")).features;

    const seg01 = segments.find((s: any) => s.properties.segment_id === "blr-pink-seg-01");
    const seg02 = segments.find((s: any) => s.properties.segment_id === "blr-pink-seg-02");

    expect(seg01).toBeDefined();
    expect(seg01.properties.status).toBe("operational");
    expect(seg01.properties.stations_count).toBe(6);

    expect(seg02).toBeDefined();
    expect(seg02.properties.status).toBe("construction");

    const pinkStations = stations.filter((st: any) => st.properties.line_ids?.includes("blr-pink"));
    const opStations = pinkStations.filter((st: any) => st.properties.status === "operational");
    expect(opStations.length).toBe(6);
  });
});

describe("Pune Line 3 statuses and infill completions", () => {
  it("compiles 13 operational surveyed stations including Doehler India and 6 construction infill stations", () => {
    const fs = require("node:fs");
    const stations = JSON.parse(fs.readFileSync("data/stations.geojson", "utf8")).features;
    const line3Stations = stations.filter((st: any) => st.properties.line_ids?.includes("pun-line-3"));

    const opStations = line3Stations.filter((st: any) => st.properties.status === "operational");
    const conStations = line3Stations.filter((st: any) => st.properties.status === "construction");

    expect(opStations.length).toBe(13);
    expect(opStations.some((st: any) => st.properties.name === "Doehler India")).toBe(true);

    expect(conStations.length).toBe(6);
    const conMap = Object.fromEntries(conStations.map((st: any) => [st.properties.name, st.properties.expected_completion]));
    expect(conMap["High Street"]).toBe("2026-12");
    expect(conMap["Balewadi Phata"]).toBe("2026-12");
    expect(conMap["Baner Gaon"]).toBe("2027-01");
    expect(conMap["Baner"]).toBe("2027-01");
    expect(conMap["RBI"]).toBe("2027-01");
    expect(conMap["Line 3 Shivajinagar"]).toBe("2027-01");
  });
});
