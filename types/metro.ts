export * from "./schema";
import type {
  City,
  Line,
  SegmentFeatureCollection,
  StationFeatureCollection,
  FareRule,
  ServiceHours,
  Status,
} from "./schema";

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
