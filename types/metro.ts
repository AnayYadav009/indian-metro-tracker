import type {
  Status,
  Layout,
  BoundingBox,
  City,
  Line,
  SegmentProperties,
  SegmentFeature,
  SegmentFeatureCollection,
  StationProperties,
  StationFeature,
  StationFeatureCollection,
} from "./schema";

export type {
  Status,
  Layout,
  BoundingBox,
  City,
  Line,
  SegmentProperties,
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
  city?: string;
  status?: Status;
  phase?: string;
  lineId?: string;
}

export interface StationFilterOptions {
  cityId?: string;
  city?: string;
  status?: Status;
  phase?: string;
  lineId?: string;
  isInterchange?: boolean;
}
