import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve(
  process.cwd(),
  "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs"
);
const targetDir = path.resolve(process.cwd(), "public");
const targetPath = path.join(targetDir, "maplibre-gl-worker.mjs");

if (!fs.existsSync(sourcePath)) {
  console.error(`❌ Source MapLibre worker file not found at: ${sourcePath}`);
  process.exit(1);
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.copyFileSync(sourcePath, targetPath);
console.log(`✅ Copied MapLibre worker to ${targetPath}`);
