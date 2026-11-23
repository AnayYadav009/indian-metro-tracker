"use client";

import { useEffect, useRef } from "react";
import { useMetroStore, type SelectedFeature } from "@/store/use-metro-store";
import { getSegmentById, getStationById } from "@/lib/data";
import type { Status } from "@/types/schema";

/**
 * Custom hook to synchronize filter and selection state with URL search parameters.
 * Allows deep linking, sharing of specific line/station selections, and persistent selection across page reloads.
 */
export function useUrlSync() {
  const selectedCityId = useMetroStore((state) => state.selectedCityId);
  const selectedStatuses = useMetroStore((state) => state.selectedStatuses);
  const selectedPhases = useMetroStore((state) => state.selectedPhases);
  const selectedFeature = useMetroStore((state) => state.selectedFeature);

  const setSelectedCity = useMetroStore((state) => state.setSelectedCity);
  const setStatuses = useMetroStore((state) => state.setStatuses);
  const setPhases = useMetroStore((state) => state.setPhases);
  const setSelectedFeature = useMetroStore((state) => state.setSelectedFeature);

  const isInitialized = useRef(false);

  // 1. Initial hydration from URL on mount
  useEffect(() => {
    if (typeof window === "undefined" || isInitialized.current) return;
    isInitialized.current = true;

    try {
      const params = new URLSearchParams(window.location.search);

      // Hydrate city
      const city = params.get("city");
      if (city) {
        setSelectedCity(city);
      }

      // Hydrate status
      const statusParam = params.get("status");
      if (statusParam) {
        const statuses = statusParam.split(",").filter((s) =>
          ["operational", "construction", "planned"].includes(s)
        ) as Status[];
        if (statuses.length > 0) {
          setStatuses(statuses);
        }
      }

      // Hydrate phases
      const phaseParam = params.get("phase");
      if (phaseParam) {
        const phases = phaseParam.split(",").map((p) => decodeURIComponent(p.trim())).filter(Boolean);
        if (phases.length > 0) {
          setPhases(phases);
        }
      }

      // Hydrate selection: ?selected=segment:del-yellow-seg-01 or ?selected=station:del-rajiv-chowk
      const selectedParam = params.get("selected");
      if (selectedParam) {
        const [type, id] = selectedParam.split(":");
        if (type === "segment" && id) {
          const seg = getSegmentById(id);
          if (seg) {
            setSelectedFeature({ type: "segment", data: seg.properties });
          }
        } else if (type === "station" && id) {
          const stn = getStationById(id);
          if (stn) {
            setSelectedFeature({ type: "station", data: stn.properties });
          }
        }
      }
    } catch (err) {
      console.warn("Failed to parse URL search parameters:", err);
    }
  }, [setSelectedCity, setStatuses, setPhases, setSelectedFeature]);

  // 2. Sync state updates back to URL
  useEffect(() => {
    if (typeof window === "undefined" || !isInitialized.current) return;

    try {
      const params = new URLSearchParams();

      if (selectedCityId) {
        params.set("city", selectedCityId);
      }

      if (selectedStatuses.length < 3) {
        params.set("status", selectedStatuses.join(","));
      }

      if (selectedPhases.length > 0) {
        params.set("phase", selectedPhases.join(","));
      }

      if (selectedFeature) {
        if (selectedFeature.type === "segment") {
          params.set("selected", `segment:${selectedFeature.data.segment_id}`);
        } else if (selectedFeature.type === "station") {
          params.set("selected", `station:${selectedFeature.data.station_id}`);
        }
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;

      window.history.replaceState(null, "", newUrl);
    } catch (err) {
      console.warn("Failed to update URL search parameters:", err);
    }
  }, [selectedCityId, selectedStatuses, selectedPhases, selectedFeature]);
}
