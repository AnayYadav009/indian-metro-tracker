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
