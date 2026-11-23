import fs from "node:fs";
import path from "node:path";

const filesToCopy = [
  "maplibre-gl-worker.mjs",
  "maplibre-gl-shared.mjs",
];

const sourceDir = path.resolve(process.cwd(), "node_modules/maplibre-gl/dist");
const targetDir = path.resolve(process.cwd(), "public");

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

for (const file of filesToCopy) {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Source MapLibre file not found at: ${sourcePath}`);
    process.exit(1);
  }

  fs.copyFileSync(sourcePath, targetPath);
  console.log(`✅ Copied MapLibre file to ${targetPath}`);
}
