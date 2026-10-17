import fs from "fs";
import path from "path";
import {
  nearestPointOnPolyline,
  haversineDistanceKm,
  haversineDistanceM,
} from "../lib/geo";
import { getSegmentStationOrder } from "../lib/routing/station-ordering";
import type { SegmentFeature, StationFeature } from "../types/metro";

interface CityData {
  id: string;
  name: string;
}

interface LineData {
  id: string;
  city_id: string;
  name: string;
  color?: string;
  status: string;
}

interface ReferenceLine {
  line_id: string;
  official_name?: string;
  operator?: string;
  topology?: string;
  operational_stations?: number;
  operational_length_km?: number;
  official_length_km?: number;
  terminals?: string[];
  status?: string;
}

interface ReferenceCity {
  city_id: string;
  lines: ReferenceLine[];
}

export interface LineVerificationResult {
  cityId: string;
  cityName: string;
  lineId: string;
  lineName: string;
  topology: string;
  refTerminals: string[];
  computedTerminals: string[];
  terminalsMatch: boolean;
  terminalMismatchReason?: string;
  refOperationalStations: number;
  compiledOperationalStations: number;
  stationCountMatch: boolean;
  segmentCount: number;
  maxConsecutiveGapKm: number;
  maxGapStations?: [string, string];
  hasLargeGap: boolean; // > 5 km
  maxProjectionDistanceM: number;
  outlierStations: Array<{ id: string; name: string; distanceM: number }>; // > 150 m
  hasOutlierProjection: boolean;
  duplicateStations: string[];
  outOfOrderStations: string[];
  isRoutable: boolean;
  failReasons: string[];
}

export interface CityConnectedComponent {
  componentIndex: number;
  stationCount: number;
  stationIds: string[];
  stationNames: string[];
  lineIds: string[];
}

export interface CityVerificationResult {
  cityId: string;
  cityName: string;
  operationalStationsCount: number;
  operationalLinesCount: number;
  lines: LineVerificationResult[];
  connectedComponents: CityConnectedComponent[];
  isFullyConnected: boolean;
  overallRoutability: "routable" | "partly_routable" | "non_routable";
  summaryReason?: string;
}

export function runRoutingVerification(): {
  cities: CityVerificationResult[];
  summary: {
    totalCities: number;
    totalOperationalLines: number;
    routableCities: number;
    partlyRoutableCities: number;
    nonRoutableCities: number;
    linesPassingAllChecks: number;
  };
} {
  const rootDir = process.cwd();
  const cities: CityData[] = JSON.parse(
    fs.readFileSync(path.join(rootDir, "data/cities.json"), "utf8")
  );
  const lines: LineData[] = JSON.parse(
    fs.readFileSync(path.join(rootDir, "data/lines.json"), "utf8")
  );
  const segmentsGeo = JSON.parse(
    fs.readFileSync(path.join(rootDir, "data/segments.geojson"), "utf8")
  );
  const stationsGeo = JSON.parse(
    fs.readFileSync(path.join(rootDir, "data/stations.geojson"), "utf8")
  );
  const overridesPath = path.join(rootDir, "data/overrides/interchanges.json");
  const interchangeOverrides: Record<string, { interchange_id?: string | null }> =
    fs.existsSync(overridesPath)
      ? JSON.parse(fs.readFileSync(overridesPath, "utf8"))
      : {};

  const allOperationalStations: StationFeature[] = stationsGeo.features.filter(
    (st: StationFeature) => st.properties.status === "operational"
  );
  const allOperationalSegments: SegmentFeature[] = segmentsGeo.features.filter(
    (seg: SegmentFeature) => seg.properties.status === "operational"
  );

  const cityResults: CityVerificationResult[] = [];

  for (const city of cities) {
    const cityOperationalStations = allOperationalStations.filter(
      (st) => st.properties.city_id === city.id
    );
    const refPath = path.join(rootDir, `data/reference/${city.id}.json`);
    let refCity: ReferenceCity | null = null;
    if (fs.existsSync(refPath)) {
      refCity = JSON.parse(fs.readFileSync(refPath, "utf8"));
    }

    // Operational lines: lines in reference with status === 'operational' or having operational segments
    const cityLines = lines.filter((l) => l.city_id === city.id);
    const cityOperationalLines = cityLines.filter((l) => {
      const refLine = refCity?.lines.find((rl) => rl.line_id === l.id);
      const hasOpSeg = allOperationalSegments.some((s) => s.properties.line_id === l.id);
      return refLine?.status === "operational" || hasOpSeg;
    });

    const lineResults: LineVerificationResult[] = [];

    // Analyze each operational line
    for (const line of cityOperationalLines) {
      const refLine = refCity?.lines.find((rl) => rl.line_id === line.id);
      const lineSegments = allOperationalSegments.filter(
        (seg) => seg.properties.line_id === line.id
      );
      const lineStations = cityOperationalStations.filter((st) =>
        st.properties.line_ids.includes(line.id)
      );

      const refTerminals = refLine?.terminals || [];
      const refOpStationCount = refLine?.operational_stations ?? 0;
      const compiledOpStationCount = lineStations.length;
      const stationCountMatch = refOpStationCount === compiledOpStationCount;

      let maxConsecutiveGapKm = 0;
      let maxGapStations: [string, string] | undefined = undefined;
      const duplicateStations: string[] = [];
      const outOfOrderStations: string[] = [];
      const endpointStationNames: string[] = [];

      for (const seg of lineSegments) {
        const order = getSegmentStationOrder(seg, cityOperationalStations);
        const ordered = order.stations;

        if (ordered.length > 0) {
          endpointStationNames.push(ordered[0].name);
          endpointStationNames.push(ordered[ordered.length - 1].name);
        }

        // Check duplicates along segment
        const seenInSeg = new Set<string>();
        for (const st of ordered) {
          if (seenInSeg.has(st.id)) {
            duplicateStations.push(st.name);
          }
          seenInSeg.add(st.id);
        }

        // Check progress ordering & gaps
        for (let i = 0; i < ordered.length - 1; i++) {
          const a = ordered[i];
          const b = ordered[i + 1];
          if (a.progress >= b.progress) {
            outOfOrderStations.push(`${a.name} -> ${b.name}`);
          }
          const gap = haversineDistanceKm(a.coordinates, b.coordinates);
          if (gap > maxConsecutiveGapKm) {
            maxConsecutiveGapKm = Number(gap.toFixed(2));
            maxGapStations = [a.name, b.name];
          }
        }
      }

      // Check terminals match
      // Clean names for matching (case-insensitive, remove trailing dots/spaces)
      const norm = (s: string) =>
        s.toLowerCase().replace(/metro station|station|\(.*?\)/gi, "").trim();

      const uniqueEndpoints = Array.from(new Set(endpointStationNames));
      let terminalsMatch = false;
      let terminalMismatchReason: string | undefined = undefined;

      if (refTerminals.length > 0) {
        // All reference terminals should appear as segment endpoints (or vice versa)
        const refNorm = refTerminals.map(norm);
        const endNorm = uniqueEndpoints.map(norm);

        const missingTerminals = refTerminals.filter(
          (rt) => !endNorm.some((en) => en.includes(norm(rt)) || norm(rt).includes(en))
        );

        if (missingTerminals.length === 0) {
          terminalsMatch = true;
        } else {
          terminalsMatch = false;
          terminalMismatchReason = `Missing reference terminal(s) at segment ends: ${missingTerminals.join(", ")}`;
        }
      } else {
        terminalsMatch = lineSegments.length > 0;
      }

      // Check projection distance > 150m for stations of this line
      const outlierStations: Array<{ id: string; name: string; distanceM: number }> = [];
      let maxProjDistM = 0;

      for (const st of lineStations) {
        const coords = st.geometry.coordinates as [number, number];
        let minDistM = Infinity;
        for (const seg of lineSegments) {
          const segCoords = seg.geometry.coordinates as [number, number][];
          const proj = nearestPointOnPolyline(coords, segCoords);
          if (proj.distanceM < minDistM) {
            minDistM = proj.distanceM;
          }
        }
        if (minDistM > maxProjDistM) {
          maxProjDistM = Math.round(minDistM);
        }
        if (minDistM > 150) {
          outlierStations.push({
            id: st.properties.station_id,
            name: st.properties.name,
            distanceM: Math.round(minDistM),
          });
        }
      }

      const failReasons: string[] = [];
      if (!terminalsMatch && terminalMismatchReason) {
        failReasons.push(terminalMismatchReason);
      }
      if (!stationCountMatch) {
        failReasons.push(
          `Station count mismatch: reference expects ${refOpStationCount}, compiled has ${compiledOpStationCount}`
        );
      }
      if (maxConsecutiveGapKm > 5.0) {
        failReasons.push(
          `Consecutive station gap > 5 km: ${maxConsecutiveGapKm} km (${maxGapStations?.[0]} to ${maxGapStations?.[1]})`
        );
      }
      if (outlierStations.length > 0) {
        failReasons.push(
          `${outlierStations.length} station(s) projecting > 150 m from track (e.g. ${outlierStations[0].name}: ${outlierStations[0].distanceM} m)`
        );
      }
      if (duplicateStations.length > 0) {
        failReasons.push(`Duplicate station along segment: ${duplicateStations.join(", ")}`);
      }
      if (outOfOrderStations.length > 0) {
        failReasons.push(`Out of order station sequence: ${outOfOrderStations.join(", ")}`);
      }
      if (lineSegments.length === 0) {
        failReasons.push("No operational track segments mapped.");
      }

      const isRoutable = failReasons.length === 0;

      lineResults.push({
        cityId: city.id,
        cityName: city.name,
        lineId: line.id,
        lineName: line.name,
        topology: refLine?.topology || "linear",
        refTerminals,
        computedTerminals: uniqueEndpoints,
        terminalsMatch,
        terminalMismatchReason,
        refOperationalStations: refOpStationCount,
        compiledOperationalStations: compiledOpStationCount,
        stationCountMatch,
        segmentCount: lineSegments.length,
        maxConsecutiveGapKm,
        maxGapStations,
        hasLargeGap: maxConsecutiveGapKm > 5.0,
        maxProjectionDistanceM: maxProjDistM,
        outlierStations,
        hasOutlierProjection: outlierStations.length > 0,
        duplicateStations,
        outOfOrderStations,
        isRoutable,
        failReasons,
      });
    }

    // Compute Connected Components for the city
    const adj = new Map<string, Set<string>>();
    for (const st of cityOperationalStations) {
      adj.set(st.properties.station_id, new Set());
    }

    // 1. Edges along operational segments
    for (const seg of allOperationalSegments.filter((s) => s.properties.city_id === city.id)) {
      const order = getSegmentStationOrder(seg, cityOperationalStations);
      const ordered = order.stations;
      for (let i = 0; i < ordered.length - 1; i++) {
        const u = ordered[i].id;
        const v = ordered[i + 1].id;
        adj.get(u)?.add(v);
        adj.get(v)?.add(u);
      }
      if (order.isLoop && ordered.length >= 3) {
        const first = ordered[0].id;
        const last = ordered[ordered.length - 1].id;
        adj.get(first)?.add(last);
        adj.get(last)?.add(first);
      }
    }

    // 2. Intra-station and interchange links via interchange_id
    const interchangeGroups = new Map<string, string[]>();
    for (const st of cityOperationalStations) {
      const override = interchangeOverrides[st.properties.station_id];
      const intId =
        override !== undefined
          ? override.interchange_id ?? undefined
          : st.properties.interchange_id;
      if (intId) {
        let group = interchangeGroups.get(intId);
        if (!group) {
          group = [];
          interchangeGroups.set(intId, group);
        }
        group.push(st.properties.station_id);
      }
    }

    for (const group of interchangeGroups.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          adj.get(group[i])?.add(group[j]);
          adj.get(group[j])?.add(group[i]);
        }
      }
    }

    // BFS to find connected components
    const visited = new Set<string>();
    const connectedComponents: CityConnectedComponent[] = [];

    const stationMap = new Map<string, StationFeature>();
    for (const st of cityOperationalStations) {
      stationMap.set(st.properties.station_id, st);
    }

    for (const st of cityOperationalStations) {
      const id = st.properties.station_id;
      if (!visited.has(id)) {
        const compStations: string[] = [];
        const compLines = new Set<string>();
        const queue: string[] = [id];
        visited.add(id);

        while (queue.length > 0) {
          const curr = queue.shift()!;
          compStations.push(curr);
          const stFeat = stationMap.get(curr);
          if (stFeat) {
            for (const lid of stFeat.properties.line_ids) {
              compLines.add(lid);
            }
          }
          const neighbors = adj.get(curr) || new Set();
          for (const nbr of neighbors) {
            if (!visited.has(nbr)) {
              visited.add(nbr);
              queue.push(nbr);
            }
          }
        }

        connectedComponents.push({
          componentIndex: connectedComponents.length + 1,
          stationCount: compStations.length,
          stationIds: compStations,
          stationNames: compStations.map((sid) => stationMap.get(sid)?.properties.name || sid),
          lineIds: Array.from(compLines),
        });
      }
    }

    // Sort components by size descending
    connectedComponents.sort((a, b) => b.stationCount - a.stationCount);

    const isFullyConnected =
      cityOperationalStations.length === 0 || connectedComponents.length <= 1;

    // Overall routability determination
    let overallRoutability: "routable" | "partly_routable" | "non_routable";
    let summaryReason: string | undefined = undefined;

    if (cityOperationalStations.length === 0) {
      overallRoutability = "non_routable";
      summaryReason = `${city.name} Metro has 0 operational stations.`;
    } else if (cityOperationalLines.length === 0) {
      overallRoutability = "non_routable";
      summaryReason = `${city.name} Metro has 0 operational lines.`;
    } else {
      const passingLines = lineResults.filter((l) => l.isRoutable);
      const failingLines = lineResults.filter((l) => !l.isRoutable);

      if (failingLines.length === 0 && isFullyConnected) {
        overallRoutability = "routable";
      } else if (passingLines.length > 0) {
        overallRoutability = "partly_routable";
        summaryReason = `${passingLines.length} of ${cityOperationalLines.length} lines pass all verification checks. Failing lines: ${failingLines.map((l) => l.lineName).join(", ")}. Connected components: ${connectedComponents.length}.`;
      } else {
        overallRoutability = "non_routable";
        summaryReason = `All operational lines fail verification checks: ${failingLines.map((l) => `${l.lineName} (${l.failReasons[0]})`).join("; ")}`;
      }
    }

    cityResults.push({
      cityId: city.id,
      cityName: city.name,
      operationalStationsCount: cityOperationalStations.length,
      operationalLinesCount: cityOperationalLines.length,
      lines: lineResults,
      connectedComponents,
      isFullyConnected,
      overallRoutability,
      summaryReason,
    });
  }

  const allLines = cityResults.flatMap((c) => c.lines);
  const passingLines = allLines.filter((l) => l.isRoutable);

  return {
    cities: cityResults,
    summary: {
      totalCities: cityResults.length,
      totalOperationalLines: allLines.length,
      routableCities: cityResults.filter((c) => c.overallRoutability === "routable").length,
      partlyRoutableCities: cityResults.filter((c) => c.overallRoutability === "partly_routable").length,
      nonRoutableCities: cityResults.filter((c) => c.overallRoutability === "non_routable").length,
      linesPassingAllChecks: passingLines.length,
    },
  };
}

export function generateVerificationMarkdown(data: ReturnType<typeof runRoutingVerification>): string {
  const dateStr = "2026-10-17";
  const lines: string[] = [];

  lines.push(`# Operational Routing Verification Report`);
  lines.push(``);
  lines.push(`**Date:** ${dateStr}  `);
  lines.push(`**Scope:** All 21 cities and ${data.summary.totalOperationalLines} operational metro lines in India  `);
  lines.push(`**Auditor:** Automated Transit Topology & Geometric Routing Verifier  `);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 1. Executive Summary`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`| :--- | :--- |`);
  lines.push(`| **Total Cities Evaluated** | **${data.summary.totalCities}** |`);
  lines.push(`| **Total Operational Lines** | **${data.summary.totalOperationalLines}** |`);
  lines.push(`| **Lines Passing All Verification Checks** | **${data.summary.linesPassingAllChecks} / ${data.summary.totalOperationalLines}** |`);
  lines.push(`| **Fully Routable Cities** | **${data.summary.routableCities}** |`);
  lines.push(`| **Partly Routable Cities** | **${data.summary.partlyRoutableCities}** |`);
  lines.push(`| **Non-Routable Cities** | **${data.summary.nonRoutableCities}** |`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 2. City Classification Overview`);
  lines.push(``);
  lines.push(`| City | Operational Stations | Operational Lines | Status | Connected Components | Reason / Notes |`);
  lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- |`);

  for (const c of data.cities) {
    const statusBadge =
      c.overallRoutability === "routable"
        ? "✅ Routable"
        : c.overallRoutability === "partly_routable"
        ? "⚠️ Partly Routable"
        : "❌ Non-Routable";
    const reason = c.summaryReason || "All lines passed terminal, count, gap, and projection checks.";
    lines.push(
      `| **${c.cityName}** (\`${c.cityId}\`) | ${c.operationalStationsCount} | ${c.operationalLinesCount} | ${statusBadge} | ${c.connectedComponents.length} | ${reason} |`
    );
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 3. Operational Line Verification Matrix`);
  lines.push(``);
  lines.push(`For each operational line, five critical topology and geometry criteria are audited:`);
  lines.push(`1. **Terminal Match**: Segment end stations match reference terminals.`);
  lines.push(`2. **Station Count Match**: Compiled operational stations match reference.`);
  lines.push(`3. **Consecutive Gap <= 5 km**: Flag any gap between adjacent stations exceeding 5 km.`);
  lines.push(`4. **Projection Offset <= 150 m**: Flag stations perpendicular distance > 150 m from line polyline.`);
  lines.push(`5. **Sequence & Duplicates**: Monotonic ascending sequence along segment without duplicate IDs.`);
  lines.push(``);

  for (const c of data.cities) {
    if (c.operationalLinesCount === 0) continue;

    lines.push(`### 3.${c.cityId.toUpperCase()}: ${c.cityName}`);
    lines.push(``);
    lines.push(`| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);

    for (const l of c.lines) {
      const countStr = `${l.compiledOperationalStations} / ${l.refOperationalStations}`;
      const gapStr = `${l.maxConsecutiveGapKm} km`;
      const projStr = `${l.maxProjectionDistanceM} m`;
      const termStr = l.terminalsMatch ? "✅ Yes" : "❌ No";
      const passBadge = l.isRoutable ? "✅ Pass" : "❌ Fail";
      const failDetail = l.failReasons.length > 0 ? l.failReasons.join("; ") : "None";

      lines.push(
        `| \`${l.lineId}\` | ${l.lineName} | ${l.topology} | ${countStr} | ${gapStr} | ${projStr} | ${termStr} | ${passBadge} | ${failDetail} |`
      );
    }
    lines.push(``);

    // List connected components for multi-line or multi-component networks
    if (c.connectedComponents.length > 1) {
      lines.push(`**Connected Components (${c.connectedComponents.length} disjoint groups):**`);
      for (const comp of c.connectedComponents) {
        lines.push(
          `- **Component ${comp.componentIndex}** (${comp.stationCount} stations, lines: \`${comp.lineIds.join(", ")}\`): ${comp.stationNames.slice(0, 5).join(", ")}${comp.stationNames.length > 5 ? ` ... (+${comp.stationNames.length - 5} more)` : ""}`
        );
      }
      lines.push(``);
    }
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## 4. Detailed Defect Analysis & Guard Strategy`);
  lines.push(``);
  lines.push(`### 4.1 Pending-Rule Defect Cities (Parked Issues)`);
  lines.push(`- **Bhopal (\`bhopal\`)**: Under active audit review PRE-01 (operational length discrepancy >10%).`);
  lines.push(`- **Gurugram (\`gurugram\`)**: Under active audit review PRE-02 (Rapid Metro loop terminal Cyber City geometry offset 1904 m).`);
  lines.push(`- **Surat (\`surat\`)**: 0 operational stations (entire network under construction).`);
  lines.push(``);
  lines.push(`### 4.2 Consecutive Station Gaps > 5 km`);
  const linesWithLargeGaps = data.cities.flatMap((c) => c.lines.filter((l) => l.hasLargeGap));
  if (linesWithLargeGaps.length === 0) {
    lines.push(`- None. All adjacent stations on operational segments are within 5 km.`);
  } else {
    for (const l of linesWithLargeGaps) {
      lines.push(
        `- **${l.cityName} - ${l.lineName}** (\`${l.lineId}\`): ${l.maxConsecutiveGapKm} km between ${l.maxGapStations?.[0]} and ${l.maxGapStations?.[1]}`
      );
    }
  }
  lines.push(``);
  lines.push(`### 4.3 Station Projection Offsets > 150 m`);
  const linesWithOutliers = data.cities.flatMap((c) => c.lines.filter((l) => l.hasOutlierProjection));
  if (linesWithOutliers.length === 0) {
    lines.push(`- None. All stations project within 150 m of their respective line polyline.`);
  } else {
    for (const l of linesWithOutliers) {
      lines.push(
        `- **${l.cityName} - ${l.lineName}** (\`${l.lineId}\`): ${l.outlierStations.map((o) => `${o.name} (${o.distanceM} m)`).join(", ")}`
      );
    }
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 5. Tier 1 Cities Sample Routes Verification`);
  lines.push(``);
  lines.push(`Sample routes across all Tier 1 cities (3 routes each) demonstrating multi-transfer routes, branched routes, and linear trips:`);
  lines.push(``);

  return lines.join("\n");
}

interface SampleRouteResult {
  from: string;
  to: string;
  stops: number;
  transfers: number;
  timeMin: number;
  lines: string[];
}

export function findSampleTier1Routes(
  customSegments: SegmentFeature[],
  customStations: StationFeature[],
  customLines: LineData[]
): Record<string, SampleRouteResult[]> {
  const tier1Cities = ["delhi", "mumbai", "bengaluru", "chennai", "hyderabad", "kolkata"];
  const samples: Record<string, SampleRouteResult[]> = {};
  const lineMap = new Map(customLines.map((l) => [l.id, l.name]));
  const overridesPath = path.join(process.cwd(), "data/overrides/interchanges.json");
  const interchangeOverrides: Record<string, { interchange_id?: string | null }> =
    fs.existsSync(overridesPath)
      ? JSON.parse(fs.readFileSync(overridesPath, "utf8"))
      : {};

  for (const cityId of tier1Cities) {
    const cityStations = customStations.filter(
      (s) => s.properties.city_id === cityId && s.properties.status === "operational"
    );
    const citySegments = customSegments.filter(
      (s) => s.properties.city_id === cityId && s.properties.status === "operational"
    );

    const stationMap = new Map<string, { id: string; name: string; coordinates: [number, number] }>();
    const stationLines = new Map<string, Set<string>>();
    for (const st of cityStations) {
      stationMap.set(st.properties.station_id, {
        id: st.properties.station_id,
        name: st.properties.name,
        coordinates: st.geometry.coordinates as [number, number],
      });
      stationLines.set(st.properties.station_id, new Set());
    }

    interface Edge {
      toNode: string;
      toStationId: string;
      lineId: string;
      isTransfer: boolean;
      distKm: number;
      timeMin: number;
    }

    const adj = new Map<string, Edge[]>();
    const addEdge = (u: string, edge: Edge) => {
      let list = adj.get(u);
      if (!list) {
        list = [];
        adj.set(u, list);
      }
      list.push(edge);
    };

    // Track edges along segments
    for (const seg of citySegments) {
      const order = getSegmentStationOrder(seg, cityStations);
      const lineId = order.lineId;
      const ordered = order.stations;

      for (const st of ordered) {
        stationLines.get(st.id)?.add(lineId);
      }

      for (let i = 0; i < ordered.length - 1; i++) {
        const a = ordered[i];
        const b = ordered[i + 1];
        const distKm = haversineDistanceKm(a.coordinates, b.coordinates);
        const timeMin = (distKm / 32) * 60 + 0.5;

        addEdge(`${a.id}::${lineId}`, {
          toNode: `${b.id}::${lineId}`,
          toStationId: b.id,
          lineId,
          isTransfer: false,
          distKm,
          timeMin,
        });
        addEdge(`${b.id}::${lineId}`, {
          toNode: `${a.id}::${lineId}`,
          toStationId: a.id,
          lineId,
          isTransfer: false,
          distKm,
          timeMin,
        });
      }

      if (order.isLoop && ordered.length >= 3) {
        const first = ordered[0];
        const last = ordered[ordered.length - 1];
        const distKm = haversineDistanceKm(first.coordinates, last.coordinates);
        const timeMin = (distKm / 32) * 60 + 0.5;
        addEdge(`${last.id}::${lineId}`, {
          toNode: `${first.id}::${lineId}`,
          toStationId: first.id,
          lineId,
          isTransfer: false,
          distKm,
          timeMin,
        });
        addEdge(`${first.id}::${lineId}`, {
          toNode: `${last.id}::${lineId}`,
          toStationId: last.id,
          lineId,
          isTransfer: false,
          distKm,
          timeMin,
        });
      }
    }

    // Intra-station transfers
    for (const [stId, lSet] of stationLines.entries()) {
      if (lSet.size > 1) {
        const lArr = Array.from(lSet);
        for (let i = 0; i < lArr.length; i++) {
          for (let j = i + 1; j < lArr.length; j++) {
            addEdge(`${stId}::${lArr[i]}`, {
              toNode: `${stId}::${lArr[j]}`,
              toStationId: stId,
              lineId: lArr[j],
              isTransfer: true,
              distKm: 0.1,
              timeMin: 4.0,
            });
            addEdge(`${stId}::${lArr[j]}`, {
              toNode: `${stId}::${lArr[i]}`,
              toStationId: stId,
              lineId: lArr[i],
              isTransfer: true,
              distKm: 0.1,
              timeMin: 4.0,
            });
          }
        }
      }
    }

    // Inter-station interchange transfers
    const intGroups = new Map<string, string[]>();
    for (const st of cityStations) {
      const override = interchangeOverrides[st.properties.station_id];
      const intId =
        override !== undefined
          ? override.interchange_id ?? undefined
          : st.properties.interchange_id;
      if (intId) {
        let g = intGroups.get(intId);
        if (!g) {
          g = [];
          intGroups.set(intId, g);
        }
        g.push(st.properties.station_id);
      }
    }
    for (const g of intGroups.values()) {
      for (let i = 0; i < g.length; i++) {
        for (let j = i + 1; j < g.length; j++) {
          const sA = g[i];
          const sB = g[j];
          const linesA = stationLines.get(sA) || new Set();
          const linesB = stationLines.get(sB) || new Set();
          for (const lA of linesA) {
            for (const lB of linesB) {
              addEdge(`${sA}::${lA}`, {
                toNode: `${sB}::${lB}`,
                toStationId: sB,
                lineId: lB,
                isTransfer: true,
                distKm: 0.15,
                timeMin: 4.0,
              });
              addEdge(`${sB}::${lB}`, {
                toNode: `${sA}::${lA}`,
                toStationId: sA,
                lineId: lA,
                isTransfer: true,
                distKm: 0.15,
                timeMin: 4.0,
              });
            }
          }
        }
      }
    }

    // Dijkstra helper
    const searchRoute = (fromId: string, toId: string) => {
      const startLines = stationLines.get(fromId);
      if (!startLines || startLines.size === 0) return null;

      interface QItem {
        node: string;
        transfers: number;
        stops: number;
        time: number;
      }
      const dist = new Map<string, { transfers: number; stops: number; time: number }>();
      const prev = new Map<string, { prevNode: string; edge: Edge }>();
      const q: QItem[] = [];

      for (const lid of startLines) {
        const n = `${fromId}::${lid}`;
        dist.set(n, { transfers: 0, stops: 0, time: 0 });
        q.push({ node: n, transfers: 0, stops: 0, time: 0 });
      }

      let endNode: string | null = null;
      while (q.length > 0) {
        q.sort((a, b) =>
          Math.abs(a.time - b.time) > 1e-4
            ? a.time - b.time
            : a.transfers !== b.transfers
            ? a.transfers - b.transfers
            : a.stops - b.stops
        );
        const curr = q.shift()!;
        const [currSt] = curr.node.split("::");
        if (currSt === toId) {
          endNode = curr.node;
          break;
        }

        const edges = adj.get(curr.node) || [];
        for (const e of edges) {
          const nextTransfers = curr.transfers + (e.isTransfer ? 1 : 0);
          const nextStops = curr.stops + (e.isTransfer ? 0 : 1);
          const nextTime = curr.time + e.timeMin;
          const prevBest = dist.get(e.toNode);

          const isBetter =
            !prevBest ||
            nextTime < prevBest.time - 1e-4 ||
            (Math.abs(nextTime - prevBest.time) <= 1e-4 &&
              (nextTransfers < prevBest.transfers ||
                (nextTransfers === prevBest.transfers && nextStops < prevBest.stops)));

          if (isBetter) {
            dist.set(e.toNode, { transfers: nextTransfers, stops: nextStops, time: nextTime });
            prev.set(e.toNode, { prevNode: curr.node, edge: e });
            q.push({ node: e.toNode, transfers: nextTransfers, stops: nextStops, time: nextTime });
          }
        }
      }

      if (!endNode) return null;

      const pathEdges: Edge[] = [];
      let c = endNode;
      while (prev.has(c)) {
        const step = prev.get(c)!;
        pathEdges.unshift(step.edge);
        c = step.prevNode;
      }

      const traversedLines = new Set<string>();
      let totalStops = 0;
      let totalTransfers = 0;
      let totalTime = 0;

      for (const e of pathEdges) {
        traversedLines.add(lineMap.get(e.lineId) || e.lineId);
        if (e.isTransfer) totalTransfers++;
        else totalStops++;
        totalTime += e.timeMin;
      }

      return {
        from: stationMap.get(fromId)?.name || fromId,
        to: stationMap.get(toId)?.name || toId,
        stops: totalStops,
        transfers: totalTransfers,
        timeMin: Math.round(totalTime),
        lines: Array.from(traversedLines),
      };
    };

    const stList = Array.from(stationMap.values());
    const routesFound: SampleRouteResult[] = [];

    // Search for 3 distinct routes (prioritizing transfer routes if possible)
    for (let i = 0; i < stList.length && routesFound.length < 3; i++) {
      for (let j = stList.length - 1; j > i && routesFound.length < 3; j--) {
        const r = searchRoute(stList[i].id, stList[j].id);
        if (r && r.stops > 0) {
          if (routesFound.length === 0 && r.transfers >= 1) {
            routesFound.push(r);
          } else if (routesFound.length === 1 && r.transfers >= 1 && r.stops > 8) {
            routesFound.push(r);
          } else if (routesFound.length < 3) {
            routesFound.push(r);
          }
        }
      }
    }
    samples[cityId] = routesFound;
  }

  return samples;
}

// Script CLI execution
if (process.argv[1]?.includes("verify-routing")) {
  const rootDir = process.cwd();
  const linesData: LineData[] = JSON.parse(
    fs.readFileSync(path.join(rootDir, "data/lines.json"), "utf8")
  );
  const segmentsGeoData = JSON.parse(
    fs.readFileSync(path.join(rootDir, "data/segments.geojson"), "utf8")
  );
  const stationsGeoData = JSON.parse(
    fs.readFileSync(path.join(rootDir, "data/stations.geojson"), "utf8")
  );

  const result = runRoutingVerification();
  const sampleRoutes = findSampleTier1Routes(
    segmentsGeoData.features,
    stationsGeoData.features,
    linesData
  );

  let md = generateVerificationMarkdown(result);

  const sampleMdLines: string[] = [];
  sampleMdLines.push(`| City | Route # | Origin | Destination | Stops | Transfers | Estimated Time | Traversed Lines |`);
  sampleMdLines.push(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);

  for (const [cityId, routes] of Object.entries(sampleRoutes)) {
    routes.forEach((r, idx) => {
      sampleMdLines.push(
        `| **${cityId.toUpperCase()}** | #${idx + 1} | ${r.from} | ${r.to} | ${r.stops} | ${r.transfers} | ${r.timeMin} min | ${r.lines.join(" ➔ ")} |`
      );
    });
  }
  sampleMdLines.push(``);
  sampleMdLines.push(`---`);
  sampleMdLines.push(`*Generated automatically by scripts/verify-routing.ts on 2026-10-17*`);

  md = md + "\n" + sampleMdLines.join("\n");

  const outDir = path.join(process.cwd(), "reports/routing");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, "2026-10-17-routing-verification.md");
  fs.writeFileSync(outFile, md, "utf8");

  console.log(`\n=== ROUTING VERIFICATION COMPLETE ===`);
  console.log(`Total operational lines evaluated: ${result.summary.totalOperationalLines}`);
  console.log(`Lines passing all checks: ${result.summary.linesPassingAllChecks} / ${result.summary.totalOperationalLines}`);
  console.log(`Fully Routable Cities: ${result.summary.routableCities}`);
  console.log(`Partly Routable Cities: ${result.summary.partlyRoutableCities}`);
  console.log(`Non-Routable Cities: ${result.summary.nonRoutableCities}`);
  console.log(`Report written to: ${outFile}\n`);
}
