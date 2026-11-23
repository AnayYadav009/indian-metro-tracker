import fs from "node:fs";
import path from "node:path";
import { fetchOverpassDataForCity } from "./fetch-overpass";
import { normalizeOverpassCity } from "./normalize";
import { mergeCityOverrides, type CityOverrideData, type InterchangeCorrectionsMap } from "./merge-overrides";
import { validateMetroDataset } from "../../lib/data-validator";
import { atomicWriteFiles } from "../lib/atomic-write";
import { readJsonFile } from "../lib/load-dataset";
import type { City, Line, SegmentFeature, StationFeature } from "../../types/metro";

const DATA_DIR = path.resolve(process.cwd(), "data");

export function replaceCityRecords<T>(
  existing: T[],
  replacements: T[],
  belongsToCity: (record: T) => boolean,
  getId: (record: T) => string
): T[] {
  const remaining = new Map(replacements.map((record) => [getId(record), record]));
  const merged = existing.reduce<T[]>((result, record) => {
    if (!belongsToCity(record)) return (result.push(record), result);
    const id = getId(record);
    const replacement = remaining.get(id);
    if (replacement) result.push(replacement), remaining.delete(id);
    return result;
  }, []);
  return [...merged, ...remaining.values()];
}

export async function buildCityData(cityId: string, forceFetch = false): Promise<{
  city: City;
  lines: Line[];
  segments: SegmentFeature[];
  stations: StationFeature[];
}> {
  console.log(`\n======================================================`);
  console.log(`🚀 Building Real Data for City: ${cityId.toUpperCase()}`);
  console.log(`======================================================`);

  const overridesPath = path.join(DATA_DIR, "overrides", `${cityId}.json`);
  if (!fs.existsSync(overridesPath)) {
    throw new Error(`Missing overrides file at ${overridesPath}`);
  }
  const overrides = readJsonFile<CityOverrideData>(overridesPath);

  // 1. Fetch Overpass
  const rawData = await fetchOverpassDataForCity(cityId, overrides.city.bbox, forceFetch);

  // 2. Normalize
  console.log(`⚙️  Normalizing OSM primitives for ${cityId}...`);
  const routeWayOrders = Object.fromEntries(
    overrides.segments
      .filter((segment) => segment.osmId && segment.orderedWayIds)
      .map((segment) => [segment.osmId!, segment.orderedWayIds!])
  );
  const normalized = normalizeOverpassCity(cityId, rawData, routeWayOrders);
  console.log(`   Found ${normalized.segments.length} route segments and ${normalized.stations.length} stations.`);
  console.log(
    `   Filtered ${normalized.filteredInactiveWays?.length || 0} inactive route way member(s).`
  );
  for (const { relationId, wayId } of normalized.filteredInactiveWays || []) {
    console.log(`   • relation ${relationId}: excluded inactive way ${wayId}`);
  }

  // Check cache file mtime for retrieved_at date
  const rawCacheFile = path.resolve(process.cwd(), "data", "raw", `${cityId}.json`);
  let retrievedAt: string | undefined;
  if (fs.existsSync(rawCacheFile)) {
    try {
      retrievedAt = fs.statSync(rawCacheFile).mtime.toISOString().slice(0, 10);
    } catch {
      // ignore
    }
  }

  // 3. Merge Overrides (load interchange corrections once)
  console.log(`🔗 Merging official metadata & overrides for ${cityId}...`);
  const interchangesPath = path.join(DATA_DIR, "overrides", "interchanges.json");
  let interchangeCorrections: InterchangeCorrectionsMap = {};
  if (fs.existsSync(interchangesPath)) {
    try {
      const raw = readJsonFile<Record<string, unknown>>(interchangesPath);
      // Strip the _comment key (metadata), keep only station_id keyed entries
      const { _comment: _ignored, ...corrections } = raw;
      interchangeCorrections = corrections as InterchangeCorrectionsMap;
    } catch {
      console.warn(`⚠️  Could not parse interchanges.json — skipping corrections`);
    }
  }
  const { segments, stations } = mergeCityOverrides(normalized, overrides, retrievedAt, interchangeCorrections);
  console.log(`   Generated ${segments.length} validated segments and ${stations.length} stations.`);

  // 4. Validate isolated city dataset
  console.log(`🔍 Running schema & relational validation for ${cityId}...`);
  const validation = validateMetroDataset({
    cities: [overrides.city],
    lines: overrides.lines,
    segments: { type: "FeatureCollection", features: segments },
    stations: { type: "FeatureCollection", features: stations },
  });

  if (validation.warnings.length > 0) {
    console.warn(`⚠️  Warnings for ${cityId} (${validation.warnings.length}):`);
    validation.warnings.slice(0, 5).forEach((w) => console.warn(`   • ${w}`));
  }

  if (!validation.valid || !validation.dataset) {
    console.error(`❌ Validation failed for ${cityId} with ${validation.errors.length} error(s):`);
    validation.errors.forEach((e) => console.error(`   • ${e}`));
    throw new Error(`Data validation failed for city ${cityId}`);
  }

  console.log(`✅ City ${cityId.toUpperCase()} passed validation successfully!`);

  return {
    city: {
      ...overrides.city,
      provenance: overrides.city.provenance || { status: "unverified" },
    },
    lines: overrides.lines.map((l) => ({
      ...l,
      city_id: (l as any).city_id || overrides.city.id,
      provenance: l.provenance || { status: "unverified" },
    })),
    segments,
    stations,
  };
}

export function saveActiveDataset(dataset: {
  cities: City[];
  lines: Line[];
  segments: SegmentFeature[];
  stations: StationFeature[];
}) {
  // 1. Run full schema and relational validation on the merged dataset
  console.log(`\n🔍 Re-validating full merged dataset before saving...`);
  const validation = validateMetroDataset({
    cities: dataset.cities,
    lines: dataset.lines,
    segments: { type: "FeatureCollection", features: dataset.segments },
    stations: { type: "FeatureCollection", features: dataset.stations },
  });

  if (!validation.valid || !validation.dataset) {
    console.error(`❌ Merged dataset validation failed with ${validation.errors.length} error(s):`);
    validation.errors.forEach((e) => console.error(`   • ${e}`));
    throw new Error(
      `Cannot save active dataset: Merged validation failed with ${validation.errors.length} error(s)`
    );
  }

  console.log(`\n💾 Writing active real dataset to /data/ atomically...`);

  const filesToWrite = [
    {
      target: path.join(DATA_DIR, "cities.json"),
      content: JSON.stringify(dataset.cities, null, 2),
    },
    {
      target: path.join(DATA_DIR, "lines.json"),
      content: JSON.stringify(dataset.lines, null, 2),
    },
    {
      target: path.join(DATA_DIR, "segments.geojson"),
      content: JSON.stringify(
        { type: "FeatureCollection", features: dataset.segments },
        null,
        2
      ),
    },
    {
      target: path.join(DATA_DIR, "stations.geojson"),
      content: JSON.stringify(
        { type: "FeatureCollection", features: dataset.stations },
        null,
        2
      ),
    },
  ];

  atomicWriteFiles(filesToWrite);
  console.log(`✅ Active dataset written and verified atomically.`);
}

// CLI runner
if (require.main === module) {
  const args = process.argv.slice(2);
  const cityArg = args.find((a) => a.startsWith("--city="))?.split("=")[1];
  const force = args.includes("--force");

  (async () => {
    if (cityArg) {
      const cityData = await buildCityData(cityArg, force);
      // Load other existing cities if available
      const citiesFile = path.join(DATA_DIR, "cities.json");
      const linesFile = path.join(DATA_DIR, "lines.json");
      const segsFile = path.join(DATA_DIR, "segments.geojson");
      const stnsFile = path.join(DATA_DIR, "stations.geojson");

      const existingCities = fs.existsSync(citiesFile) ? readJsonFile<City[]>(citiesFile) : [],
        existingLines = fs.existsSync(linesFile) ? readJsonFile<Line[]>(linesFile) : [];
      const existingSegs = fs.existsSync(segsFile) ? readJsonFile<{ features: SegmentFeature[] }>(segsFile).features : [],
        existingStns = fs.existsSync(stnsFile) ? readJsonFile<{ features: StationFeature[] }>(stnsFile).features : [];

      // Replace or merge city
      const targetCity = cityArg.toLowerCase();
      const mergedCities = replaceCityRecords(
        existingCities,
        [cityData.city],
        (city) => city.id.toLowerCase() === targetCity,
        (city) => city.id
      );
      const mergedLines = replaceCityRecords(
        existingLines,
        cityData.lines,
        (line) => (line.city_id || line.city).toLowerCase() === targetCity,
        (line) => line.id
      );
      const mergedSegs = replaceCityRecords(
        existingSegs,
        cityData.segments,
        (segment: any) =>
          (segment.properties.city_id || segment.properties.city).toLowerCase() === targetCity,
        (segment: any) => segment.properties.segment_id
      );
      const mergedStns = replaceCityRecords(
        existingStns,
        cityData.stations,
        (station: any) =>
          (station.properties.city_id || station.properties.city).toLowerCase() === targetCity,
        (station: any) => station.properties.station_id
      );

      saveActiveDataset({
        cities: mergedCities,
        lines: mergedLines,
        segments: mergedSegs,
        stations: mergedStns,
      });

      console.log(`\n🎉 Onboarding of ${cityArg} completed and saved.`);
    } else {
      console.log("Usage: npx tsx scripts/pipeline/build-real-data.ts --city=<cityId> [--force]");
    }
  })().catch((err) => {
    console.error("❌ Build real data failed:", err);
    process.exit(1);
  });
}
