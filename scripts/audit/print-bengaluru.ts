import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data");

const lines = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "lines.json"), "utf8"));
const blrLines = lines.filter((l: any) => l.city_id === "bengaluru");

console.log(`\n==================================================`);
console.log(`🚇 BENGALURU LINES (${blrLines.length})`);
console.log(`==================================================`);
console.table(
  blrLines.map((l: any) => ({
    id: l.id,
    name: l.name,
    color: l.color,
    operator: l.operator,
  }))
);

const segments = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "segments.geojson"), "utf8")).features;
const blrSegments = segments.filter(
  (s: any) => (s.properties.city_id || s.properties.city).toLowerCase() === "bengaluru"
);

console.log(`\n==================================================`);
console.log(`🛤️  BENGALURU SEGMENTS (${blrSegments.length})`);
console.log(`==================================================`);
console.table(
  blrSegments.map((s: any) => ({
    id: s.properties.segment_id,
    line_id: s.properties.line_id,
    name: s.properties.line_name,
    phase: s.properties.phase,
    status: s.properties.status,
    inaugurated_on: s.properties.inaugurated_on,
    expected_completion: s.properties.expected_completion,
    source: s.properties.source,
  }))
);

// Check Yellow Line
const yellowSeg = blrSegments.find(
  (s: any) => s.properties.line_id === "blr-yellow" || s.properties.segment_id.includes("yellow")
);

console.log("\n==================================================");
console.log("🟡 YELLOW LINE (RV Road - Bommasandra) STATUS CHECK");
console.log("==================================================");
if (yellowSeg) {
  console.log(`Segment ID:           ${yellowSeg.properties.segment_id}`);
  console.log(`Line Name:            ${yellowSeg.properties.line_name}`);
  console.log(`Active Status:        ${yellowSeg.properties.status}`);
  console.log(`Inaugurated On:       ${yellowSeg.properties.inaugurated_on}`);
  console.log(`Expected Completion:  ${yellowSeg.properties.expected_completion}`);
  console.log(`Source:               ${yellowSeg.properties.source}`);
  console.log(`\nFINDING: The Yellow Line is present in the active dataset, but its status is currently "${yellowSeg.properties.status}" (with expected_completion: "${yellowSeg.properties.expected_completion}"), NOT "operational".`);
} else {
  console.log("Yellow Line segment NOT found!");
}
