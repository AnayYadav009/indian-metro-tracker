"use client";

import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import Map, {
  NavigationControl,
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

export function MapCanvas({ className = "" }: MapCanvasProps) {
  const mapRef = useRef<MapRef>(null);
  const [cursor, setCursor] = useState<string>("auto");

  const selectedCityId = useMetroStore((state) => state.selectedCityId);
  const selectedStatuses = useMetroStore((state) => state.selectedStatuses);
  const selectedPhases = useMetroStore((state) => state.selectedPhases);
  const selectedFeature = useMetroStore((state) => state.selectedFeature);
  const setSelectedFeature = useMetroStore((state) => state.setSelectedFeature);
  const clearSelectedFeature = useMetroStore(
    (state) => state.clearSelectedFeature
  );
  const setHoveredFeature = useMetroStore((state) => state.setHoveredFeature);
  const selectedYear = useMetroStore((state) => state.selectedYear);
  const includeFuture = useMetroStore((state) => state.includeFuture);
  const showStations = useMetroStore((state) => state.showStations);
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
    [clearSelectedFeature, setSelectedFeature]
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

  const handleMouseLeave = useCallback(() => {
    setCursor("auto");
    setHoveredFeature(null);
  }, [setHoveredFeature]);

  return (
    <div
      data-testid="map-container"
      className={`relative h-full w-full overflow-hidden ${className}`}
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
        cursor={cursor}
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
