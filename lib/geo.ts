/**
 * Haversine formula to calculate the distance between two coordinates in kilometers.
 * Coordinate order: [longitude, latitude] (WGS84)
 */
export function haversineDistanceKm(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371; // Earth's mean radius in km

  const toRad = (angle: number) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the total length of a GeoJSON LineString coordinate array in kilometers.
 */
export function calculateLineStringLengthKm(
  coordinates: [number, number][]
): number {
  if (coordinates.length < 2) return 0;

  let totalKm = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    totalKm += haversineDistanceKm(coordinates[i], coordinates[i + 1]);
  }
  return totalKm;
}

/**
 * Checks if the declared length deviates from the computed geometry length by more than a given percentage (default 10%).
 */
export function checkLengthMismatch(
  declaredKm: number,
  computedKm: number,
  thresholdPct = 10
): {
  declaredKm: number;
  computedKm: number;
  mismatchPct: number;
  isMismatch: boolean;
} {
  const diff = Math.abs(declaredKm - computedKm);
  const mismatchPct = declaredKm > 0 ? (diff / declaredKm) * 100 : 0;
  return {
    declaredKm,
    computedKm: Number(computedKm.toFixed(2)),
    mismatchPct: Number(mismatchPct.toFixed(2)),
    isMismatch: mismatchPct > thresholdPct,
  };
}

/**
 * Distance in metres from a point to a line segment, using equirectangular
 * projection at the point's latitude.  t is clamped to [0, 1] so the
 * projection stays within the segment endpoints.  Zero-length segments
 * return the point-to-point distance.
 *
 * Coordinate order: [longitude, latitude] (WGS84).
 */
export function pointToSegmentDistanceM(
  point: [number, number],
  segStart: [number, number],
  segEnd: [number, number]
): number {
  const [pLng, pLat] = point;
  const cosLat = Math.cos((pLat * Math.PI) / 180);

  // Project to a local flat coordinate system (units ≈ degrees scaled by cosLat for x)
  const ax = (segStart[0] - pLng) * cosLat;
  const ay = segStart[1] - pLat;
  const bx = (segEnd[0] - pLng) * cosLat;
  const by = segEnd[1] - pLat;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  let nearX: number;
  let nearY: number;

  if (lenSq === 0) {
    // Zero-length segment: distance is point-to-point
    nearX = ax;
    nearY = ay;
  } else {
    const t = Math.max(0, Math.min(1, (-ax * dx + -ay * dy) / lenSq));
    nearX = ax + t * dx;
    nearY = ay + t * dy;
  }

  // Convert back to approximate metres
  const distDeg = Math.sqrt(nearX * nearX + nearY * nearY);
  return distDeg * (Math.PI / 180) * 6_371_000;
}

/**
 * Haversine formula to calculate distance between two coordinates in metres.
 */
export function haversineDistanceM(
  coord1: [number, number],
  coord2: [number, number]
): number {
  return haversineDistanceKm(coord1, coord2) * 1000;
}

/**
 * Finds the nearest projected point on a line segment to a query point.
 * Returns the nearest coordinate [lng, lat], distance in metres, and fractional parameter t [0, 1].
 */
export function nearestPointOnSegment(
  point: [number, number],
  segStart: [number, number],
  segEnd: [number, number]
): {
  point: [number, number];
  distanceM: number;
  t: number;
} {
  const [pLng, pLat] = point;
  const cosLat = Math.cos((pLat * Math.PI) / 180);

  const ax = (segStart[0] - pLng) * cosLat;
  const ay = segStart[1] - pLat;
  const bx = (segEnd[0] - pLng) * cosLat;
  const by = segEnd[1] - pLat;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  let t = 0;
  if (lenSq > 0) {
    t = Math.max(0, Math.min(1, (-ax * dx + -ay * dy) / lenSq));
  }

  const nearestLng = segStart[0] + t * (segEnd[0] - segStart[0]);
  const nearestLat = segStart[1] + t * (segEnd[1] - segStart[1]);
  const distanceM = haversineDistanceM(point, [nearestLng, nearestLat]);

  return {
    point: [nearestLng, nearestLat],
    distanceM,
    t,
  };
}

/**
 * Finds the nearest projected point along an entire polyline (LineString coordinates).
 */
export function nearestPointOnPolyline(
  point: [number, number],
  coordinates: [number, number][]
): {
  point: [number, number];
  distanceM: number;
  segmentIndex: number;
  t: number;
} {
  if (coordinates.length === 0) {
    return { point, distanceM: Infinity, segmentIndex: -1, t: 0 };
  }
  if (coordinates.length === 1) {
    return {
      point: coordinates[0],
      distanceM: haversineDistanceM(point, coordinates[0]),
      segmentIndex: 0,
      t: 0,
    };
  }

  let minDistance = Infinity;
  let bestResult = {
    point: coordinates[0],
    distanceM: Infinity,
    segmentIndex: 0,
    t: 0,
  };

  for (let i = 0; i < coordinates.length - 1; i++) {
    const res = nearestPointOnSegment(point, coordinates[i], coordinates[i + 1]);
    if (res.distanceM < minDistance) {
      minDistance = res.distanceM;
      bestResult = {
        point: res.point,
        distanceM: res.distanceM,
        segmentIndex: i,
        t: res.t,
      };
    }
  }

  return bestResult;
}

/**
 * Slices a polyline between two arbitrary points by projecting each point onto the polyline.
 * Preserves all intermediate vertices between the two projected locations along the line.
 */
export function lineSlice(
  pointA: [number, number],
  pointB: [number, number],
  line: [number, number][]
): [number, number][] {
  if (line.length < 2) return [...line];

  const projA = nearestPointOnPolyline(pointA, line);
  const projB = nearestPointOnPolyline(pointB, line);

  // Determine which projected point comes earlier along the polyline parameter space
  const indexA = projA.segmentIndex + projA.t;
  const indexB = projB.segmentIndex + projB.t;

  const isForward = indexA <= indexB;
  const startProj = isForward ? projA : projB;
  const endProj = isForward ? projB : projA;

  const slice: [number, number][] = [startProj.point];

  if (startProj.segmentIndex === endProj.segmentIndex) {
    // Both points project onto the same segment
    slice.push(endProj.point);
  } else {
    // Add all intermediate vertices
    for (let i = startProj.segmentIndex + 1; i <= endProj.segmentIndex; i++) {
      slice.push(line[i]);
    }
    slice.push(endProj.point);
  }

  // If originally requested from B to A, reverse so output starts at projA and ends at projB
  if (!isForward) {
    slice.reverse();
  }

  return slice;
}

/**
 * Minimum distance in metres from a point to any segment of a polyline.
 */
export function pointToPolylineDistanceM(
  point: [number, number],
  coordinates: [number, number][]
): number {
  return nearestPointOnPolyline(point, coordinates).distanceM;
}
