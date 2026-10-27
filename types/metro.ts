import {
  ProvenanceSchema,
  ProvenanceStatusSchema,
  FareBandSchema,
  FareKmBandSchema,
  FareStationBandSchema,
  FareDayScopeSchema,
  FareRuleSchema,
  FareRuleKmSchema,
  FareRuleStationCountSchema,
  ServiceDayTypeSchema,
  ServiceHoursSchema,
} from "./schema";
import type {
  Status,
  Layout,
  BoundingBox,
  Provenance,
  ProvenanceStatus,
  City,
  Line,
  SegmentProperties,
  SharedCorridor,
  SegmentFeature,
  SegmentFeatureCollection,
  StationProperties,
  StationFeature,
  StationFeatureCollection,
  FareBand,
  FareKmBand,
  FareStationBand,
  FareDayScope,
  FareRule,
  FareRuleKm,
  FareRuleStationCount,
  ServiceDayType,
  ServiceHours,
} from "./schema";

export {
  ProvenanceSchema,
  ProvenanceStatusSchema,
  FareBandSchema,
  FareKmBandSchema,
  FareStationBandSchema,
  FareDayScopeSchema,
  FareRuleSchema,
  FareRuleKmSchema,
  FareRuleStationCountSchema,
  ServiceDayTypeSchema,
  ServiceHoursSchema,
};

export type {
  Status,
  Layout,
  BoundingBox,
  Provenance,
  ProvenanceStatus,
  City,
  Line,
  SegmentProperties,
  SharedCorridor,
  SegmentFeature,
  SegmentFeatureCollection,
  StationProperties,
  StationFeature,
  StationFeatureCollection,
  FareBand,
  FareKmBand,
  FareStationBand,
  FareDayScope,
  FareRule,
  FareRuleKm,
  FareRuleStationCount,
  ServiceDayType,
  ServiceHours,
};

export interface MetroDataset {
  cities: City[];
  lines: Line[];
  segments: SegmentFeatureCollection;
  stations: StationFeatureCollection;
  fareRules?: FareRule[];
  serviceHours?: ServiceHours[];
}

export interface SegmentFilterOptions {
  cityId?: string;
  status?: Status;
  phase?: string;
  lineId?: string;
}

export interface StationFilterOptions {
  cityId?: string;
  status?: Status;
  phase?: string;
  lineId?: string;
  isInterchange?: boolean;
}


