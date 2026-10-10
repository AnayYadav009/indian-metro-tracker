import { describe, it, expect } from "vitest";
import { saveActiveDataset } from "@/scripts/pipeline/build-real-data";
import type { City, Line, SegmentFeature, StationFeature } from "@/types/metro";

describe("saveActiveDataset pre-save validation", () => {
  const cityDelhi: City = {
    id: "delhi",
    name: "Delhi",
    bbox: [76.84, 28.4, 77.35, 28.88],
    operator: "DMRC",
    phases: ["Phase 1"],
  };

  const cityBengaluru: City = {
    id: "bengaluru",
    name: "Bengaluru",
    bbox: [77.45, 12.82, 77.78, 13.15],
    operator: "BMRCL",
    phases: ["Phase 1"],
  };

  const lineDelhi: Line = {
    id: "del-red",
    name: "Red Line",
    city_id: "delhi",
    city: "Delhi",
    color: "#FF0000",
    operator: "DMRC",
    source: "osm",
  };

  const lineBengaluru: Line = {
    id: "blr-purple",
    name: "Purple Line",
    city_id: "bengaluru",
    city: "Bengaluru",
    color: "#800080",
    operator: "BMRCL",
    source: "osm",
  };

  const segmentDelhi: SegmentFeature = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [77.2, 28.6],
        [77.21, 28.61],
      ],
    },
    properties: {
      segment_id: "del-seg-01",
      line_id: "del-red",
      line_name: "Red Line",
      city_id: "delhi",
      city: "Delhi",
      operator: "DMRC",
      status: "operational",
      phase: "Phase 1",
      length_km: 1.5,
      gauge: "standard",
      stations_count: 2,
      source: "osm+dmrc",
      references: [],
      last_verified: "2026-10-05",
      inaugurated_on: "2002-12-25",
      expected_completion: null,
      color: "#FF0000",
    },
  };

  const stationDelhi: StationFeature = {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [77.2, 28.6],
    },
    properties: {
      station_id: "shared-station-id",
      name: "Delhi Station",
      city_id: "delhi",
      city: "Delhi",
      line_ids: ["del-red"],
      status: "operational",
      phase: "Phase 1",
      is_interchange: false,
      opened_on: "2002-12-25",
      expected_completion: null,
      layout: "elevated",
      source: "osm+dmrc",
      last_verified: "2026-10-05",
    },
  };

  const duplicateStationBengaluru: StationFeature = {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [77.59, 12.97],
    },
    properties: {
      station_id: "shared-station-id", // DUPLICATE ID across cities!
      name: "Bengaluru Station",
      city_id: "bengaluru",
      city: "Bengaluru",
      line_ids: ["blr-purple"],
      status: "operational",
      phase: "Phase 1",
      is_interchange: false,
      opened_on: "2011-10-20",
      expected_completion: null,
      layout: "elevated",
      source: "osm+bmrcl",
      last_verified: "2026-10-05",
    },
  };

  it("throws error and aborts save if merged dataset contains duplicate station_id across cities", () => {
    const invalidDataset = {
      cities: [cityDelhi, cityBengaluru],
      lines: [lineDelhi, lineBengaluru],
      segments: [segmentDelhi],
      stations: [stationDelhi, duplicateStationBengaluru],
    };

    expect(() => saveActiveDataset(invalidDataset)).toThrowError(
      /Cannot save active dataset: Merged validation failed/
    );

    // Verify disk files were NOT modified and no temp files linger
    const fs = require("node:fs");
    const path = require("node:path");
    const dataDir = path.resolve(process.cwd(), "data");
    const stationsContent = fs.readFileSync(path.join(dataDir, "stations.geojson"), "utf-8");
    expect(stationsContent).not.toContain("shared-station-id");

    const lingeringTemp = fs.readdirSync(dataDir).filter((f: string) => f.startsWith(".tmp-"));
    expect(lingeringTemp.length).toBe(0);
  });
});
