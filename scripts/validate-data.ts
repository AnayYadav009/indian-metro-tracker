import { validateMetroDataset } from "../lib/data-validator";
import { loadMetroDatasetFromDisk } from "./lib/load-dataset";

function runValidation() {
  console.log("🔍 Validating Indian Metro Network Tracker datasets...");

  const { cities, lines, segments, stations } = loadMetroDatasetFromDisk();

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
