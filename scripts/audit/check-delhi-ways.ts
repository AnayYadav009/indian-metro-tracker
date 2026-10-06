import fs from "node:fs";

const raw = JSON.parse(fs.readFileSync("data/raw/delhi.json", "utf8"));
const el = raw.elements.find((e: any) => e.id === 20300114);
console.log("Element 20300114 type:", el?.type, "tags:", el?.tags);
if (el?.members) {
  console.log("Member count:", el.members.length);
  const wayMembers = el.members.filter((m: any) => m.type === "way");
  console.log("Way members in 20300114:", wayMembers.map((m: any) => m.ref));
}

// Check which raw ways in Delhi are currently in the active dataset
const segs = JSON.parse(fs.readFileSync("data/segments.geojson", "utf8")).features;
const delSegs = segs.filter(
  (f: any) => (f.properties.city_id || f.properties.city).toLowerCase() === "delhi"
);

console.log("\nActive Delhi Segments Summary:");
for (const s of delSegs) {
  console.log(`- ${s.properties.segment_id} ("${s.properties.line_name}"): status=${s.properties.status}, source=${s.properties.source}, expected_completion=${s.properties.expected_completion}`);
}
