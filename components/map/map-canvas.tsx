"use client";

import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import Map, {
  NavigationControl,
  GeolocateControl,
  Marker,
  Source,
  Layer,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Fix for Next.js 15 Webpack worker loading issue - load from local public asset
if (typeof window !== "undefined") {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  maplibregl.setWorkerUrl(`${basePath}/maplibre-gl-worker.mjs`);
}

import {
  BASEMAP_STYLE_URL,
  INITIAL_VIEW_STATE,
} from "@/lib/map-config";
import { getMetroData, getSegmentById, getStationById } from "@/lib/data";
import { useMetroStore } from "@/store/use-metro-store";
import {
  INTERACTIVE_LAYER_IDS,
  operationalLineLayer,
  constructionLineLayer,
  schematicLineLayer,
  plannedLineLayer,
  getSelectedSegmentLayer,
  getSelectedSchematicSegmentLayer,
  interchangeStationLayer,
  stationCircleLayer,
  getSelectedStationLayer,
  stationLabelsLayer,
  withFilter,
  withVisibility,
  buildStatusFilter,
  buildStationFilter,
} from "./map-layers";
import { HoverTooltip } from "./hover-tooltip";

interface MapCanvasProps {
  className?: string;
}

const CATCHMENT_RADII = [500, 1000] as const;

function buildWalkingCatchments(stations: ReturnType<typeof getMetroData>["stations"], cityId: string | null) {
  const operational = stations.features.filter(({ properties }) =>
    properties.status === "operational" && (!cityId || properties.city_id === cityId)
  );
  const features = operational.flatMap(({ geometry, properties }) =>
    CATCHMENT_RADII.map((radius) => {
      const [longitude, latitude] = geometry.coordinates;
      const lat = latitude * Math.PI / 180;
      const lon = longitude * Math.PI / 180;
      const angularRadius = radius / 6_371_008.8;
      const coordinates = Array.from({ length: 25 }, (_, index) => {
        const bearing = index * Math.PI / 12;
        const nextLat = Math.asin(Math.sin(lat) * Math.cos(angularRadius) + Math.cos(lat) * Math.sin(angularRadius) * Math.cos(bearing));
        const nextLon = lon + Math.atan2(Math.sin(bearing) * Math.sin(angularRadius) * Math.cos(lat), Math.cos(angularRadius) - Math.sin(lat) * Math.sin(nextLat));
        return [nextLon * 180 / Math.PI, nextLat * 180 / Math.PI];
      });
      return {
        type: "Feature" as const,
        properties: { station_id: properties.station_id, radius },
        geometry: { type: "Polygon" as const, coordinates: [coordinates] },
      };
    })
  );
  return { type: "FeatureCollection" as const, features };
}

export function MapCanvas({ className = "" }: MapCanvasProps) {
  const mapRef = useRef<MapRef>(null);
  const [cursor, setCursor] = useState<string>("auto");

  const selectedCityId = useMetroStore((state) => state.selectedCityId);
  const selectedStatuses = useMetroStore((state) => state.selectedStatuses);
  const selectedPhases = useMetroStore((state) => state.selectedPhases);
  const selectedFeature = useMetroStore((state) => state.selectedFeature);
  const setSelectedFeature = useMetroStore((state) => state.setSelectedFeature);
  const isRoutePanelOpen = useMetroStore((state) => state.isRoutePanelOpen);
  const routeOriginId = useMetroStore((state) => state.routeOriginId);
  const routeDestinationId = useMetroStore((state) => state.routeDestinationId);
  const routeFocusTarget = useMetroStore((state) => state.routeFocusTarget);
  const setRouteOriginId = useMetroStore((state) => state.setRouteOriginId);
  const setRouteDestinationId = useMetroStore((state) => state.setRouteDestinationId);
  const setRouteFocusTarget = useMetroStore((state) => state.setRouteFocusTarget);
  const setSelectedCity = useMetroStore((state) => state.setSelectedCity);
  const clearSelectedFeature = useMetroStore(
    (state) => state.clearSelectedFeature
  );
  const setHoveredFeature = useMetroStore((state) => state.setHoveredFeature);
  const selectedYear = useMetroStore((state) => state.selectedYear);
  const includeFuture = useMetroStore((state) => state.includeFuture);
  const showStations = useMetroStore((state) => state.showStations);
  const showWalkingCatchment = useMetroStore((state) => state.showWalkingCatchment);
  const isPickingLocation = useMetroStore((state) => state.isPickingLocation);
  const setIsPickingLocation = useMetroStore(
    (state) => state.setIsPickingLocation
  );
  const userLocation = useMetroStore((state) => state.userLocation);
  const setUserLocation = useMetroStore((state) => state.setUserLocation);
  const setIsNearestPanelOpen = useMetroStore(
    (state) => state.setIsNearestPanelOpen
  );
  const activeRoute = useMetroStore((state) => state.activeRoute);
  const interactiveLayerIds = useMemo(
    () =>
      showStations
        ? INTERACTIVE_LAYER_IDS
        : INTERACTIVE_LAYER_IDS.filter(
            (id) => id !== "station-points" && id !== "interchange-points"
          ),
    [showStations]
  );

  const selectedSegmentId =
    selectedFeature?.type === "segment"
      ? selectedFeature.data.segment_id
      : null;
  const selectedStationId =
    selectedFeature?.type === "station"
      ? selectedFeature.data.station_id
      : null;

  const dataset = useMemo(() => getMetroData(), []);
  const catchmentGeoJson = useMemo(
    () => showWalkingCatchment ? buildWalkingCatchments(dataset.stations, selectedCityId) : null,
    [dataset.stations, selectedCityId, showWalkingCatchment]
  );

  const operationalFilter = useMemo(
    () =>
      buildStatusFilter(
        "operational",
        selectedStatuses,
        selectedCityId,
        selectedPhases,
        selectedYear,
        includeFuture
      ),
    [selectedStatuses, selectedCityId, selectedPhases, selectedYear, includeFuture]
  );

  const constructionFilter = useMemo(
    () =>
      buildStatusFilter(
        "construction",
        selectedStatuses,
        selectedCityId,
        selectedPhases,
        selectedYear,
        includeFuture
      ),
    [selectedStatuses, selectedCityId, selectedPhases, selectedYear, includeFuture]
  );

  const plannedFilter = useMemo(
    () =>
      buildStatusFilter(
        "planned",
        selectedStatuses,
        selectedCityId,
        selectedPhases,
        selectedYear,
        includeFuture
      ),
    [selectedStatuses, selectedCityId, selectedPhases, selectedYear, includeFuture]
  );

  const stationFilter = useMemo(
    () =>
      buildStationFilter(
        selectedStatuses,
        selectedCityId,
        selectedPhases,
        selectedYear,
        includeFuture
      ),
    [selectedStatuses, selectedCityId, selectedPhases, selectedYear, includeFuture]
  );

  const [isLoadingTiles, setIsLoadingTiles] = useState<boolean>(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectionLocation, setSelectionLocation] = useState<{
    featureKey: string;
    coordinates: [number, number];
  } | null>(null);

  const selectedFeatureAnchor = useMemo<[number, number] | null>(() => {
    if (!selectedFeature) return null;
    if (selectedFeature.type === "station") {
      const station = getStationById(selectedFeature.data.station_id);
      return station?.geometry.coordinates as [number, number] | undefined ?? null;
    }
    const featureKey = `segment:${selectedFeature.data.segment_id}`;
    if (selectionLocation?.featureKey === featureKey) return selectionLocation.coordinates;
    const segment = getSegmentById(selectedFeature.data.segment_id);
    if (!segment || segment.geometry.type !== "LineString") return null;
    const coordinates = segment.geometry.coordinates;
    return coordinates.length
      ? (coordinates[Math.floor(coordinates.length / 2)] as [number, number])
      : null;
  }, [selectedFeature, selectionLocation]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (typeof window !== "undefined") {
      (window as any)._mapLibreInstance = mapRef.current.getMap();
    }

    if (selectedCityId) {
      const targetCity = dataset.cities.find((c) => c.id === selectedCityId);
      if (targetCity) {
        const [minLng, minLat, maxLng, maxLat] = targetCity.bbox;
        // Desktop padding reserves space for the filter panel (left) and metadata panel (right)
        const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
        mapRef.current.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          {
            padding: isDesktop
              ? { top: 70, bottom: 70, left: 400, right: 80 }
              : { top: 80, bottom: 80, left: 24, right: 24 },
            duration: 450,
            essential: true,
          }
        );
      }
    } else {
      mapRef.current.flyTo({
        center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
        zoom: INITIAL_VIEW_STATE.zoom,
        duration: 450,
        essential: true,
      });
    }
  }, [selectedCityId, dataset.cities]);

  useEffect(() => {
    if (!mapRef.current || !isMapReady || !selectedFeatureAnchor) return;
    const map = mapRef.current.getMap();
    const mapRect = map.getContainer().getBoundingClientRect();
    const target = { x: mapRect.width / 2, y: mapRect.height / 2 };
    const overlays = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-testid="metadata-panel"], [data-testid="filter-panel"]'
      ),
    ]
      .filter((element) => element.getBoundingClientRect().width > 0)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left - mapRect.left,
          right: rect.right - mapRect.left,
          top: rect.top - mapRect.top,
          bottom: rect.bottom - mapRect.top,
        };
      });
    for (const overlay of overlays) {
      if (
        target.x >= overlay.left && target.x <= overlay.right &&
        target.y >= overlay.top && target.y <= overlay.bottom
      ) {
        target.y = Math.max(24, overlay.top - 24);
      }
    }
    const anchorPoint = map.project(selectedFeatureAnchor);
    const centerPoint = map.project(map.getCenter());
    const nextCenterPoint = {
      x: centerPoint.x + anchorPoint.x - target.x,
      y: centerPoint.y + anchorPoint.y - target.y,
    };
    mapRef.current.easeTo({
      center: map.unproject([nextCenterPoint.x, nextCenterPoint.y]),
      padding: 0,
      duration: 300,
      essential: true,
    });
  }, [isMapReady, selectedFeatureAnchor]);

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (isPickingLocation) {
        setUserLocation([e.lngLat.lng, e.lngLat.lat]);
        setIsPickingLocation(false);
        setIsNearestPanelOpen(true);
        return;
      }

      const features = e.features;
      if (!features || features.length === 0) {
        setSelectionLocation(null);
        clearSelectedFeature();
        return;
      }

      // Prefer stations when their point overlaps a line.
      const stationF = features.find(
        (f) =>
          f.layer.id === "interchange-points" ||
          f.layer.id === "station-points" ||
          (f.properties && "station_id" in f.properties)
      );

      if (stationF && stationF.properties) {
        const stationId = stationF.properties.station_id;
        const matched = getStationById(stationId);
        if (matched) {
          setSelectionLocation(null);
          if (isRoutePanelOpen) {
            const target = routeFocusTarget || (!routeOriginId ? "origin" : !routeDestinationId ? "destination" : null);
            if (target) {
              setSelectedCity(matched.properties.city_id);
              (target === "origin" ? setRouteOriginId : setRouteDestinationId)(stationId);
              setRouteFocusTarget(target === "origin" ? "destination" : null);
              clearSelectedFeature();
              return;
            }
          }
          setSelectedFeature({
            type: "station",
            data: matched.properties,
          });
          return;
        }
      }

      const segmentF = features.find(
        (f) =>
          f.layer.id === "operational-lines" ||
          f.layer.id === "construction-lines" ||
          f.layer.id === "planned-lines" ||
          (f.properties && "segment_id" in f.properties)
      );

      if (segmentF && segmentF.properties) {
        const segmentId = segmentF.properties.segment_id;
        const matched = getSegmentById(segmentId);
        if (matched) {
          setSelectionLocation({
            featureKey: `segment:${segmentId}`,
            coordinates: [e.lngLat.lng, e.lngLat.lat],
          });
          setSelectedFeature({
            type: "segment",
            data: matched.properties,
          });
          return;
        }
      }

      clearSelectedFeature();
    },
    [
      isPickingLocation,
      setUserLocation,
      setIsPickingLocation,
      setIsNearestPanelOpen,
      isRoutePanelOpen,
      routeOriginId,
      routeDestinationId,
      routeFocusTarget,
      setRouteOriginId,
      setRouteDestinationId,
      setRouteFocusTarget,
      setSelectedCity,
      clearSelectedFeature,
      setSelectedFeature,
    ]
  );

  const handleMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      const features = e.features;
      if (features && features.length > 0) {
        setCursor("pointer");

        const stationF = showStations
          ? features.find(
          (f) =>
            f.layer.id === "interchange-points" ||
            f.layer.id === "station-points" ||
            (f.properties && "station_id" in f.properties)
            )
          : undefined;
        if (stationF && stationF.properties) {
          setHoveredFeature({
            type: "station",
            id: stationF.properties.station_id,
            name: stationF.properties.name,
            status: stationF.properties.status,
            x: e.point.x,
            y: e.point.y,
          });
          return;
        }

        const segmentF = features.find(
          (f) => f.properties && "segment_id" in f.properties
        );
        if (segmentF && segmentF.properties) {
          setHoveredFeature({
            type: "segment",
            id: segmentF.properties.segment_id,
            name: segmentF.properties.line_name,
            status: segmentF.properties.status,
            color: segmentF.properties.color,
            x: e.point.x,
            y: e.point.y,
          });
          return;
        }
      } else {
        setCursor("auto");
        setHoveredFeature(null);
      }
    },
    [setHoveredFeature, showStations]
  );

  const routeGeoJson = useMemo(() => {
    if (!activeRoute || activeRoute.legs.length === 0) return null;
    const features: any[] = [];
    for (const leg of activeRoute.legs) {
      if (leg.coordinates && leg.coordinates.length >= 2) {
        features.push({
          type: "Feature",
          properties: {
            lineId: leg.lineId,
            color: leg.lineColor,
          },
          geometry: {
            type: "LineString",
            coordinates: leg.coordinates,
          },
        });
      }
    }
    if (features.length === 0) return null;
    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [activeRoute]);

  useEffect(() => {
    if (!activeRoute || !mapRef.current || activeRoute.legs.length === 0) return;
    const allCoords = activeRoute.legs.flatMap((l) => l.coordinates);
    if (allCoords.length < 2) return;
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const [lng, lat] of allCoords) {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
    mapRef.current.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: isDesktop
          ? { top: 90, bottom: 90, left: 420, right: 80 }
          : { top: 120, bottom: 120, left: 30, right: 30 },
        duration: 800,
        essential: true,
      }
    );
  }, [activeRoute]);

  const handleMouseLeave = useCallback(() => {
    setCursor("auto");
    setHoveredFeature(null);
  }, [setHoveredFeature]);

  return (
    <div
      data-testid="map-container"
      className={`relative h-full w-full overflow-hidden ${className}`}
      onClick={(e) => {
        if (isPickingLocation && mapRef.current) {
          const map = mapRef.current.getMap();
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const lngLat = map.unproject([x, y]);
          setUserLocation([lngLat.lng, lngLat.lat]);
          setIsPickingLocation(false);
          setIsNearestPanelOpen(true);
        }
      }}
    >
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={BASEMAP_STYLE_URL}
        style={{ width: "100%", height: "100%" }}
        minZoom={INITIAL_VIEW_STATE.minZoom}
        maxZoom={INITIAL_VIEW_STATE.maxZoom}
        attributionControl={false}
        interactiveLayerIds={interactiveLayerIds}
        cursor={isPickingLocation ? "crosshair" : cursor}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setCursor("pointer")}
        onLoad={() => {
          if (!mapRef.current) return;
          setIsMapReady(true);
          if (typeof window !== "undefined") {
            (window as any)._mapLibreInstance = mapRef.current.getMap();
          }
          if (selectedCityId) {
            const targetCity = dataset.cities.find((c) => c.id === selectedCityId);
            if (targetCity) {
              const [minLng, minLat, maxLng, maxLat] = targetCity.bbox;
              const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
              mapRef.current.fitBounds(
                [
                  [minLng, minLat],
                  [maxLng, maxLat],
                ],
                {
                  padding: isDesktop
                    ? { top: 70, bottom: 70, left: 400, right: 80 }
                    : { top: 80, bottom: 80, left: 24, right: 24 },
                    duration: 0,
                  essential: true,
                }
              );
            }
          }
        }}
        onMoveStart={() => setIsLoadingTiles(true)}
        onIdle={() => setIsLoadingTiles(false)}
      >
        <NavigationControl position="top-right" showCompass showZoom />
        <GeolocateControl
          position="top-right"
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation={false}
          onGeolocate={(e: any) => {
            if (e.coords) {
              setUserLocation([e.coords.longitude, e.coords.latitude]);
              setIsNearestPanelOpen(true);
            }
          }}
        />

        {catchmentGeoJson && (
          <Source id="walking-catchment-source" type="geojson" data={catchmentGeoJson}>
            <Layer
              id="walking-catchment-fill"
              type="fill"
              paint={{
                "fill-color": ["match", ["get", "radius"], 500, "#34d399", "#38bdf8"],
                "fill-opacity": 0.1,
                "fill-outline-color": ["match", ["get", "radius"], 500, "#6ee7b7", "#7dd3fc"],
              }}
            />
          </Source>
        )}

        <Source id="metro-segments" type="geojson" data={dataset.segments}>
          <Layer {...getSelectedSegmentLayer(selectedSegmentId)} />
          <Layer {...getSelectedSchematicSegmentLayer(selectedSegmentId)} />
          <Layer {...withFilter(operationalLineLayer, operationalFilter)} />
          <Layer {...withFilter(constructionLineLayer, constructionFilter)} />
          <Layer
            {...withFilter(schematicLineLayer, [
              "all",
              ["==", ["get", "geometry_quality"], "schematic"],
              ["any", constructionFilter, plannedFilter],
            ])}
          />
          <Layer {...withFilter(plannedLineLayer, plannedFilter)} />
        </Source>

        <Source id="metro-stations" type="geojson" data={dataset.stations}>
          <Layer
            {...withVisibility(
              getSelectedStationLayer(selectedStationId),
              showStations
            )}
          />
          <Layer
            {...withVisibility(
              withFilter(stationCircleLayer, stationFilter),
              showStations
            )}
          />
          <Layer
            {...withVisibility(
              withFilter(
                interchangeStationLayer,
                stationFilter
                  ? ["all", stationFilter, ["==", ["get", "is_interchange"], true]]
                  : ["==", ["get", "is_interchange"], true]
              ),
              showStations
            )}
          />
          <Layer
            {...withVisibility(
              withFilter(stationLabelsLayer, stationFilter),
              showStations
            )}
          />
        </Source>

        {routeGeoJson && (
          <Source id="route-highlight-source" type="geojson" data={routeGeoJson}>
            <Layer
              id="route-highlight-casing"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": "#ffffff",
                "line-width": 8,
                "line-opacity": 0.85,
              }}
            />
            <Layer
              id="route-highlight-core"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": ["coalesce", ["get", "color"], "#10b981"],
                "line-width": 4.5,
                "line-opacity": 1,
              }}
            />
          </Source>
        )}

        {activeRoute && activeRoute.totalStops > 0 && (
          <>
            <Marker
              longitude={activeRoute.origin.coordinates[0]}
              latitude={activeRoute.origin.coordinates[1]}
              anchor="center"
            >
              <div
                data-testid="route-origin-marker"
                className="relative flex h-6 w-6 items-center justify-center pointer-events-none"
                title={`Origin: ${activeRoute.origin.name}`}
              >
                <span className="absolute h-6 w-6 animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-md" />
              </div>
            </Marker>
            <Marker
              longitude={activeRoute.destination.coordinates[0]}
              latitude={activeRoute.destination.coordinates[1]}
              anchor="center"
            >
              <div
                data-testid="route-destination-marker"
                className="relative flex h-6 w-6 items-center justify-center pointer-events-none"
                title={`Destination: ${activeRoute.destination.name}`}
              >
                <span className="absolute h-6 w-6 animate-ping rounded-full bg-rose-500 opacity-60" />
                <span className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-rose-500 shadow-md" />
              </div>
            </Marker>
          </>
        )}

        {userLocation && (
          <Marker
            longitude={userLocation[0]}
            latitude={userLocation[1]}
            anchor="center"
          >
            <div
              data-testid="user-location-marker"
              className="relative flex h-6 w-6 items-center justify-center pointer-events-none"
              title="Your location"
            >
              <span className="absolute h-6 w-6 animate-ping rounded-full bg-blue-500 opacity-60" />
              <span className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow-md" />
            </div>
          </Marker>
        )}
      </Map>

      {isLoadingTiles && (
        <div
          data-testid="map-loading-indicator"
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-300 shadow-md backdrop-blur-sm"
        >
          <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
          <span>Updating map...</span>
        </div>
      )}

      <HoverTooltip />
    </div>
  );
}
