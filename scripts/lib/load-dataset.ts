import fs from "node:fs";
import path from "node:path";
import type { City, Line, SegmentFeatureCollection, StationFeatureCollection } from "../../types/metro";

export interface LoadedDataset {
  cities: City[];
  lines: Line[];
  segments: SegmentFeatureCollection;
  stations: StationFeatureCollection;
}

/**
 * Loads and parses all active metro data files from disk.
 * Exits with error code 1 if any core data file is missing.
 *
 * @param customDataDir Optional path to data directory. Defaults to <cwd>/data.
 */
export function loadMetroDatasetFromDisk(customDataDir?: string): LoadedDataset {
  const dataDir = customDataDir || path.resolve(process.cwd(), "data");

  const citiesPath = path.join(dataDir, "cities.json");
  const linesPath = path.join(dataDir, "lines.json");
  const segmentsPath = path.join(dataDir, "segments.geojson");
  const stationsPath = path.join(dataDir, "stations.geojson");

  const requiredFiles = [
    { name: "cities.json", path: citiesPath },
    { name: "lines.json", path: linesPath },
    { name: "segments.geojson", path: segmentsPath },
    { name: "stations.geojson", path: stationsPath },
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file.path)) {
      console.error(`❌ Missing file: ${file.path}`);
      process.exit(1);
    }
  }

  const cities = JSON.parse(fs.readFileSync(citiesPath, "utf-8")) as City[];
  const lines = JSON.parse(fs.readFileSync(linesPath, "utf-8")) as Line[];
  const segments = JSON.parse(fs.readFileSync(segmentsPath, "utf-8")) as SegmentFeatureCollection;
  const stations = JSON.parse(fs.readFileSync(stationsPath, "utf-8")) as StationFeatureCollection;

  return { cities, lines, segments, stations };
}
