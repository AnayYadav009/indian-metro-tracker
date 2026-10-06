import fs from "node:fs";
import path from "node:path";
import { normalizeOverpassCity } from "../pipeline/normalize";
import { mergeCityOverrides, type CityOverrideData } from "../pipeline/merge-overrides";

const DATA_DIR = path.resolve(process.cwd(), "data");

const currentStations = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "stations.geojson"), "utf8")
).features.filter((f: any) => (f.properties.city_id || f.properties.city).toLowerCase() === "mumbai");

const mumRaw = JSON.parse(fs.readFileSync("scratch/tmp-mumbai-raw.json", "utf8"));
const mumOverrides: CityOverrideData = JSON.parse(fs.readFileSync("data/overrides/mumbai.json", "utf8"));
const dryOverrides: CityOverrideData = {
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

const normalized = normalizeOverpassCity("mumbai", mumRaw);
const merged = mergeCityOverrides(normalized, dryOverrides);
const newStations = merged.stations;

console.log(`\nActive Mumbai Stations Count: ${currentStations.length}`);
console.log(`Fresh Dry-Run Mumbai Stations Count: ${newStations.length}`);

// Index by station_id
const currentById = new Map<string, any>();
for (const s of currentStations) {
  currentById.set(s.properties.station_id, s);
}

const newById = new Map<string, any>();
for (const s of newStations) {
  newById.set(s.properties.station_id, s);
}

// Check old vs new
interface ChangeRow {
  station_id: string;
  name: string;
  old_status: string;
  new_status: string;
  reason: string;
}

const statusChanges: ChangeRow[] = [];
const disappearedOperational: ChangeRow[] = [];
const disappearedOther: ChangeRow[] = [];

for (const [id, cur] of currentById.entries()) {
  const next = newById.get(id);
  if (!next) {
    // Check if the station node exists under a slightly different slug or if it was merged by proximity
    const curCoords = cur.geometry.coordinates;
    const nearbyInNew = newStations.find((ns: any) => {
      const d = Math.hypot(ns.geometry.coordinates[0] - curCoords[0], ns.geometry.coordinates[1] - curCoords[1]);
      return d < 0.003; // within ~300m
    });

    const reason = nearbyInNew
      ? `Merged into or re-slugged as '${nearbyInNew.properties.station_id}' ("${nearbyInNew.properties.name}") in fresh run`
      : `Station node not present in fresh Overpass elements or excluded by filter`;

    const row: ChangeRow = {
      station_id: id,
      name: cur.properties.name,
      old_status: cur.properties.status,
      new_status: "DISAPPEARED",
      reason,
    };

    if (cur.properties.status === "operational") {
      disappearedOperational.push(row);
    } else {
      disappearedOther.push(row);
    }
  } else if (cur.properties.status !== next.properties.status) {
    statusChanges.push({
      station_id: id,
      name: cur.properties.name,
      old_status: cur.properties.status,
      new_status: next.properties.status,
      reason: `Line proximity re-associated station to a different segment (closest segment status: ${next.properties.status})`,
    });
  }
}

console.log(`\n======================================================================`);
console.log(`🔴 DISAPPEARED OPERATIONAL STATIONS (${disappearedOperational.length}):`);
console.log(`======================================================================`);
console.table(disappearedOperational);

console.log(`\n======================================================================`);
console.log(`🔄 STATIONS WITH CHANGED STATUS (${statusChanges.length}):`);
console.log(`======================================================================`);
console.table(statusChanges);
