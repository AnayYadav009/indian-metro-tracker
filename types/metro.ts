import {
  ProvenanceSchema,
  ProvenanceStatusSchema,
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
} from "./schema";

export { ProvenanceSchema, ProvenanceStatusSchema };

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
};

export interface MetroDataset {
  cities: City[];
  lines: Line[];
  segments: SegmentFeatureCollection;
  stations: StationFeatureCollection;
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

