import fs from "node:fs";
import path from "node:path";
import { validateMetroDataset } from "../../lib/data-validator";
import { atomicWriteFiles } from "../lib/atomic-write";
import { readJsonFile } from "../lib/load-dataset";
import type { City, Line, SegmentFeature, StationFeature } from "../../types/metro";

const DATA_DIR = path.resolve(process.cwd(), "data");

export function migrateProvenanceData() {
  console.log("🚀 Starting Provenance Data Migration (M19)...");

  const overridesDir = path.join(DATA_DIR, "overrides");
  const overrideFiles = fs
    .readdirSync(overridesDir)
    .filter((f) => f.endsWith(".json") && f !== "interchanges.json" && f !== "pending-unverified.json");

  let cityCount = 0;
  let lineCount = 0;
  const statusCounts = {
    cities: { verified: 0, schematic: 0, unverified: 0, with_source_url: 0 },
    lines: { verified: 0, schematic: 0, unverified: 0, with_source_url: 0 },
  };

  const allCities: City[] = [];
  const allLines: Line[] = [];

  for (const file of overrideFiles) {
    const filePath = path.join(overridesDir, file);
    const data = readJsonFile<any>(filePath);

    // City provenance
    if (!data.city.provenance) {
      data.city.provenance = { status: "unverified" };
    }
    statusCounts.cities[data.city.provenance.status as "unverified"]++;
    if (data.city.provenance.source_url) statusCounts.cities.with_source_url++;
    cityCount++;
    allCities.push(data.city);

    // Lines provenance
    if (Array.isArray(data.lines)) {
      for (const line of data.lines) {
        if (!line.provenance) {
          line.provenance = { status: "unverified" };
        }
        statusCounts.lines[line.provenance.status as "unverified"]++;
        if (line.provenance.source_url) statusCounts.lines.with_source_url++;
        lineCount++;
        allLines.push({
          ...line,
          city_id: line.city_id || data.city.id,
        });
      }
    }

    // Write updated override file back with 2 spaces
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  }

  console.log(`✅ Migrated ${cityCount} city overrides and ${lineCount} lines in data/overrides/`);

  // Migrate mock data
  const mockCitiesPath = path.join(DATA_DIR, "mock", "cities.json");
  if (fs.existsSync(mockCitiesPath)) {
    const mockCities = readJsonFile<any[]>(mockCitiesPath);
    for (const c of mockCities) {
      if (!c.provenance) c.provenance = { status: "unverified" };
    }
    fs.writeFileSync(mockCitiesPath, JSON.stringify(mockCities, null, 2) + "\n", "utf-8");
    console.log(`✅ Migrated mock cities in data/mock/cities.json`);
  }

  const mockLinesPath = path.join(DATA_DIR, "mock", "lines.json");
  if (fs.existsSync(mockLinesPath)) {
    const mockLines = readJsonFile<any[]>(mockLinesPath);
    for (const l of mockLines) {
      if (!l.provenance) l.provenance = { status: "unverified" };
    }
    fs.writeFileSync(mockLinesPath, JSON.stringify(mockLines, null, 2) + "\n", "utf-8");
    console.log(`✅ Migrated mock lines in data/mock/lines.json`);
  }

  // Load existing segments and stations to validate dataset integrity
  const segmentsPath = path.join(DATA_DIR, "segments.geojson");
  const stationsPath = path.join(DATA_DIR, "stations.geojson");
  const segmentsData = readJsonFile<{ features: SegmentFeature[] }>(segmentsPath);
  const stationsData = readJsonFile<{ features: StationFeature[] }>(stationsPath);

  // Validate complete combined dataset with migrated cities and lines
  console.log("🔍 Validating combined dataset with new provenance fields...");
  const validation = validateMetroDataset({
    cities: allCities,
    lines: allLines,
    segments: segmentsData,
    stations: stationsData,
  });

  if (!validation.valid || !validation.dataset) {
    console.error(`❌ Validation failed with ${validation.errors.length} error(s):`);
    validation.errors.forEach((e) => console.error(`   • ${e}`));
    throw new Error("Dataset validation failed during provenance migration");
  }

  console.log("💾 Writing regenerated data/cities.json and data/lines.json atomically...");
  atomicWriteFiles([
    {
      target: path.join(DATA_DIR, "cities.json"),
      content: JSON.stringify(allCities, null, 2) + "\n",
    },
    {
      target: path.join(DATA_DIR, "lines.json"),
      content: JSON.stringify(allLines, null, 2) + "\n",
    },
  ]);

  console.log("\n📊 Migration Summary:");
  console.log(`Cities (${cityCount} total):`, statusCounts.cities);
  console.log(`Lines (${lineCount} total):`, statusCounts.lines);

  return statusCounts;
}

if (require.main === module) {
  migrateProvenanceData();
}
