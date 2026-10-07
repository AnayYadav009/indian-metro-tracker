/**
 * All audit thresholds in one place.
 * Values can be tuned globally here; per-city overrides may be added later.
 */
export const AUDIT_THRESHOLDS = {
  /** Station farther than this (m) from every segment of its lines → error */
  stationFarFromAllSegmentsM: 200,
  /** Station farther than this (m) from nearest segment of its lines → warn */
  stationFarFromNearestSegmentM: 75,
  /** Segment end farther than this (m) from any station of that line → warn */
  segmentEndFarFromStationM: 150,
  /** Consecutive segment ends that don't meet within this (m) → warn */
  consecutiveSegmentGapM: 150,
  /** Overlap check: sample interval along segments (m) */
  overlapSampleIntervalM: 50,
  /** Overlap check: distance threshold to consider a sample "on" another segment (m) */
  overlapProximityM: 15,
  /** Overlap check: minimum shared distance to flag (m) */
  overlapMinSharedM: 300,
  /** Computed length_km vs official_length_km: warn threshold (fraction) */
  lengthMismatchWarnPct: 0.02,
  /** Computed length_km vs official_length_km: error threshold (fraction) */
  lengthMismatchErrorPct: 0.05,
  /** last_verified older than this many months → warn */
  staleVerifiedMonths: 12,
  /** India coordinate envelope */
  indiaEnvelope: {
    minLng: 68,
    maxLng: 98,
    minLat: 6,
    maxLat: 38,
  },
  /** City bbox margin in degrees */
  bboxMarginDeg: 0.05,
  /** Ground truth: operational length difference threshold (fraction) → warn */
  groundTruthLengthWarnPct: 0.03,
} as const;

export type AuditThresholds = typeof AUDIT_THRESHOLDS;
