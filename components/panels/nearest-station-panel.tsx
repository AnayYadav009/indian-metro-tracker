"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Navigation,
  MapPin,
  Crosshair,
  AlertTriangle,
  X,
  ChevronRight,
  ShieldCheck,
  Building2,
  RefreshCw,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useMetroStore } from "@/store/use-metro-store";
import {
  findNearestStations,
  type NearestStationOutcome,
} from "@/lib/nearest-station";
import { getCities } from "@/lib/data";
import { getGoogleMapsWalkingUrl } from "@/lib/geo";

export function NearestStationPanel() {
  const isNearestPanelOpen = useMetroStore((state) => state.isNearestPanelOpen);
  const setIsNearestPanelOpen = useMetroStore(
    (state) => state.setIsNearestPanelOpen
  );
  const isPickingLocation = useMetroStore((state) => state.isPickingLocation);
  const setIsPickingLocation = useMetroStore(
    (state) => state.setIsPickingLocation
  );
  const userLocation = useMetroStore((state) => state.userLocation);
  const setUserLocation = useMetroStore((state) => state.setUserLocation);
  const setSelectedFeature = useMetroStore((state) => state.setSelectedFeature);
  const setSelectedCity = useMetroStore((state) => state.setSelectedCity);
  const startRouteFromStation = useMetroStore((state) => state.startRouteFromStation);
  const selectedFeature = useMetroStore((state) => state.selectedFeature);
  const showWalkingCatchment = useMetroStore((state) => state.showWalkingCatchment);
  const toggleWalkingCatchment = useMetroStore((state) => state.toggleWalkingCatchment);

  const [includeConstruction, setIncludeConstruction] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<{
    code: "PERMISSION_DENIED" | "UNAVAILABLE" | "TIMEOUT" | "UNSUPPORTED";
    message: string;
  } | null>(null);

  const cities = useMemo(() => getCities(), []);

  // Compute nearest outcome when userLocation changes or includeConstruction toggles
  const outcome: NearestStationOutcome | null = useMemo(() => {
    if (!userLocation) return null;
    return findNearestStations(userLocation, {
      includeConstruction,
      limit: 5,
    });
  }, [userLocation, includeConstruction]);

  const requestGeolocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoError({
        code: "UNSUPPORTED",
        message: "Geolocation is not supported by your browser.",
      });
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setUserLocation([pos.coords.longitude, pos.coords.latitude]);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError({
            code: "PERMISSION_DENIED",
            message:
              "Location access was denied. You can still pick a location on the map or select a city below.",
          });
        } else if (err.code === err.TIMEOUT) {
          setGeoError({
            code: "TIMEOUT",
            message: "Location request timed out. Please try again or pick on map.",
          });
        } else {
          setGeoError({
            code: "UNAVAILABLE",
            message:
              "Location information is currently unavailable. Try picking a point on the map.",
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [setUserLocation]);

  // Automatically request location when panel opens if no location set yet
  useEffect(() => {
    if (isNearestPanelOpen && !userLocation && !geoError && !isLocating) {
      requestGeolocation();
    }
  }, [isNearestPanelOpen, userLocation, geoError, isLocating, requestGeolocation]);

  if (!isNearestPanelOpen) return null;

  return (
    <div
      data-testid="nearest-station-panel"
      className={`absolute top-16 right-4 z-30 flex max-h-[calc(100vh-8.5rem)] w-[calc(100vw-2rem)] max-w-md flex-col overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-900/95 shadow-2xl backdrop-blur-md sm:right-6 ${selectedFeature ? "md:hidden" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Navigation className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Nearest Metro Stations
            </h2>
            <p className="text-[11px] text-slate-400">
              Straight-line proximity to Indian metro networks
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsNearestPanelOpen(false);
            setIsPickingLocation(false);
          }}
          data-testid="close-nearest-panel"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          aria-label="Close nearest stations panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto px-4 py-3 space-y-3 text-xs">
        {/* Action Buttons & Fallbacks */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={requestGeolocation}
            disabled={isLocating}
            data-testid="locate-me-btn"
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <Crosshair className={`h-3.5 w-3.5 ${isLocating ? "animate-spin" : ""}`} />
            <span>{isLocating ? "Locating..." : "Use My Location"}</span>
          </button>

          <button
            onClick={() => setIsPickingLocation(!isPickingLocation)}
            data-testid="pick-point-btn"
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors ${
              isPickingLocation
                ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>{isPickingLocation ? "Click map to set..." : "Pick on Map"}</span>
          </button>
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2 text-[11px] text-slate-300 hover:border-slate-700">
          <input type="checkbox" checked={showWalkingCatchment} onChange={toggleWalkingCatchment} data-testid="toggle-walking-catchment" className="h-3.5 w-3.5 accent-emerald-500" />
          <span>Show Walking Catchment (500m / 1km)</span>
        </label>

        {/* Picking Location Banner */}
        {isPickingLocation && (
          <div
            data-testid="picking-location-banner"
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-300 flex items-center justify-between"
          >
            <span>Tap or click anywhere on the map to find stations near that point.</span>
            <button
              onClick={() => setIsPickingLocation(false)}
              className="text-amber-400 underline ml-2"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Permission Denied / Error Banner */}
        {geoError && (
          <div
            data-testid={
              geoError.code === "PERMISSION_DENIED"
                ? "geo-permission-denied"
                : "geo-error"
            }
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-slate-300 space-y-1.5"
          >
            <div className="flex items-center gap-1.5 font-medium text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{geoError.message}</span>
            </div>
            {geoError.code === "PERMISSION_DENIED" && (
              <p className="text-[11px] text-slate-400">
                You can pick a point on the map above or jump to any city below:
              </p>
            )}
          </div>
        )}

        {/* City Search / Fallback Picker */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <label htmlFor="city-fallback-select" className="text-[11px] text-slate-400 shrink-0">
            Or jump to city:
          </label>
          <select
            id="city-fallback-select"
            data-testid="city-fallback-select"
            onChange={(e) => {
              const cityId = e.target.value;
              if (!cityId) return;
              const targetCity = cities.find((c) => c.id === cityId);
              if (targetCity) {
                // Use city center coordinates [centerLng, centerLat]
                const [minLng, minLat, maxLng, maxLat] = targetCity.bbox;
                const centerLng = (minLng + maxLng) / 2;
                const centerLat = (minLat + maxLat) / 2;
                setUserLocation([centerLng, centerLat]);
                setSelectedCity(targetCity.id);
              }
            }}
            className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Select a city...</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        {/* Include Construction Toggle */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <label
            htmlFor="toggle-construction"
            className="text-[11px] text-slate-300 cursor-pointer"
          >
            Include under-construction stations (not yet open)
          </label>
          <input
            id="toggle-construction"
            data-testid="toggle-construction"
            type="checkbox"
            checked={includeConstruction}
            onChange={(e) => setIncludeConstruction(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
          />
        </div>

        {/* Results Section */}
        {userLocation && outcome && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            {outcome.status === "too_far" && (
              <div
                data-testid="too-far-message"
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200 space-y-1"
              >
                <div className="flex items-center gap-1.5 font-medium text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Metro Service Out of Range (&gt;50 km)</span>
                </div>
                <p className="text-[11px] text-slate-300">{outcome.message}</p>
              </div>
            )}

            {outcome.status === "no_operational_network" && (
              <div
                data-testid="no-operational-message"
                className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sky-200 space-y-1"
              >
                <div className="flex items-center gap-1.5 font-medium text-sky-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>No Operational Metro Yet</span>
                </div>
                <p className="text-[11px] text-slate-300">{outcome.message}</p>
                <p className="text-[11px] text-slate-400">
                  Toggle &quot;Include under-construction stations&quot; above to preview upcoming lines.
                </p>
              </div>
            )}

            {outcome.status === "success" && (
              <div className="space-y-2" data-testid="nearest-stations-list">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Found {outcome.stations.length} closest stations</span>
                  <span className="text-emerald-400 font-mono">
                    Nearest: {outcome.stations[0].formattedDistance}
                  </span>
                </div>

                {outcome.stations.map((res) => (
                  <div
                    key={res.station.properties.station_id}
                    data-testid="nearest-station-item"
                    className="group rounded-lg border border-slate-800 bg-slate-800/60 p-2.5 transition-all hover:border-slate-600 hover:bg-slate-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-100">
                            {res.station.properties.name}
                          </span>
                          {res.isInterchange && (
                            <span
                              data-testid="interchange-badge"
                              className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-amber-300"
                            >
                              Interchange
                            </span>
                          )}
                          {res.isNotYetOpen && (
                            <span
                              data-testid="not-yet-open-badge"
                              className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-sky-300"
                            >
                              Under Construction (Not yet open)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {res.cityName}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          data-testid="straight-line-distance"
                          className="font-mono text-xs font-semibold text-emerald-400"
                        >
                          {res.formattedDistance}
                        </span>
                      </div>
                    </div>

                    {/* Lines Served */}
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {res.lines.map((l) => (
                        <span
                          key={l.id}
                          data-testid="station-line-badge"
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-slate-200 border border-slate-700/80"
                          style={{
                            backgroundColor: `${l.color}20`,
                            borderColor: l.color,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: l.color }}
                          />
                          {l.name}
                        </span>
                      ))}
                    </div>

                    {/* Data Completeness Caveat Notice if applicable */}
                    {res.caveatNotice && (
                      <div
                        data-testid="completeness-notice"
                        className="mt-2 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300"
                      >
                        ⚠️ {res.caveatNotice}
                      </div>
                    )}

                    {/* View on map action */}
                    <div className="mt-2 flex items-center justify-between border-t border-slate-700/40 pt-2">
                      <button
                        type="button"
                        onClick={() => startRouteFromStation(res.station.properties)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        Route from here <ArrowRight className="h-3 w-3" />
                      </button>
                      {userLocation && (
                        <a
                          href={getGoogleMapsWalkingUrl(
                            userLocation,
                            res.station.geometry.coordinates as [number, number]
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="walk-directions-link"
                          className="inline-flex items-center gap-1 text-[10.5px] text-slate-400 hover:text-slate-200 hover:underline"
                          title="Open walking directions in Google Maps"
                        >
                          <span>Walk directions</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setSelectedCity(res.cityId);
                          setSelectedFeature({
                            type: "station",
                            data: res.station.properties,
                          });
                        }}
                        data-testid="view-on-map-btn"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
                      >
                        <span>View on map</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Privacy Note */}
        <div
          data-testid="privacy-note"
          className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-[10px] text-slate-400 flex items-start gap-1.5"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Client-Side Only:</strong> Your location is processed locally in memory. No coordinates leave your device, are logged, or are stored.
          </span>
        </div>
      </div>
    </div>
  );
}
