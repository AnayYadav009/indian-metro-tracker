import { gzipSync } from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "out");
const baselinePath = path.join(root, "scripts", "static-size-baseline.json");
const writeBaseline = process.argv.includes("--write-baseline");
const dataFiles = [
  "cities.json",
  "lines.json",
  "segments.geojson",
  "stations.geojson",
  "fares.json",
  "timings.json",
];

if (!fs.existsSync(path.join(outDir, "index.html"))) {
  console.error("Static export not found. Run `npm run build` first.");
  process.exit(1);
}

function gzipSize(file) {
  return gzipSync(fs.readFileSync(file), { level: 9 }).length;
}

const data = dataFiles.map((file) => {
  const filePath = path.join(root, "data", file);
  if (!fs.existsSync(filePath)) throw new Error(`Missing data payload: ${filePath}`);
  return { file, gzipBytes: gzipSize(filePath) };
});

const html = fs.readFileSync(path.join(outDir, "index.html"), "utf8");
const scriptPaths = new Set([
  ...[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]),
  ...[...html.matchAll(/<link\b(?=[^>]*\bas="script")(?=[^>]*\bhref="([^"]+)")[^>]*>/g)].map((match) => match[1]),
]);
const initialJs = [...scriptPaths]
  .map((url) => new URL(url, "https://static-export.invalid"))
  .filter((url) => url.pathname.includes("/_next/"))
  .map((url) => {
    const file = path.join(outDir, url.pathname.slice(url.pathname.indexOf("/_next/") + 1));
    if (!fs.existsSync(file)) throw new Error(`Missing exported JavaScript asset: ${url.pathname}`);
    return file;
  })
  .sort()
  .map((file) => ({ file: path.relative(outDir, file).replaceAll(path.sep, "/"), gzipBytes: gzipSize(file) }));

if (initialJs.length === 0) {
  throw new Error("No initial JavaScript assets found in out/index.html");
}

const total = (files) => files.reduce((sum, file) => sum + file.gzipBytes, 0);
const measured = {
  dataGzipBytes: total(data),
  initialJsGzipBytes: total(initialJs),
};
const baseline = {
  method: "gzip level 9; sum of each runtime data file and homepage initial JS asset",
  dataGzipBytes: measured.dataGzipBytes,
  initialJsGzipBytes: measured.initialJsGzipBytes,
};

if (writeBaseline) {
  fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Updated measured baseline: ${path.relative(root, baselinePath)}`);
} else {
  if (!fs.existsSync(baselinePath)) {
    throw new Error("Size baseline not found. Run npm run measure:size:update-baseline after a fresh build.");
  }
  const limits = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  for (const key of ["dataGzipBytes", "initialJsGzipBytes"]) {
    if (!Number.isInteger(limits[key]) || limits[key] <= 0) throw new Error(`Invalid ${key} in ${baselinePath}`);
    if (measured[key] > limits[key]) {
      throw new Error(`${key} exceeds measured baseline: ${measured[key]} > ${limits[key]} bytes`);
    }
  }
}

const result = {
  baseline: writeBaseline ? "updated from current export" : "checked; no budget beyond recorded bytes",
  limits: writeBaseline ? baseline : JSON.parse(fs.readFileSync(baselinePath, "utf8")),
  data: { gzipBytes: total(data), files: data },
  initialJs: { gzipBytes: total(initialJs), files: initialJs },
};
const report = JSON.stringify(result, null, 2);
console.log(report);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    "## Static export size baseline",
    "",
    "Limits are the recorded gzip measurements; no additional budget is applied.",
    "",
    `- Gzipped runtime data files: **${result.data.gzipBytes.toLocaleString("en-US")} bytes**`,
    `- Gzipped homepage initial JavaScript: **${result.initialJs.gzipBytes.toLocaleString("en-US")} bytes**`,
    "",
    "```json",
    report,
    "```",
    "",
  ].join("\n"));
}
