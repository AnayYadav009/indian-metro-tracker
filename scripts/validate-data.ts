import fs from "node:fs";
import path from "node:path";
import { validateMetroDataset } from "../lib/data-validator";

function runValidation() {
  console.log("🔍 Validating Indian Metro Network Tracker datasets...");

  const dataDir = path.resolve(process.cwd(), "data");
  const citiesPath = path.join(dataDir, "cities.json");
  const linesPath = path.join(dataDir, "lines.json");
  const segmentsPath = path.join(dataDir, "segments.geojson");
  const stationsPath = path.join(dataDir, "stations.geojson");

  if (!fs.existsSync(citiesPath)) {
    console.error(`❌ Missing file: ${citiesPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(linesPath)) {
    console.error(`❌ Missing file: ${linesPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(segmentsPath)) {
    console.error(`❌ Missing file: ${segmentsPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(stationsPath)) {
    console.error(`❌ Missing file: ${stationsPath}`);
    process.exit(1);
  }

  const cities = JSON.parse(fs.readFileSync(citiesPath, "utf-8"));
  const lines = JSON.parse(fs.readFileSync(linesPath, "utf-8"));
  const segments = JSON.parse(fs.readFileSync(segmentsPath, "utf-8"));
  const stations = JSON.parse(fs.readFileSync(stationsPath, "utf-8"));

  const result = validateMetroDataset({ cities, lines, segments, stations });

  if (result.warnings.length > 0) {
    console.warn(`\n⚠️  Warnings (${result.warnings.length}):`);
    result.warnings.forEach((w) => console.warn(`   • ${w}`));
  }

  if (!result.valid || !result.dataset) {
    console.error(`\n❌ Validation Failed with ${result.errors.length} error(s):`);
    result.errors.forEach((e) => console.error(`   • ${e}`));
    process.exit(1);
  }

  console.log("\n✅ Validation Successful!");
  console.log(`   • Cities loaded: ${result.dataset.cities.length}`);
  console.log(`   • Lines loaded: ${result.dataset.lines.length}`);
  console.log(`   • Segments loaded: ${result.dataset.segments.features.length}`);
  console.log(`   • Stations loaded: ${result.dataset.stations.features.length}`);
  console.log("\nAll schema and relational integrity checks passed.");
}

runValidation();
