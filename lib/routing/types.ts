export interface RouteStation {
  id: string;
  name: string;
  coordinates: [number, number];
}

export interface RouteLeg {
  lineId: string;
  lineName: string;
  lineColor: string;
  segmentId: string;
  fromStation: RouteStation;
  toStation: RouteStation;
  intermediateStations: RouteStation[];
  stopCount: number;
  distanceKm: number;
  estimatedMinutes: number;
  coordinates: [number, number][];
}

export interface RouteTransfer {
  station: RouteStation;
  fromLineId: string;
  fromLineName: string;
  fromLineColor: string;
  toLineId: string;
  toLineName: string;
  toLineColor: string;
  estimatedMinutes: number;
}

export interface RouteResult {
  origin: RouteStation;
  destination: RouteStation;
  legs: RouteLeg[];
  transfers: RouteTransfer[];
  totalStops: number;
  totalTransfers: number;
  totalDistanceKm: number;
  estimatedMinutes: number;
  disclaimer: string;
}

export interface CityRoutability {
  isRoutable: boolean;
  reason?: string;
}
