import { nearestPointOnPolyline, haversineDistanceM } from "@/lib/geo";
import type { SegmentFeature, StationFeature } from "@/types/metro";

export interface OrderedStation {
  id: string;
  name: string;
  coordinates: [number, number];
  progress: number;
}

export interface SegmentStationOrder {
  segmentId: string;
  lineId: string;
  stations: OrderedStation[];
  isLoop: boolean;
}

/**
 * Computes the sequential station order along an operational segment.
 * Uses geometric projection along the segment polyline as authoritative fallback.
 */
export function getSegmentStationOrder(
  segment: SegmentFeature,
  operationalStations: StationFeature[]
): SegmentStationOrder {
  const lineId = segment.properties.line_id;
  const segmentId = segment.properties.segment_id;
  const lineCoords = segment.geometry.coordinates as [number, number][];

  // Check if segment forms a closed loop
  const isLoop =
    lineCoords.length > 2 &&
    haversineDistanceM(lineCoords[0], lineCoords[lineCoords.length - 1]) < 80;

  // Find candidate operational stations matching this line
  const matchingStations = operationalStations.filter(
    (st) =>
      st.properties.status === "operational" &&
      st.properties.line_ids.includes(lineId)
  );

  // Project stations onto polyline
  const projected = matchingStations
    .map((st) => {
      const coords = st.geometry.coordinates as [number, number];
      const proj = nearestPointOnPolyline(coords, lineCoords);
      return {
        id: st.properties.station_id,
        name: st.properties.name,
        coordinates: coords,
        progress: proj.segmentIndex + proj.t,
        distanceM: proj.distanceM,
      };
    })
    .filter((st) => st.distanceM <= 300)
    .sort((a, b) => a.progress - b.progress);

  // Deduplicate any stations mapped to the same coordinate/progress
  const uniqueStations: OrderedStation[] = [];
  const seenIds = new Set<string>();
  for (const st of projected) {
    if (!seenIds.has(st.id)) {
      seenIds.add(st.id);
      uniqueStations.push({
        id: st.id,
        name: st.name,
        coordinates: st.coordinates,
        progress: st.progress,
      });
    }
  }

  return {
    segmentId,
    lineId,
    stations: uniqueStations,
    isLoop,
  };
}
