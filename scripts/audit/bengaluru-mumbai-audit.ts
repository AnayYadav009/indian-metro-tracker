import fs from "node:fs";
import path from "node:path";
import { normalizeOverpassCity } from "../pipeline/normalize";
import { mergeCityOverrides, type CityOverrideData } from "../pipeline/merge-overrides";

const DATA_DIR = path.resolve(process.cwd(), "data");

// 1. Bengaluru Audit
console.log("==================================================");
console.log("🚇 BENGALURU ACTIVE SEGMENTS & LINES AUDIT");
console.log("==================================================");

const lines = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "lines.json"), "utf8"));
const blrLines = lines.filter((l: any) => l.city_id === "bengaluru");
console.log(`\nBengaluru Lines (${blrLines.length}):`);
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
console.log(`\nBengaluru Segments (${blrSegments.length}):`);
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

// Check Yellow Line in Bengaluru
const yellowSeg = blrSegments.find((s: any) => s.properties.line_id === "blr-yellow" || s.properties.segment_id.includes("yellow"));
console.log("\nYellow Line Status Check:");
if (yellowSeg) {
  console.log(`Found segment: ${yellowSeg.properties.segment_id} ("${yellowSeg.properties.line_name}")`);
  console.log(`Current status in active dataset: "${yellowSeg.properties.status}"`);
  console.log(`Expected completion: "${yellowSeg.properties.expected_completion}"`);
  console.log(`Inaugurated on: "${yellowSeg.properties.inaugurated_on}"`);
} else {
  console.log("Yellow Line segment NOT found in active segments!");
}

// 2. Mumbai Per-Station Diff
console.log("\n==================================================");
console.log("🏙️  MUMBAI PER-STATION DRY RUN DIFF AUDIT");
console.log("==================================================");

const stations = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "stations.geojson"), "utf8")).features;
const mumCurrentStations = stations.filter(
  (s: any) => (s.properties.city_id || s.properties.city).toLowerCase() === "mumbai"
);

// Run dry-run on Mumbai from scratch/tmp-mumbai-raw.json (or fresh fetch)
const mumRaw = JSON.parse(fs.readFileSync("scratch/tmp-mumbai-raw.json", "utf8"));
const mumOverrides: CityOverrideData = JSON.parse(fs.readFileSync("data/overrides/mumbai.json", "utf8"));
// Dry run overrides with temporary references so validation doesn't throw
const dryMumOverrides: CityOverrideData = {
  ...mumOverrides,
  segments: mumOverrides.segments.map((s) => {
    if (!s.osmId) {
      return {
        ...s,
        last_verified: s.last_verified || "2026-10-06",
        references: s.references?.length ? s.references : ["https://example.com/dry-run"],
      };
    }
    return s;
  }),
};

const normalizedMum = normalizeOverpassCity("mumbai", mumRaw);
const mergedMum = mergeCityOverrides(normalizedMum, dryMumOverrides);
const mumNewStations = mergedMum.stations;

console.log(`Active Mumbai stations: ${mumCurrentStations.length}`);
console.log(`Dry-run Mumbai stations: ${mumNewStations.length}`);

// Build maps for comparison by station_id or name/proximity
const currentMap = new Map<string, any>();
for (const s of mumCurrentStations) {
  currentMap.set(s.properties.station_id, s);
}

const newMap = new Map<string, any>();
for (const s of mumNewStations) {
  newMap.set(s.properties.station_id, s);
}

interface StationDiff {
  station_id: string;
  name: string;
  old_status: string;
  new_status: string;
  reason: string;
}

const diffs: StationDiff[] = [];

// Check stations present in current
for (const [id, cur] of currentMap.entries()) {
  const next = newMap.get(id);
  if (!next) {
    diffs.push({
      station_id: id,
      name: cur.properties.name,
      old_status: cur.properties.status,
      new_status: "DISAPPEARED / DROPPED",
      reason: "Station ID not generated in fresh run (name slug collision or merged by proximity into another node)",
    });
  } else if (cur.properties.status !== next.properties.status) {
    diffs.push({
      station_id: id,
      name: cur.properties.name,
      old_status: cur.properties.status,
      new_status: next.properties.status,
      reason: `Status changed from ${cur.properties.status} to ${next.properties.status} due to closest segment proximity matching to a construction/planned way`,
    });
  }
}

// Check newly added stations in dry run
const newlyAdded: StationDiff[] = [];
for (const [id, next] of newMap.entries()) {
  if (!currentMap.has(id)) {
    newlyAdded.push({
      station_id: id,
      name: next.properties.name,
      old_status: "NONE (NEW)",
      new_status: next.properties.status,
      reason: "Newly extracted from Phase 1 way/construction station query",
    });
  }
}

console.log(`\nStatus Changes & Disappeared Stations (${diffs.length}):`);
console.table(diffs);

console.log(`\nNewly Discovered Stations (${newlyAdded.length}):`);
console.table(newlyAdded.slice(0, 15)); // show first 15 for concise display
if (newlyAdded.length > 15) {
  console.log(`... and ${newlyAdded.length - 15} more new stations.`);
}
