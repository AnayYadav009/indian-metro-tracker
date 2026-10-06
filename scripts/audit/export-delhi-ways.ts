import fs from "node:fs";
import path from "node:path";

const raw = JSON.parse(fs.readFileSync("data/raw/delhi.json", "utf8"));
const ways = raw.elements.filter(
  (e: any) =>
    e.type === "way" &&
    e.tags &&
    (e.tags.railway === "construction" ||
      e.tags.railway === "proposed" ||
      e.tags.construction === "subway" ||
      e.tags.proposed === "subway")
);

const auditDir = path.resolve(process.cwd(), "data", "raw-audit");
if (!fs.existsSync(auditDir)) {
  fs.mkdirSync(auditDir, { recursive: true });
}

const lines: string[] = [];
lines.push(`Total Raw Delhi Proposed / Construction Ways: ${ways.length}\n`);

for (let i = 0; i < ways.length; i++) {
  const w = ways[i];
  lines.push(`[${i + 1}] OSM Way ID: ${w.id}`);
  lines.push(`Tags: ${JSON.stringify(w.tags, null, 2)}`);
  lines.push(`Nodes count: ${w.nodes ? w.nodes.length : 0}`);
  if (w.geometry) {
    lines.push(`Geometry coordinate count: ${w.geometry.length}`);
    lines.push(`First coordinate: [${w.geometry[0].lon}, ${w.geometry[0].lat}]`);
    lines.push(`Last coordinate: [${w.geometry[w.geometry.length - 1].lon}, ${w.geometry[w.geometry.length - 1].lat}]`);
  }
  lines.push("--------------------------------------------------------------------------------");
}

const targetPath = path.join(auditDir, "delhi-ways.txt");
fs.writeFileSync(targetPath, lines.join("\n"), "utf8");
console.log(`Wrote ${ways.length} untruncated ways to ${targetPath}`);
