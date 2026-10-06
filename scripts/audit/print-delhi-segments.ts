import fs from "node:fs";

const segs = JSON.parse(fs.readFileSync("data/segments.geojson", "utf-8")).features;
const delSegs = segs.filter(
  (f: any) => (f.properties.city_id || f.properties.city).toLowerCase() === "delhi"
);

console.log(`\nActive Delhi Segments Count: ${delSegs.length}`);
console.table(
  delSegs.map((f: any) => ({
    id: f.properties.segment_id,
    name: f.properties.line_name,
    status: f.properties.status,
    source: f.properties.source,
    references: JSON.stringify(f.properties.references),
    expected_completion: f.properties.expected_completion,
  }))
);
