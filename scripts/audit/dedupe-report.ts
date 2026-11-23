import fs from "node:fs";
import path from "node:path";

interface RawNode {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

function pointDistanceM(p1: [number, number], p2: [number, number]): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const dLon = ((p2[0] - p1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[1] * Math.PI) / 180) *
      Math.cos((p2[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function generateDedupeReport(cityId: string) {
  const rawPath = path.resolve(process.cwd(), "data", "raw", `${cityId}.json`);
  if (!fs.existsSync(rawPath)) {
    throw new Error(`Raw Overpass data not found at ${rawPath}`);
  }

  const overridesPath = path.resolve(process.cwd(), "data", "overrides", `${cityId}.json`);
  let dedupeRadiusM = 350;
  const aliasMap = new Map<string, string>();

  if (fs.existsSync(overridesPath)) {
    const overrides = JSON.parse(fs.readFileSync(overridesPath, "utf-8"));
    if (overrides.dedupeRadiusM) dedupeRadiusM = overrides.dedupeRadiusM;
    if (overrides.stationAliases) {
      for (const [k, v] of Object.entries(overrides.stationAliases)) {
        aliasMap.set(k.toLowerCase().trim(), (v as string).trim());
        aliasMap.set((v as string).toLowerCase().trim(), k.trim());
      }
    }
  }

  const raw = JSON.parse(fs.readFileSync(rawPath, "utf-8"));
  const elements: RawNode[] = raw.elements || [];

  // Filter station nodes using identical predicate as normalize.ts
  const stationNodes = elements.filter(
    (e) =>
      e.type === "node" &&
      e.tags &&
      e.tags.name &&
      (e.tags.railway === "station" ||
        e.tags.station === "subway" ||
        e.tags.subway === "yes" ||
        e.tags.station === "light_rail" ||
        e.tags.light_rail === "yes" ||
        (e.tags.railway === "construction" &&
          (e.tags.construction === "station" || e.tags.subway === "yes")))
  );

  const retainedNodes: Array<{
    osmId: number;
    rawName: string;
    cleanName: string;
    resolvedName: string;
    lat: number;
    lon: number;
    coords: [number, number];
    tags?: Record<string, string>;
  }> = [];

  const mergedNodes: Array<{
    droppedOsmId: number;
    rawName: string;
    cleanName: string;
    resolvedName: string;
    lat: number;
    lon: number;
    mergedIntoOsmId: number;
    mergedIntoRawName: string;
    mergedIntoFinalName: string;
    distanceMetres: number;
    differentNames: boolean;
  }> = [];

  for (const node of stationNodes) {
    const rawName = node.tags!.name || node.tags!["name:en"] || `Station ${node.id}`;
    // Strip line qualifiers and suffixes
    const cleanName = rawName
      .replace(/\s*\([^)]*(line|corridor|branch)[^)]*\)/gi, "")
      .replace(/\s+metro\s+station/i, "")
      .replace(/\s+station/i, "")
      .trim();

    const resolvedName = aliasMap.get(cleanName.toLowerCase()) || cleanName;

    const coords: [number, number] = [
      Number(Number(node.lon).toFixed(6)),
      Number(Number(node.lat).toFixed(6)),
    ];

    // Deduplication rule:
    // 1. Within dedupeRadiusM (default 350m) AND same base name (or alias match)
    // 2. OR within dedupeRadiusM AND both nodes share explicit interchange tags
    // Different base names never merge on proximity alone.
    let matched: (typeof retainedNodes)[0] | null = null;
    let matchedDistM = Infinity;

    for (const r of retainedNodes) {
      const distM = pointDistanceM(coords, r.coords);
      if (distM > dedupeRadiusM) continue;

      const sameName =
        r.resolvedName.toLowerCase() === resolvedName.toLowerCase() ||
        r.cleanName.toLowerCase() === cleanName.toLowerCase();
      const aliasMatch =
        aliasMap.get(r.cleanName.toLowerCase())?.toLowerCase() === cleanName.toLowerCase() ||
        aliasMap.get(r.resolvedName.toLowerCase())?.toLowerCase() === resolvedName.toLowerCase();
      const sharedInterchangeTag = Boolean(
        (node.tags?.interchange === "yes" || node.tags?.public_transport === "stop_area") &&
          (r.tags?.interchange === "yes" || r.tags?.public_transport === "stop_area")
      );

      if (sameName || aliasMatch || sharedInterchangeTag) {
        matched = r;
        matchedDistM = distM;
        break;
      }
    }

    if (matched) {
      mergedNodes.push({
        droppedOsmId: node.id,
        rawName,
        cleanName,
        resolvedName,
        lat: Number(Number(node.lat).toFixed(6)),
        lon: Number(Number(node.lon).toFixed(6)),
        mergedIntoOsmId: matched.osmId,
        mergedIntoRawName: matched.rawName,
        mergedIntoFinalName: matched.resolvedName,
        distanceMetres: Number(matchedDistM.toFixed(1)),
        differentNames: rawName.toLowerCase() !== matched.rawName.toLowerCase(),
      });
    } else {
      retainedNodes.push({
        osmId: node.id,
        rawName,
        cleanName,
        resolvedName,
        lat: Number(Number(node.lat).toFixed(6)),
        lon: Number(Number(node.lon).toFixed(6)),
        coords,
        tags: node.tags,
      });
    }
  }

  console.log(`\n======================================================`);
  console.log(`📊 Station Deduplication Report for ${cityId.toUpperCase()}`);
  console.log(`======================================================`);
  console.log(`Radius configured: ${dedupeRadiusM} m`);
  console.log(`Raw station nodes extracted: ${stationNodes.length}`);
  console.log(`Unique master stations retained: ${retainedNodes.length}`);
  console.log(`Station nodes merged/dropped: ${mergedNodes.length}`);

  console.log(`\n--- ALL MERGED / DROPPED NODES (${mergedNodes.length}) ---`);
  console.table(
    mergedNodes.map((m) => ({
      "OSM ID": m.droppedOsmId,
      Name: m.cleanName,
      "Lat / Lon": `${m.lat}, ${m.lon}`,
      "Merged Into ID": m.mergedIntoOsmId,
      "Merged Into Name": m.mergedIntoFinalName,
      "Distance (m)": m.distanceMetres,
      "Raw Diff?": m.differentNames ? "YES" : "No",
    }))
  );

  const diffNameNodes = mergedNodes.filter((m) => m.differentNames);
  if (diffNameNodes.length > 0) {
    console.log(`\n🔍 Merged Nodes with DIFFERENT Original Names (${diffNameNodes.length}):`);
    console.table(
      diffNameNodes.map((m) => ({
        "Dropped OSM ID": m.droppedOsmId,
        "Original Dropped Name": m.rawName,
        "Cleaned Dropped Name": m.cleanName,
        "Merged Into OSM ID": m.mergedIntoOsmId,
        "Original Master Name": m.mergedIntoRawName,
        "Final Merged Master Name": m.mergedIntoFinalName,
        "Distance (m)": m.distanceMetres,
      }))
    );
  }

  return { stationNodes, retainedNodes, mergedNodes };
}

// CLI runner
if (require.main === module) {
  const args = process.argv.slice(2);
  const cityArg = args.find((a) => a.startsWith("--city="))?.split("=")[1] || "delhi";
  try {
    generateDedupeReport(cityArg);
  } catch (err: any) {
    console.error("❌ Error running dedupe report:", err.message);
    process.exit(1);
  }
}
