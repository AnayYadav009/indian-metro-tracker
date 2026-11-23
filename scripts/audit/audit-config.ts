/**
 * All audit thresholds in one place.
 * Values can be tuned globally here; per-city overrides may be added later.
 */
export const AUDIT_THRESHOLDS = {
  /** Station farther than this (m) from every segment of its lines → error */
  stationFarFromAllSegmentsM: 250,
  /** Station farther than this (m) from nearest segment of its lines → warn */
  stationFarFromNearestSegmentM: 75,
  /** Segment end farther than this (m) from any station of that line → warn */
  segmentEndFarFromStationM: 150,
  /** Consecutive projected stations farther apart than this → warn */
  stationGapM: 3000,
  /** Short sharp polyline turn threshold */
  polylineHookAngleDeg: 150,
  polylineHookSpanM: 1000,
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
  /** Parallel duplicate check: maximum distance between parallel tracks (m) */
  parallelDuplicateMaxDistM: 60,
  /** Parallel duplicate check: minimum shared parallel length to flag (m) */
  parallelDuplicateMinSharedM: 300,
  /** Segment hairpin turn angle threshold (degrees) */
  hairpinAngleDeg: 150,
  /** Segment hairpin turn span along polyline (m) */
  hairpinSpanM: 300,
  /** Segment sparse vertices max chord length for non-schematic segments (m) */
  sparseVertexMaxChordM: 1000,
  /** City operational km vs reference mismatch threshold (fraction) → error */
  cityKmVsReferenceErrorPct: 0.1,
  /** Terminal station distance to segment end threshold (m) */
  terminalToSegmentEndMaxM: 300,
  /** Construction stretch endpoint to segment endpoint distance threshold (m) */
  constructionStretchEndMaxM: 300,
  /** Future station distance to its line geometry (m) */
  futureStationToSegmentMaxM: 75,
  /** Cross-network station proximity threshold (m) */
  crossNetworkInterchangeMaxM: 250,
  /** Same-name cross-network station proximity threshold (m) */
  crossNetworkSameNameMaxM: 1000,
} as const;

export type AuditThresholds = typeof AUDIT_THRESHOLDS;

export const CITY_AUDIT_THRESHOLD_KEYS = [
  "parallelDuplicateMaxDistM",
  "parallelDuplicateMinSharedM",
  "hairpinAngleDeg",
  "hairpinSpanM",
  "sparseVertexMaxChordM",
  "cityKmVsReferenceErrorPct",
  "terminalToSegmentEndMaxM",
  "constructionStretchEndMaxM",
  "futureStationToSegmentMaxM",
  "crossNetworkInterchangeMaxM",
  "crossNetworkSameNameMaxM",
] as const;

export type CityAuditThresholdOverrides = {
  [Key in (typeof CITY_AUDIT_THRESHOLD_KEYS)[number]]?: number;
};
