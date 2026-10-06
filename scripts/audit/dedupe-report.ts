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
    name: string;
    lat: number;
    lon: number;
    coords: [number, number];
  }> = [];

  const mergedNodes: Array<{
    droppedOsmId: number;
    droppedName: string;
    lat: number;
    lon: number;
    mergedIntoOsmId: number;
    mergedIntoName: string;
    distanceMetres: number;
    differentNames: boolean;
  }> = [];

  for (const node of stationNodes) {
    const rawName = node.tags!.name || node.tags!["name:en"] || `Station ${node.id}`;
    const cleanName = rawName
      .replace(/\s+metro\s+station/i, "")
      .replace(/\s+station/i, "")
      .trim();

    const coords: [number, number] = [
      Number(Number(node.lon).toFixed(6)),
      Number(Number(node.lat).toFixed(6)),
    ];

    // Deduplication rule from merge-overrides.ts:
    // pointDistanceKm < 0.08 (80m) OR (same name AND pointDistanceKm < 0.3 (300m))
    let matched: (typeof retainedNodes)[0] | null = null;
    let matchedDistM = Infinity;

    for (const r of retainedNodes) {
      const distM = pointDistanceM(coords, r.coords);
      const isProximityMatch = distM < 80;
      const isNameMatch = r.name.toLowerCase() === cleanName.toLowerCase() && distM < 300;

      if (isProximityMatch || isNameMatch) {
        matched = r;
        matchedDistM = distM;
        break;
      }
    }

    if (matched) {
      mergedNodes.push({
        droppedOsmId: node.id,
        droppedName: cleanName,
        lat: Number(Number(node.lat).toFixed(6)),
        lon: Number(Number(node.lon).toFixed(6)),
        mergedIntoOsmId: matched.osmId,
        mergedIntoName: matched.name,
        distanceMetres: Number(matchedDistM.toFixed(1)),
        differentNames: cleanName.toLowerCase() !== matched.name.toLowerCase(),
      });
    } else {
      retainedNodes.push({
        osmId: node.id,
        name: cleanName,
        lat: Number(Number(node.lat).toFixed(6)),
        lon: Number(Number(node.lon).toFixed(6)),
        coords,
      });
    }
  }

  console.log(`\n======================================================`);
  console.log(`📊 Station Deduplication Report for ${cityId.toUpperCase()}`);
  console.log(`======================================================`);
  console.log(`Raw station nodes extracted: ${stationNodes.length}`);
  console.log(`Unique master stations retained: ${retainedNodes.length}`);
  console.log(`Station nodes merged/dropped: ${mergedNodes.length}`);

  console.log(`\n--- ALL MERGED / DROPPED NODES (${mergedNodes.length}) ---`);
  console.table(
    mergedNodes.map((m) => ({
      "OSM ID": m.droppedOsmId,
      Name: m.droppedName,
      "Lat / Lon": `${m.lat}, ${m.lon}`,
      "Merged Into ID": m.mergedIntoOsmId,
      "Merged Into Name": m.mergedIntoName,
      "Distance (m)": m.distanceMetres,
      "Diff Name?": m.differentNames ? "YES" : "No",
    }))
  );

  const diffNameNodes = mergedNodes.filter((m) => m.differentNames);
  if (diffNameNodes.length > 0) {
    console.log(`\n⚠️  Merged Nodes with DIFFERENT Names (${diffNameNodes.length}):`);
    console.table(
      diffNameNodes.map((m) => ({
        "OSM ID": m.droppedOsmId,
        Name: m.droppedName,
        "Lat / Lon": `${m.lat}, ${m.lon}`,
        "Merged Into ID": m.mergedIntoOsmId,
        "Merged Into Name": m.mergedIntoName,
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
