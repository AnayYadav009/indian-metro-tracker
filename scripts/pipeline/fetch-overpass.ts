import fs from "node:fs";
import path from "node:path";

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

const OVERPASS_ENDPOINTS = [
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export async function fetchOverpassDataForCity(
  cityId: string,
  bbox: [number, number, number, number],
  force = false,
  backoffMs = 1000
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
  node["railway"="stop"]["subway"="yes"](${minLat},${minLng},${maxLat},${maxLng});
  node["railway"="station"]["light_rail"="yes"](${minLat},${minLng},${maxLat},${maxLng});
  node["station"="light_rail"](${minLat},${minLng},${maxLat},${maxLng});
  node["railway"="station"]["construction"="subway"](${minLat},${minLng},${maxLat},${maxLng});
  node["railway"="station"]["construction"="light_rail"](${minLat},${minLng},${maxLat},${maxLng});
  node["railway"="construction"]["construction"="station"](${minLat},${minLng},${maxLat},${maxLng});
);
out body geom;
`;

  let lastError: Error | null = null;
  for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
    const endpoint = OVERPASS_ENDPOINTS[i];
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

      // Atomically write cache to avoid partial file corruption
      const tempCacheFile = `${cacheFile}.tmp`;
      fs.writeFileSync(tempCacheFile, JSON.stringify(json, null, 2), "utf-8");
      fs.renameSync(tempCacheFile, cacheFile);

      console.log(`✅ Saved ${json.elements.length} elements for ${cityId} to ${cacheFile}`);
      return json;
    } catch (err: any) {
      console.warn(`   ⚠️ Endpoint ${endpoint} failed: ${err.message}`);
      lastError = err;

      // Small backoff before attempting next mirror endpoint
      if (i < OVERPASS_ENDPOINTS.length - 1 && backoffMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  // If all endpoints failed but an existing cache file exists, gracefully fall back with warning
  if (fs.existsSync(cacheFile)) {
    try {
      console.warn(
        `⚠️  All Overpass mirrors failed for ${cityId}. Falling back to previously cached dataset at ${cacheFile}.`
      );
      return JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    } catch {
      // If cached file is unreadable, proceed to throw lastError
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

  const targetCities: { id: string; bbox: [number, number, number, number] }[] = [];
  if (cityArg) {
    const foundInCities = cities.find((c: any) => c.id.toLowerCase() === cityArg.toLowerCase());
    if (foundInCities) {
      targetCities.push(foundInCities);
    } else {
      const overridePath = path.resolve(process.cwd(), "data", "overrides", `${cityArg.toLowerCase()}.json`);
      if (fs.existsSync(overridePath)) {
        const overrideData = JSON.parse(fs.readFileSync(overridePath, "utf-8"));
        targetCities.push({ id: overrideData.city.id, bbox: overrideData.city.bbox });
      } else {
        console.error(`City ${cityArg} not found in cities.json or overrides directory.`);
      }
    }
  } else {
    targetCities.push(...cities);
  }

  (async () => {
    for (const city of targetCities) {
      await fetchOverpassDataForCity(city.id, city.bbox, force);
    }
  })().catch((err) => {
    console.error("❌ Fetch script failed:", err);
    process.exit(1);
  });
}
