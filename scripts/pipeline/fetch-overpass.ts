import fs from "node:fs";
import path from "node:path";

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export async function fetchOverpassDataForCity(
  cityId: string,
  bbox: [number, number, number, number],
  force = false
): Promise<any> {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const rawDir = path.resolve(process.cwd(), "data", "raw");
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
  }

  const cacheFile = path.join(rawDir, `${cityId}.json`);
  if (!force && fs.existsSync(cacheFile)) {
    console.log(`📦 Using cached Overpass data for ${cityId} from ${cacheFile}`);
    return JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
  }

  console.log(`🌐 Querying Overpass API for ${cityId} (bbox: [${minLng}, ${minLat}, ${maxLng}, ${maxLat}])...`);

  const query = `[out:json][timeout:90];
(
  // Metro & Light Rail Route Relations
  relation["route"="subway"](${minLat},${minLng},${maxLat},${maxLng});
  relation["route"="light_rail"](${minLat},${minLng},${maxLat},${maxLng});
  relation["railway"="subway"](${minLat},${minLng},${maxLat},${maxLng});
  relation["railway"="construction"]["construction"="subway"](${minLat},${minLng},${maxLat},${maxLng});
  relation["railway"="proposed"]["proposed"="subway"](${minLat},${minLng},${maxLat},${maxLng});

  // Under-construction and proposed tracks/ways with geometry
  way["railway"="construction"]["construction"="subway"](${minLat},${minLng},${maxLat},${maxLng});
  way["railway"="construction"]["construction"="light_rail"](${minLat},${minLng},${maxLat},${maxLng});
  way["railway"="proposed"]["proposed"="subway"](${minLat},${minLng},${maxLat},${maxLng});
  way["railway"="proposed"]["proposed"="light_rail"](${minLat},${minLng},${maxLat},${maxLng});

  // Stations: Operational, Light rail, and Under Construction
  node["railway"="station"]["subway"="yes"](${minLat},${minLng},${maxLat},${maxLng});
  node["station"="subway"](${minLat},${minLng},${maxLat},${maxLng});
  node["railway"="station"]["light_rail"="yes"](${minLat},${minLng},${maxLat},${maxLng});
  node["station"="light_rail"](${minLat},${minLng},${maxLat},${maxLng});
  node["railway"="station"]["construction"="subway"](${minLat},${minLng},${maxLat},${maxLng});
  node["railway"="station"]["construction"="light_rail"](${minLat},${minLng},${maxLat},${maxLng});
  node["railway"="construction"]["construction"="station"](${minLat},${minLng},${maxLat},${maxLng});
);
out body geom;
`;

  let lastError: Error | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`   Trying ${endpoint}...`);
      const response = await fetch(endpoint, {
        method: "POST",
        signal: AbortSignal.timeout(60000),
        headers: {
          "User-Agent": "IndianMetroTracker/1.0",
          "Accept": "*/*",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      if (!json.elements || !Array.isArray(json.elements)) {
        throw new Error("Invalid Overpass response: missing 'elements' array");
      }

      fs.writeFileSync(cacheFile, JSON.stringify(json, null, 2), "utf-8");
      console.log(`✅ Saved ${json.elements.length} elements for ${cityId} to ${cacheFile}`);
      return json;
    } catch (err: any) {
      console.warn(`   ⚠️ Endpoint ${endpoint} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`All Overpass endpoints failed for ${cityId}: ${lastError?.message}`);
}

// CLI runner if invoked directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const cityArg = args.find((a) => a.startsWith("--city="))?.split("=")[1];
  const force = args.includes("--force");

  const citiesPath = path.resolve(process.cwd(), "data", "cities.json");
  const cities = JSON.parse(fs.readFileSync(citiesPath, "utf-8"));

  const targetCities = cityArg
    ? cities.filter((c: any) => c.id.toLowerCase() === cityArg.toLowerCase())
    : cities;

  (async () => {
    for (const city of targetCities) {
      await fetchOverpassDataForCity(city.id, city.bbox, force);
    }
  })().catch((err) => {
    console.error("❌ Fetch script failed:", err);
    process.exit(1);
  });
}
