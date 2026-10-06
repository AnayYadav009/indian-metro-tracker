import fs from "node:fs";
import path from "node:path";
import { validateMetroDataset } from "../lib/data-validator";
import type { City, Line, SegmentFeatureCollection, StationFeatureCollection } from "../types/metro";

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const MOCK_DIR = path.join(DATA_DIR, "mock");
const OVERRIDES_DIR = path.join(DATA_DIR, "overrides");

function getCityIdLookup(cities: City[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of cities) {
    map.set(c.id.toLowerCase(), c.id);
    map.set(c.name.toLowerCase(), c.id);
  }
  // Common aliases
  map.set("bangalore", "bengaluru");
  map.set("bombay", "mumbai");
  map.set("new delhi", "delhi");
  return map;
}

function migrateLines(lines: any[], cityLookup: Map<string, string>): Line[] {
  return lines.map((l) => {
    const rawCity = (l.city_id || l.city || "").toString().toLowerCase();
    const cityId = cityLookup.get(rawCity);
    if (!cityId) {
      throw new Error(`Cannot resolve city_id for line ${l.id} with city '${l.city}'`);
    }
    return {
      id: l.id,
      name: l.name,
      city_id: cityId,
      city: l.city,
      color: l.color,
      operator: l.operator,
      source: l.source || "osm",
    };
  });
}

function migrateSegments(segsCollection: any, cityLookup: Map<string, string>): SegmentFeatureCollection {
  return {
    type: "FeatureCollection",
    features: segsCollection.features.map((f: any) => {
      const props = f.properties;
      const rawCity = (props.city_id || props.city || "").toString().toLowerCase();
      const cityId = cityLookup.get(rawCity);
      if (!cityId) {
        throw new Error(`Cannot resolve city_id for segment ${props.segment_id} with city '${props.city}'`);
      }
      return {
        ...f,
        properties: {
          segment_id: props.segment_id,
          line_id: props.line_id,
          line_name: props.line_name,
          city_id: cityId,
          city: props.city,
          operator: props.operator,
          status: props.status,
          phase: props.phase,
          length_km: props.length_km,
          gauge: props.gauge,
          inaugurated_on: props.inaugurated_on ?? null,
          expected_completion: props.expected_completion ?? null,
          stations_count: props.stations_count,
          color: props.color,
          source: props.source,
          last_verified: props.last_verified,
        },
      };
    }),
  };
}

function migrateStations(stationsCollection: any, cityLookup: Map<string, string>): StationFeatureCollection {
  return {
    type: "FeatureCollection",
    features: stationsCollection.features.map((f: any) => {
      const props = f.properties;
      const rawCity = (props.city_id || props.city || "").toString().toLowerCase();
      const cityId = cityLookup.get(rawCity);
      if (!cityId) {
        throw new Error(`Cannot resolve city_id for station ${props.station_id} with city '${props.city}'`);
      }
      return {
        ...f,
        properties: {
          station_id: props.station_id,
          name: props.name,
          city_id: cityId,
          city: props.city,
          line_ids: props.line_ids,
          status: props.status,
          phase: props.phase,
          is_interchange: props.is_interchange,
          opened_on: props.opened_on ?? null,
          expected_completion: props.expected_completion ?? null,
          layout: props.layout,
          source: props.source ?? "mock",
          last_verified: props.last_verified ?? "2026-10-05",
        },
      };
    }),
  };
}

function migrateDatasetDirectory(targetDir: string, citiesJsonPath: string) {
  console.log(`\n📦 Migrating datasets in ${path.relative(ROOT_DIR, targetDir)}...`);
  const cities: City[] = JSON.parse(fs.readFileSync(citiesJsonPath, "utf-8"));
  const cityLookup = getCityIdLookup(cities);

  const linesPath = path.join(targetDir, "lines.json");
  const segsPath = path.join(targetDir, "segments.geojson");
  const stnsPath = path.join(targetDir, "stations.geojson");

  const rawLines = JSON.parse(fs.readFileSync(linesPath, "utf-8"));
  const rawSegs = JSON.parse(fs.readFileSync(segsPath, "utf-8"));
  const rawStns = JSON.parse(fs.readFileSync(stnsPath, "utf-8"));

  const migratedLines = migrateLines(rawLines, cityLookup);
  const migratedSegs = migrateSegments(rawSegs, cityLookup);
  const migratedStns = migrateStations(rawStns, cityLookup);

  // Validate before writing!
  const validation = validateMetroDataset({
    cities,
    lines: migratedLines,
    segments: migratedSegs,
    stations: migratedStns,
  });

  if (!validation.valid || !validation.dataset) {
    console.error(`❌ Validation failed for ${targetDir}:`);
    validation.errors.forEach((e) => console.error(`   • ${e}`));
    throw new Error(`Validation failed during migration for ${targetDir}`);
  }

  // Atomically write files
  fs.writeFileSync(linesPath, JSON.stringify(migratedLines, null, 2) + "\n", "utf-8");
  fs.writeFileSync(segsPath, JSON.stringify(migratedSegs, null, 2) + "\n", "utf-8");
  fs.writeFileSync(stnsPath, JSON.stringify(migratedStns, null, 2) + "\n", "utf-8");
  console.log(`✅ Successfully migrated and verified ${path.relative(ROOT_DIR, targetDir)}`);
}

function migrateOverrides() {
  console.log(`\n📦 Migrating override files in data/overrides/...`);
  if (!fs.existsSync(OVERRIDES_DIR)) return;

  const files = fs.readdirSync(OVERRIDES_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const filePath = path.join(OVERRIDES_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const cityId = data.city?.id;
    if (!cityId) continue;

    if (Array.isArray(data.lines)) {
      data.lines = data.lines.map((l: any) => ({
        ...l,
        city_id: cityId,
      }));
    }

    if (Array.isArray(data.segments)) {
      data.segments = data.segments.map((s: any) => ({
        ...s,
        city_id: cityId,
      }));
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    console.log(`✅ Migrated override: ${file}`);
  }
}

function runMigration() {
  const citiesPath = path.join(DATA_DIR, "cities.json");
  migrateDatasetDirectory(DATA_DIR, citiesPath);

  if (fs.existsSync(MOCK_DIR)) {
    migrateDatasetDirectory(MOCK_DIR, citiesPath);
  }

  migrateOverrides();
  console.log("\n🎉 All datasets and overrides migrated to city_id foreign keys!");
}

runMigration();
