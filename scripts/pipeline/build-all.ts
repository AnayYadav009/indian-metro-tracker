import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { buildCityData, saveActiveDataset } from "./build-real-data";
import { validateMetroDataset } from "../../lib/data-validator";
import type { City, Line, SegmentFeature, StationFeature } from "../../types/metro";

const DATA_DIR = path.resolve(process.cwd(), "data");

async function main() {
  const citiesPath = path.join(DATA_DIR, "cities.json");
  if (!fs.existsSync(citiesPath)) {
    throw new Error(`Cities file not found: ${citiesPath}`);
  }

  const cities: City[] = JSON.parse(fs.readFileSync(citiesPath, "utf-8"));
  console.log(`🚀 Starting batch pipeline build for ${cities.length} cities...`);

  const allCities: City[] = [];
  const allLines: Line[] = [];
  const allSegments: SegmentFeature[] = [];
  const allStations: StationFeature[] = [];

  for (const city of cities) {
    console.log(`\n--------------------------------------------`);
    console.log(`Processing city: ${city.name} (${city.id})`);
    console.log(`--------------------------------------------`);
    const cityData = await buildCityData(city.id);
    allCities.push(cityData.city);
    allLines.push(...cityData.lines);
    allSegments.push(...cityData.segments);
    allStations.push(...cityData.stations);
  }

  console.log(`\n🔍 Validating complete combined dataset...`);
  const validation = validateMetroDataset({
    cities: allCities,
    lines: allLines,
    segments: { type: "FeatureCollection", features: allSegments },
    stations: { type: "FeatureCollection", features: allStations },
  });

  if (!validation.valid || !validation.dataset) {
    console.error(`❌ Batch pipeline validation failed with ${validation.errors.length} error(s):`);
    validation.errors.forEach((e) => console.error(`   • ${e}`));
    process.exit(1);
  }

  saveActiveDataset({
    cities: allCities,
    lines: allLines,
    segments: allSegments,
    stations: allStations,
  });

  console.log(`\n✅ Running final dataset validator script...`);
  execSync("npx tsx scripts/validate-data.ts", { stdio: "inherit" });
  console.log(`\n🎉 Pipeline completed successfully for all cities!`);
}

main().catch((err) => {
  console.error("❌ Batch pipeline failed:", err);
  process.exit(1);
});
