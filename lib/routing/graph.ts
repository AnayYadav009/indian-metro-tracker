import { haversineDistanceKm, lineSlice } from "@/lib/geo";
import { getSegmentStationOrder } from "./station-ordering";
import { ROUTING_CONSTANTS, calculateTransferMinutes } from "./constants";
import { getLineRoutability } from "./city-guard";
import type {
  RouteStation,
  RouteLeg,
  RouteTransfer,
  RouteResult,
} from "./types";
import type { SegmentFeature, StationFeature, Line } from "@/types/metro";
import { getMetroData } from "@/lib/data";
import rawInterchangeOverrides from "@/data/overrides/interchanges.json";

const interchangeOverrides = rawInterchangeOverrides as Record<
  string,
  { interchange_id?: string | null; source?: string; date?: string }
>;

export interface TransitEdge {
  toNode: string;
  fromStationId: string;
  toStationId: string;
  fromLineId: string;
  toLineId: string;
  lineId: string;
  segmentId?: string;
  isTransfer: boolean;
  transfersCost: number;
  stopsCost: number;
  distanceKm: number;
  timeMinutes: number;
  slicedCoordinates?: [number, number][];
}

export interface TransitGraph {
  stations: Map<string, RouteStation>;
  lines: Map<string, { id: string; name: string; color: string }>;
  stationLines: Map<string, Set<string>>;
  adj: Map<string, TransitEdge[]>;
}

export function buildTransitGraph(options?: {
  cityId?: string;
  allowedLineIds?: string[] | Set<string>;
  includeGuardedLines?: boolean;
  customSegments?: SegmentFeature[];
  customStations?: StationFeature[];
  customLines?: Line[];
}): TransitGraph {
  const allowedSet = options?.allowedLineIds
    ? options.allowedLineIds instanceof Set
      ? options.allowedLineIds
      : new Set(options.allowedLineIds)
    : null;

  const isLinePermitted = (lineId: string): boolean => {
    if (allowedSet && !allowedSet.has(lineId)) return false;
    if (!options?.includeGuardedLines && !getLineRoutability(lineId).isRoutable) {
      return false;
    }
    return true;
  };

  const segments =
    options?.customSegments ?? getMetroData().segments.features;
  const stations =
    options?.customStations ?? getMetroData().stations.features;
  const lines = options?.customLines ?? getMetroData().lines;

  const stationMap = new Map<string, RouteStation>();
  const lineMap = new Map<string, { id: string; name: string; color: string }>();
  const stationLines = new Map<string, Set<string>>();
  const adj = new Map<string, TransitEdge[]>();

  // Filter to operational segments on permitted lines
  const operationalSegments = segments.filter(
    (seg) =>
      seg.properties.status === "operational" &&
      (!options?.cityId || seg.properties.city_id === options.cityId) &&
      isLinePermitted(seg.properties.line_id)
  );

  const operationalLineIds = new Set(
    operationalSegments.map((s) => s.properties.line_id)
  );

  for (const line of lines) {
    if (options?.cityId && line.city_id !== options.cityId) continue;
    if (!isLinePermitted(line.id)) continue;
    if (!operationalLineIds.has(line.id)) continue;
    lineMap.set(line.id, {
      id: line.id,
      name: line.name,
      color: line.color || "#10b981",
    });
  }

  // Filter to operational stations that belong to permitted lines
  const operationalStations = stations.filter(
    (st) =>
      st.properties.status === "operational" &&
      (!options?.cityId || st.properties.city_id === options.cityId) &&
      st.properties.line_ids.some((lid) => isLinePermitted(lid))
  );

  for (const st of operationalStations) {
    const coords = st.geometry.coordinates as [number, number];
    stationMap.set(st.properties.station_id, {
      id: st.properties.station_id,
      name: st.properties.name,
      coordinates: coords,
    });
    if (!stationLines.has(st.properties.station_id)) {
      stationLines.set(st.properties.station_id, new Set());
    }
  }

  const addEdge = (fromNode: string, edge: TransitEdge) => {
    let list = adj.get(fromNode);
    if (!list) {
      list = [];
      adj.set(fromNode, list);
    }
    list.push(edge);
  };

  // 1. Build track edges from sequential ordered stations on operational segments
  for (const seg of operationalSegments) {
    const order = getSegmentStationOrder(seg, operationalStations);
    const lineId = order.lineId;
    const ordered = order.stations;

    for (const st of ordered) {
      stationLines.get(st.id)?.add(lineId);
    }

    for (let i = 0; i < ordered.length - 1; i++) {
      const a = ordered[i];
      const b = ordered[i + 1];
      const distKm = haversineDistanceKm(a.coordinates, b.coordinates);
      const timeMin =
        (distKm / ROUTING_CONSTANTS.AVERAGE_SPEED_KMH) * 60 +
        ROUTING_CONSTANTS.STATION_DWELL_MINUTES;

      const segCoords = seg.geometry.coordinates as [number, number][];
      const forwardSlice = lineSlice(a.coordinates, b.coordinates, segCoords);
      const backwardSlice = [...forwardSlice].reverse();

      const nodeA = `${a.id}::${lineId}`;
      const nodeB = `${b.id}::${lineId}`;

      addEdge(nodeA, {
        toNode: nodeB,
        fromStationId: a.id,
        toStationId: b.id,
        fromLineId: lineId,
        toLineId: lineId,
        lineId,
        segmentId: seg.properties.segment_id,
        isTransfer: false,
        transfersCost: 0,
        stopsCost: 1,
        distanceKm: distKm,
        timeMinutes: timeMin,
        slicedCoordinates: forwardSlice,
      });

      addEdge(nodeB, {
        toNode: nodeA,
        fromStationId: b.id,
        toStationId: a.id,
        fromLineId: lineId,
        toLineId: lineId,
        lineId,
        segmentId: seg.properties.segment_id,
        isTransfer: false,
        transfersCost: 0,
        stopsCost: 1,
        distanceKm: distKm,
        timeMinutes: timeMin,
        slicedCoordinates: backwardSlice,
      });
    }

    // Connect loop ends if segment forms a closed loop
    if (order.isLoop && ordered.length >= 3) {
      const first = ordered[0];
      const last = ordered[ordered.length - 1];
      const loopDist = haversineDistanceKm(last.coordinates, first.coordinates);
      const loopTime =
        (loopDist / ROUTING_CONSTANTS.AVERAGE_SPEED_KMH) * 60 +
        ROUTING_CONSTANTS.STATION_DWELL_MINUTES;

      const nodeLast = `${last.id}::${lineId}`;
      const nodeFirst = `${first.id}::${lineId}`;

      addEdge(nodeLast, {
        toNode: nodeFirst,
        fromStationId: last.id,
        toStationId: first.id,
        fromLineId: lineId,
        toLineId: lineId,
        lineId,
        segmentId: seg.properties.segment_id,
        isTransfer: false,
        transfersCost: 0,
        stopsCost: 1,
        distanceKm: loopDist,
        timeMinutes: loopTime,
        slicedCoordinates: [last.coordinates, first.coordinates],
      });

      addEdge(nodeFirst, {
        toNode: nodeLast,
        fromStationId: first.id,
        toStationId: last.id,
        fromLineId: lineId,
        toLineId: lineId,
        lineId,
        segmentId: seg.properties.segment_id,
        isTransfer: false,
        transfersCost: 0,
        stopsCost: 1,
        distanceKm: loopDist,
        timeMinutes: loopTime,
        slicedCoordinates: [first.coordinates, last.coordinates],
      });
    }
  }

  // 2. Intra-station transfers between different lines at the same station
  for (const [stId, linesSet] of stationLines.entries()) {
    if (linesSet.size > 1) {
      const lineArray = Array.from(linesSet);
      for (let i = 0; i < lineArray.length; i++) {
        for (let j = i + 1; j < lineArray.length; j++) {
          const l1 = lineArray[i];
          const l2 = lineArray[j];
          const node1 = `${stId}::${l1}`;
          const node2 = `${stId}::${l2}`;

          const walkKm = ROUTING_CONSTANTS.NOMINAL_INTRA_STATION_WALK_KM;
          const transferMinutes = calculateTransferMinutes(walkKm);

          addEdge(node1, {
            toNode: node2,
            fromStationId: stId,
            toStationId: stId,
            fromLineId: l1,
            toLineId: l2,
            lineId: l2,
            isTransfer: true,
            transfersCost: 1,
            stopsCost: 0,
            distanceKm: walkKm,
            timeMinutes: transferMinutes,
          });

          addEdge(node2, {
            toNode: node1,
            fromStationId: stId,
            toStationId: stId,
            fromLineId: l2,
            toLineId: l1,
            lineId: l1,
            isTransfer: true,
            transfersCost: 1,
            stopsCost: 0,
            distanceKm: walkKm,
            timeMinutes: transferMinutes,
          });
        }
      }
    }
  }

  // 3. Inter-station interchange transfers via interchange_id
  const interchangeGroups = new Map<string, StationFeature[]>();
  for (const st of operationalStations) {
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
      group.push(st);
    }
  }

  for (const group of interchangeGroups.values()) {
    if (group.length > 1) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const stA = group[i];
          const stB = group[j];
          const linesA = stationLines.get(stA.properties.station_id) ?? new Set();
          const linesB = stationLines.get(stB.properties.station_id) ?? new Set();

          const distKm = haversineDistanceKm(
            stA.geometry.coordinates as [number, number],
            stB.geometry.coordinates as [number, number]
          );

          const transferMinutes = calculateTransferMinutes(distKm);

          for (const lA of linesA) {
            for (const lB of linesB) {
              const nodeA = `${stA.properties.station_id}::${lA}`;
              const nodeB = `${stB.properties.station_id}::${lB}`;

              addEdge(nodeA, {
                toNode: nodeB,
                fromStationId: stA.properties.station_id,
                toStationId: stB.properties.station_id,
                fromLineId: lA,
                toLineId: lB,
                lineId: lB,
                isTransfer: true,
                transfersCost: 1,
                stopsCost: 0,
                distanceKm: distKm,
                timeMinutes: transferMinutes,
              });

              addEdge(nodeB, {
                toNode: nodeA,
                fromStationId: stB.properties.station_id,
                toStationId: stA.properties.station_id,
                fromLineId: lB,
                toLineId: lA,
                lineId: lA,
                isTransfer: true,
                transfersCost: 1,
                stopsCost: 0,
                distanceKm: distKm,
                timeMinutes: transferMinutes,
              });
            }
          }
        }
      }
    }
  }

  return {
    stations: stationMap,
    lines: lineMap,
    stationLines,
    adj,
  };
}

interface Cost {
  transfers: number;
  stops: number;
  timeMinutes: number;
}

function compareCost(a: Cost, b: Cost): number {
  if (Math.abs(a.timeMinutes - b.timeMinutes) > 1e-4) {
    return a.timeMinutes - b.timeMinutes;
  }
  if (a.transfers !== b.transfers) return a.transfers - b.transfers;
  return a.stops - b.stops;
}

/**
 * Finds the optimal route between origin and destination stations.
 * Objective: Minimise estimated time (travel + dwell + transfer penalty) first,
 * then fewest transfers, then fewest stops.
 */
export function findRoute(
  graph: TransitGraph,
  originStationId: string,
  destinationStationId: string
): RouteResult | null {
  const originStation = graph.stations.get(originStationId);
  const destStation = graph.stations.get(destinationStationId);
  if (!originStation || !destStation) return null;

  // Same station case
  if (originStationId === destinationStationId) {
    return {
      origin: originStation,
      destination: destStation,
      legs: [],
      transfers: [],
      totalStops: 0,
      totalTransfers: 0,
      totalDistanceKm: 0,
      estimatedMinutes: 0,
      disclaimer: ROUTING_CONSTANTS.DISCLAIMER,
    };
  }

  const originLines = graph.stationLines.get(originStationId);
  if (!originLines || originLines.size === 0) return null;

  // Priority queue item
  interface QueueItem {
    node: string;
    cost: Cost;
  }

  // Small, efficient min-heap
  const heap: QueueItem[] = [];
  const pushHeap = (item: QueueItem) => {
    heap.push(item);
    let idx = heap.length - 1;
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (compareCost(heap[idx].cost, heap[parent].cost) < 0) {
        [heap[idx], heap[parent]] = [heap[parent], heap[idx]];
        idx = parent;
      } else break;
    }
  };

  const popHeap = (): QueueItem | undefined => {
    if (heap.length === 0) return undefined;
    const top = heap[0];
    const bottom = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = bottom;
      let idx = 0;
      while (true) {
        const left = 2 * idx + 1;
        const right = 2 * idx + 2;
        let smallest = idx;
        if (left < heap.length && compareCost(heap[left].cost, heap[smallest].cost) < 0) {
          smallest = left;
        }
        if (right < heap.length && compareCost(heap[right].cost, heap[smallest].cost) < 0) {
          smallest = right;
        }
        if (smallest !== idx) {
          [heap[idx], heap[smallest]] = [heap[smallest], heap[idx]];
          idx = smallest;
        } else break;
      }
    }
    return top;
  };

  const bestCost = new Map<string, Cost>();
  const cameFrom = new Map<string, { prevNode: string; edge: TransitEdge }>();

  // Initialize heap with all lines at origin station
  for (const lineId of originLines) {
    const node = `${originStationId}::${lineId}`;
    const initialCost: Cost = { transfers: 0, stops: 0, timeMinutes: 0 };
    bestCost.set(node, initialCost);
    pushHeap({ node, cost: initialCost });
  }

  let finalDestinationNode: string | null = null;

  while (heap.length > 0) {
    const curr = popHeap()!;
    const recorded = bestCost.get(curr.node);
    if (!recorded || compareCost(curr.cost, recorded) > 0) continue;

    // Check if reached destination
    const [stationId] = curr.node.split("::");
    if (stationId === destinationStationId) {
      finalDestinationNode = curr.node;
      break;
    }

    const edges = graph.adj.get(curr.node) ?? [];
    for (const edge of edges) {
      const nextCost: Cost = {
        transfers: curr.cost.transfers + edge.transfersCost,
        stops: curr.cost.stops + edge.stopsCost,
        timeMinutes: curr.cost.timeMinutes + edge.timeMinutes,
      };

      const prevBest = bestCost.get(edge.toNode);
      if (!prevBest || compareCost(nextCost, prevBest) < 0) {
        bestCost.set(edge.toNode, nextCost);
        cameFrom.set(edge.toNode, { prevNode: curr.node, edge });
        pushHeap({ node: edge.toNode, cost: nextCost });
      }
    }
  }

  if (!finalDestinationNode) return null;

  // Reconstruct edge sequence
  const edgePath: TransitEdge[] = [];
  let currNode = finalDestinationNode;
  while (cameFrom.has(currNode)) {
    const step = cameFrom.get(currNode)!;
    edgePath.unshift(step.edge);
    currNode = step.prevNode;
  }

  if (edgePath.length === 0) return null;

  // Group into legs and transfers
  const legs: RouteLeg[] = [];
  const transfers: RouteTransfer[] = [];

  let currentLegEdges: TransitEdge[] = [];

  const flushLeg = () => {
    if (currentLegEdges.length === 0) return;
    const firstEdge = currentLegEdges[0];
    const lastEdge = currentLegEdges[currentLegEdges.length - 1];

    const fromSt = graph.stations.get(firstEdge.fromStationId)!;
    const toSt = graph.stations.get(lastEdge.toStationId)!;
    const lineInfo = graph.lines.get(firstEdge.lineId) ?? {
      id: firstEdge.lineId,
      name: firstEdge.lineId,
      color: "#10b981",
    };

    const intermediateStations: RouteStation[] = [];
    const coordinates: [number, number][] = [];

    let legDist = 0;
    let legTime = 0;

    for (let i = 0; i < currentLegEdges.length; i++) {
      const e = currentLegEdges[i];
      legDist += e.distanceKm;
      legTime += e.timeMinutes;
      if (i > 0) {
        intermediateStations.push(graph.stations.get(e.fromStationId)!);
      }
      if (e.slicedCoordinates) {
        coordinates.push(...e.slicedCoordinates);
      }
    }

    legs.push({
      lineId: lineInfo.id,
      lineName: lineInfo.name,
      lineColor: lineInfo.color,
      segmentId: firstEdge.segmentId ?? "",
      fromStation: fromSt,
      toStation: toSt,
      intermediateStations,
      stopCount: currentLegEdges.length,
      distanceKm: Number(legDist.toFixed(2)),
      estimatedMinutes: Math.round(legTime),
      coordinates,
    });

    currentLegEdges = [];
  };

  for (const edge of edgePath) {
    if (edge.isTransfer) {
      flushLeg();
      const st = graph.stations.get(edge.fromStationId)!;
      const fromLine = graph.lines.get(edge.fromLineId) ?? {
        id: edge.fromLineId,
        name: edge.fromLineId,
        color: "#10b981",
      };
      const toLine = graph.lines.get(edge.toLineId) ?? {
        id: edge.toLineId,
        name: edge.toLineId,
        color: "#10b981",
      };

      transfers.push({
        station: st,
        fromLineId: fromLine.id,
        fromLineName: fromLine.name,
        fromLineColor: fromLine.color,
        toLineId: toLine.id,
        toLineName: toLine.name,
        toLineColor: toLine.color,
        estimatedMinutes: edge.timeMinutes,
      });
    } else {
      currentLegEdges.push(edge);
    }
  }
  flushLeg();

  const totalStops = legs.reduce((sum, leg) => sum + leg.stopCount, 0);
  const totalTransfers = transfers.length;
  const totalDistanceKm = Number(
    legs.reduce((sum, leg) => sum + leg.distanceKm, 0).toFixed(2)
  );
  const estimatedMinutes = Math.round(
    legs.reduce((sum, leg) => sum + leg.estimatedMinutes, 0) +
      transfers.reduce((sum, t) => sum + t.estimatedMinutes, 0)
  );

  return {
    origin: originStation,
    destination: destStation,
    legs,
    transfers,
    totalStops,
    totalTransfers,
    totalDistanceKm,
    estimatedMinutes,
    disclaimer: ROUTING_CONSTANTS.DISCLAIMER,
  };
}
