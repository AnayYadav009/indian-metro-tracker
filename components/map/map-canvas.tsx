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

// Fix for Next.js 15 Webpack worker loading issue
if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl(
    "https://unpkg.com/maplibre-gl@6.12.0/dist/maplibre-gl-worker.mjs"
  );
}

import {
  BASEMAP_CONFIG,
  BASEMAP_STYLE_URL,
  INITIAL_VIEW_STATE,
} from "@/lib/map-config";
import { getMetroData } from "@/lib/data";
import { useMetroStore } from "@/store/use-metro-store";
import {
  INTERACTIVE_LAYER_IDS,
  operationalLineLayer,
  constructionLineLayer,
  plannedLineLayer,
  getSelectedSegmentLayer,
  stationCircleLayer,
  getSelectedStationLayer,
  stationLabelsLayer,
  withFilter,
} from "./map-layers";
import { HoverTooltip } from "./hover-tooltip";

interface MapCanvasProps {
  className?: string;
}

export function MapCanvas({ className = "" }: MapCanvasProps) {
  const mapRef = useRef<MapRef>(null);
  const [cursor, setCursor] = useState<string>("auto");

  // Subscribe to filter & selection state
  const selectedCityId = useMetroStore((state) => state.selectedCityId);
  const selectedStatuses = useMetroStore((state) => state.selectedStatuses);
  const selectedPhases = useMetroStore((state) => state.selectedPhases);
  const searchQuery = useMetroStore((state) => state.searchQuery);
  const selectedFeature = useMetroStore((state) => state.selectedFeature);
  const setSelectedFeature = useMetroStore((state) => state.setSelectedFeature);
  const clearSelectedFeature = useMetroStore(
    (state) => state.clearSelectedFeature
  );
  const setHoveredFeature = useMetroStore((state) => state.setHoveredFeature);

  // Compute selected IDs for highlight layers
  const selectedSegmentId =
    selectedFeature?.type === "segment"
      ? selectedFeature.data.segment_id
      : null;
  const selectedStationId =
    selectedFeature?.type === "station"
      ? selectedFeature.data.station_id
      : null;

  // Load metro dataset
  const dataset = useMemo(() => getMetroData(), []);

  // MapLibre WebGL Layer Filter Expressions (filters applied directly by GPU without re-parsing GeoJSON)
  const operationalFilter = useMemo(() => {
    if (!selectedStatuses.includes("operational")) {
      return ["==", ["get", "status"], "__NONE__"];
    }
    const conditions: unknown[] = ["all", ["==", ["get", "status"], "operational"]];

    if (selectedCityId) {
      const activeCity = dataset.cities.find((c) => c.id === selectedCityId);
      if (activeCity) {
        conditions.push(["==", ["get", "city"], activeCity.name]);
      }
    }

    if (selectedPhases.length > 0) {
      conditions.push(["in", ["get", "phase"], ["literal", selectedPhases]]);
    }

    return conditions;
  }, [selectedStatuses, selectedCityId, selectedPhases, dataset.cities]);

  const constructionFilter = useMemo(() => {
    if (!selectedStatuses.includes("construction")) {
      return ["==", ["get", "status"], "__NONE__"];
    }
    const conditions: unknown[] = ["all", ["==", ["get", "status"], "construction"]];

    if (selectedCityId) {
      const activeCity = dataset.cities.find((c) => c.id === selectedCityId);
      if (activeCity) {
        conditions.push(["==", ["get", "city"], activeCity.name]);
      }
    }

    if (selectedPhases.length > 0) {
      conditions.push(["in", ["get", "phase"], ["literal", selectedPhases]]);
    }

    return conditions;
  }, [selectedStatuses, selectedCityId, selectedPhases, dataset.cities]);

  const plannedFilter = useMemo(() => {
    if (!selectedStatuses.includes("planned")) {
      return ["==", ["get", "status"], "__NONE__"];
    }
    const conditions: unknown[] = ["all", ["==", ["get", "status"], "planned"]];

    if (selectedCityId) {
      const activeCity = dataset.cities.find((c) => c.id === selectedCityId);
      if (activeCity) {
        conditions.push(["==", ["get", "city"], activeCity.name]);
      }
    }

    if (selectedPhases.length > 0) {
      conditions.push(["in", ["get", "phase"], ["literal", selectedPhases]]);
    }

    return conditions;
  }, [selectedStatuses, selectedCityId, selectedPhases, dataset.cities]);

  const stationFilter = useMemo(() => {
    const conditions: unknown[] = ["all"];

    if (selectedStatuses.length < 3) {
      conditions.push(["in", ["get", "status"], ["literal", selectedStatuses]]);
    }

    if (selectedCityId) {
      const activeCity = dataset.cities.find((c) => c.id === selectedCityId);
      if (activeCity) {
        conditions.push(["==", ["get", "city"], activeCity.name]);
      }
    }

    if (selectedPhases.length > 0) {
      conditions.push(["in", ["get", "phase"], ["literal", selectedPhases]]);
    }

    return conditions.length === 1 ? undefined : conditions;
  }, [selectedStatuses, selectedCityId, selectedPhases, dataset.cities]);

  // Pan/zoom map when city selection changes
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedCityId) {
      const targetCity = dataset.cities.find((c) => c.id === selectedCityId);
      if (targetCity) {
        const [minLng, minLat, maxLng, maxLat] = targetCity.bbox;
        mapRef.current.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          {
            padding: 80,
            duration: 1200,
          }
        );
      }
    } else {
      mapRef.current.flyTo({
        center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
        zoom: INITIAL_VIEW_STATE.zoom,
        duration: 1200,
      });
    }
  }, [selectedCityId, dataset.cities]);

  // Handle click on map features
  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const features = e.features;
      if (!features || features.length === 0) {
        clearSelectedFeature();
        return;
      }

      // Prioritize station points over lines when both overlap
      const stationF = features.find(
        (f) =>
          f.layer.id === "station-points" ||
          (f.properties && "station_id" in f.properties)
      );

      if (stationF && stationF.properties) {
        const stationId = stationF.properties.station_id;
        const matched = dataset.stations.features.find(
          (f) => f.properties.station_id === stationId
        );
        if (matched) {
          setSelectedFeature({
            type: "station",
            data: matched.properties,
          });
          return;
        }
      }

      // Check for metro segments
      const segmentF = features.find(
        (f) =>
          f.layer.id === "operational-lines" ||
          f.layer.id === "construction-lines" ||
          f.layer.id === "planned-lines" ||
          (f.properties && "segment_id" in f.properties)
      );

      if (segmentF && segmentF.properties) {
        const segmentId = segmentF.properties.segment_id;
        const matched = dataset.segments.features.find(
          (f) => f.properties.segment_id === segmentId
        );
        if (matched) {
          setSelectedFeature({
            type: "segment",
            data: matched.properties,
          });
          return;
        }
      }

      // If clicked on canvas without interactive feature, clear selection
      clearSelectedFeature();
    },
    [clearSelectedFeature, dataset, setSelectedFeature]
  );

  // Handle mouse move for hover tooltip and pointer cursor
  const handleMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      const features = e.features;
      if (features && features.length > 0) {
        setCursor("pointer");

        // Station hover
        const stationF = features.find(
          (f) =>
            f.layer.id === "station-points" ||
            (f.properties && "station_id" in f.properties)
        );
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

        // Segment hover
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
    [setHoveredFeature]
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
        interactiveLayerIds={INTERACTIVE_LAYER_IDS}
        cursor={cursor}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={handleMouseLeave}
      >
        <NavigationControl position="top-right" showCompass showZoom />

        {/* Metro Segments: Solid (operational), Dashed (construction), Dotted (planned) */}
        <Source id="metro-segments" type="geojson" data={dataset.segments}>
          {/* Highlight glowing underlay for selected segment */}
          <Layer {...getSelectedSegmentLayer(selectedSegmentId)} />
          <Layer {...withFilter(operationalLineLayer, operationalFilter)} />
          <Layer {...withFilter(constructionLineLayer, constructionFilter)} />
          <Layer {...withFilter(plannedLineLayer, plannedFilter)} />
        </Source>

        {/* Metro Stations: Points with interchange indicators and labels */}
        <Source id="metro-stations" type="geojson" data={dataset.stations}>
          {/* Highlight ring for selected station */}
          <Layer {...getSelectedStationLayer(selectedStationId)} />
          <Layer {...withFilter(stationCircleLayer, stationFilter)} />
          <Layer {...withFilter(stationLabelsLayer, stationFilter)} />
        </Source>
      </Map>

      {/* Hover preview tooltip */}
      <HoverTooltip />

      {/* Mandatory visible OSM & OpenFreeMap attribution */}
      <div
        data-testid="osm-attribution"
        className="absolute bottom-2 right-2 z-40 rounded border border-slate-800 bg-slate-950/90 px-2.5 py-1 text-[11px] text-slate-300 shadow backdrop-blur-sm pointer-events-auto"
      >
        <span>Basemap: </span>
        <a
          href={BASEMAP_CONFIG.providerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-300 underline underline-offset-2 hover:text-white"
        >
          {BASEMAP_CONFIG.provider}
        </a>
        <span className="mx-1.5 text-slate-600">|</span>
        <a
          href={BASEMAP_CONFIG.osmAttributionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-300 underline underline-offset-2 hover:text-white"
        >
          {BASEMAP_CONFIG.osmAttribution}
        </a>
      </div>
    </div>
  );
}

export default MapCanvas;
