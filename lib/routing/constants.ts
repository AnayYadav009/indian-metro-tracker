/**
 * Documented operational constants for travel time estimation.
 * Commercial average speed across Indian metros typically averages 32-35 km/h.
 * Walking speed for transfers is documented at 4.0 km/h (~67 m/min).
 * Intra-station platform changes use a nominal walking distance of 100 m (0.1 km).
 */
export const ROUTING_CONSTANTS = {
  AVERAGE_SPEED_KMH: 32,
  STATION_DWELL_MINUTES: 0.5,
  BASE_TRANSFER_MINUTES: 3.0,
  WALKING_SPEED_KMH: 4.0,
  NOMINAL_INTRA_STATION_WALK_KM: 0.1,
  TRANSFER_PENALTY_MINUTES: 4.5,
  DISCLAIMER:
    "Travel times are rough estimates based on a 32 km/h average speed and distance-aware transfers (3 min base + walking at 4 km/h). Real-world schedules and train frequencies vary.",
} as const;

export function calculateTransferMinutes(distanceKm: number): number {
  const walkMinutes =
    (distanceKm / ROUTING_CONSTANTS.WALKING_SPEED_KMH) * 60;
  return ROUTING_CONSTANTS.BASE_TRANSFER_MINUTES + walkMinutes;
}
