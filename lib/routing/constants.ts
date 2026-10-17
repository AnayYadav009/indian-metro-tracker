/**
 * Documented operational constants for travel time estimation.
 * Commercial average speed across Indian metros typically averages 32-35 km/h.
 */
export const ROUTING_CONSTANTS = {
  AVERAGE_SPEED_KMH: 32,
  STATION_DWELL_MINUTES: 0.5,
  TRANSFER_PENALTY_MINUTES: 4.0,
  DISCLAIMER:
    "Travel times are rough estimates based on a 32 km/h average speed and 4-minute transfers. Real-world schedules and train frequencies vary.",
} as const;
