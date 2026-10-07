import fs from "node:fs";
import path from "node:path";
import { validateMetroDataset } from "../lib/data-validator";
import { atomicWriteFiles } from "./lib/atomic-write";
import type { City, Line, SegmentFeatureCollection, StationFeatureCollection } from "../types/metro";

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const MOCK_DIR = path.join(DATA_DIR, "mock");
const OVERRIDES_DIR = path.join(DATA_DIR, "overrides");

export interface MigrationV2Options {
  currentDate?: string;
}

export function migrateDatasetV2(
  dataset: {
    cities: any[];
    lines: any[];
    segments: any;
    stations: any;
  },
  options?: MigrationV2Options
): {
  cities: City[];
  lines: Line[];
  segments: SegmentFeatureCollection;
  stations: StationFeatureCollection;
} {
  const today = options?.currentDate || new Date().toISOString().slice(0, 10);

  // 1. Migrate Cities: add tier (default 1) and keep network_id / retrieved_at
  const migratedCities: City[] = dataset.cities.map((c) => {
    return {
      ...c,
      tier: c.tier !== undefined ? c.tier : 1,
      network_id: c.network_id || undefined,
      retrieved_at: c.retrieved_at || today,
    };
  });

  // 2. Migrate Lines: keep retrieved_at
  const migratedLines: Line[] = dataset.lines.map((l) => {
    return {
      ...l,
      retrieved_at: l.retrieved_at || today,
    };
  });

  // 3. Migrate Segments: keep official_length_km, retrieved_at, round coordinates to 5 decimals
  const migratedSegments: SegmentFeatureCollection = {
    type: "FeatureCollection",
    features: dataset.segments.features.map((f: any) => {
      const coords = f.geometry.coordinates.map(([lng, lat]: [number, number]) => [
        Number(lng.toFixed(5)),
        Number(lat.toFixed(5)),
      ]);

      const props = { ...f.properties };
      if (props.official_length_km !== undefined && props.official_length_km !== null) {
        props.official_length_km = Number(props.official_length_km);
      }

      return {
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: coords,
        },
        properties: {
          ...props,
          retrieved_at: props.retrieved_at || today,
        },
      };
    }),
  };

  // 4. Migrate Stations: keep segment_id, retrieved_at, round coordinates to 5 decimals
  const migratedStations: StationFeatureCollection = {
    type: "FeatureCollection",
    features: dataset.stations.features.map((f: any) => {
      const coords: [number, number] = [
        Number(f.geometry.coordinates[0].toFixed(5)),
        Number(f.geometry.coordinates[1].toFixed(5)),
      ];

      const props = { ...f.properties };
      if (props.segment_id !== undefined && props.segment_id !== null) {
        props.segment_id = String(props.segment_id);
      }

      return {
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: coords,
        },
        properties: {
          ...props,
          retrieved_at: props.retrieved_at || today,
        },
      };
    }),
  };

  return {
    cities: migratedCities,
    lines: migratedLines,
    segments: migratedSegments,
    stations: migratedStations,
  };
}

export function runMigrationOnDirectory(targetDir: string, options?: MigrationV2Options): void {
  const citiesPath = path.join(targetDir, "cities.json");
  const linesPath = path.join(targetDir, "lines.json");
  const segsPath = path.join(targetDir, "segments.geojson");
  const stPath = path.join(targetDir, "stations.geojson");

  if (
    !fs.existsSync(citiesPath) ||
    !fs.existsSync(linesPath) ||
    !fs.existsSync(segsPath) ||
    !fs.existsSync(stPath)
  ) {
    console.log(`⏩ Skipping directory ${targetDir} (missing one or more required data files)`);
    return;
  }

  console.log(`🔄 Migrating datasets in ${targetDir}...`);
  const cities = JSON.parse(fs.readFileSync(citiesPath, "utf-8"));
  const lines = JSON.parse(fs.readFileSync(linesPath, "utf-8"));
  const segments = JSON.parse(fs.readFileSync(segsPath, "utf-8"));
  const stations = JSON.parse(fs.readFileSync(stPath, "utf-8"));

  const migrated = migrateDatasetV2({ cities, lines, segments, stations }, options);

  const valResult = validateMetroDataset(migrated);
  if (!valResult.valid) {
    console.error(`❌ Validation failed after migrating ${targetDir}:`, valResult.errors);
    throw new Error(`Migration validation failed for ${targetDir}`);
  }

  atomicWriteFiles([
    { target: citiesPath, content: JSON.stringify(migrated.cities, null, 2) + "\n" },
    { target: linesPath, content: JSON.stringify(migrated.lines, null, 2) + "\n" },
    { target: segsPath, content: JSON.stringify(migrated.segments, null, 2) + "\n" },
    { target: stPath, content: JSON.stringify(migrated.stations, null, 2) + "\n" },
  ]);

  console.log(`✅ Successfully migrated and validated ${targetDir}`);
}

function main(): void {
  console.log("🚀 Starting M9 Schema Migration...\n");

  runMigrationOnDirectory(DATA_DIR);
  if (fs.existsSync(MOCK_DIR)) {
    runMigrationOnDirectory(MOCK_DIR);
  }

  console.log("\n🎉 M9 Migration complete!");
}

if (require.main === module) {
  main();
}
