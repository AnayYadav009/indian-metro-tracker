"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowRightLeft,
  X,
  Navigation,
  Clock,
  MapPin,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useMetroStore } from "@/store/use-metro-store";
import { getMetroData } from "@/lib/data";
import { buildTransitGraph, findRoute } from "@/lib/routing/graph";
import { getCityRoutability } from "@/lib/routing/city-guard";
import type { RouteResult } from "@/lib/routing/types";

export function RouteFinderPanel() {
  const isRoutePanelOpen = useMetroStore((state) => state.isRoutePanelOpen);
  const selectedFeature = useMetroStore((state) => state.selectedFeature);
  const setIsRoutePanelOpen = useMetroStore(
    (state) => state.setIsRoutePanelOpen
  );
  const selectedCityId = useMetroStore((state) => state.selectedCityId);
  const setSelectedCity = useMetroStore((state) => state.setSelectedCity);
  const routeOriginId = useMetroStore((state) => state.routeOriginId);
  const routeDestinationId = useMetroStore(
    (state) => state.routeDestinationId
  );
  const setRouteOriginId = useMetroStore((state) => state.setRouteOriginId);
  const setRouteDestinationId = useMetroStore(
    (state) => state.setRouteDestinationId
  );
  const routeFocusTarget = useMetroStore((state) => state.routeFocusTarget);
  const setRouteFocusTarget = useMetroStore((state) => state.setRouteFocusTarget);
  const activeRoute = useMetroStore((state) => state.activeRoute);
  const setActiveRoute = useMetroStore((state) => state.setActiveRoute);
  const clearRoute = useMetroStore((state) => state.clearRoute);

  const dataset = useMemo(() => getMetroData(), []);

  // Default to Kochi or first routable city if none selected
  const activeCityId = selectedCityId || "kochi";
  const cityRoutability = useMemo(
    () => getCityRoutability(activeCityId),
    [activeCityId]
  );

  // Operational stations for the active city (filtered to routable lines)
  const routableLineSet = useMemo(
    () => new Set(cityRoutability.routableLineIds),
    [cityRoutability.routableLineIds]
  );

  const cityOperationalStations = useMemo(() => {
    return dataset.stations.features
      .filter(
        (st) =>
          st.properties.city_id === activeCityId &&
          st.properties.status === "operational" &&
          (cityRoutability.routableLineIds.length === 0 ||
            st.properties.line_ids.some((lid) => routableLineSet.has(lid)))
      )
      .map((st) => ({
        id: st.properties.station_id,
        name: st.properties.name,
        lines: st.properties.line_ids,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dataset.stations.features, activeCityId, routableLineSet, cityRoutability.routableLineIds]);

  // Build transit graph for active city with allowed routable lines
  const graph = useMemo(() => {
    return buildTransitGraph({
      cityId: activeCityId,
      allowedLineIds:
        cityRoutability.routableLineIds.length > 0
          ? cityRoutability.routableLineIds
          : undefined,
    });
  }, [activeCityId, cityRoutability.routableLineIds]);

  // Autocomplete / Search state
  const [originQuery, setOriginQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [isOriginFocused, setIsOriginFocused] = useState(false);
  const [isDestFocused, setIsDestFocused] = useState(false);
  const [expandedLegs, setExpandedLegs] = useState<Record<number, boolean>>({});

  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  // Sync origin/dest display when store changes
  useEffect(() => {
    if (routeOriginId) {
      const st = dataset.stations.features.find(
        (s) => s.properties.station_id === routeOriginId
      );
      if (st) setOriginQuery(st.properties.name);
    } else {
      setOriginQuery("");
    }
  }, [routeOriginId, dataset.stations.features]);

  useEffect(() => {
    if (routeDestinationId) {
      const st = dataset.stations.features.find(
        (s) => s.properties.station_id === routeDestinationId
      );
      if (st) setDestQuery(st.properties.name);
    } else {
      setDestQuery("");
    }
  }, [routeDestinationId, dataset.stations.features]);

  useEffect(() => {
    if (!isRoutePanelOpen || !routeFocusTarget) return;
    (routeFocusTarget === "origin" ? originInputRef : destInputRef).current?.focus();
    setRouteFocusTarget(null);
  }, [isRoutePanelOpen, routeFocusTarget, setRouteFocusTarget]);

  // Read URL query parameters on initial mount once
  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || hasHydratedRef.current) return;
    hasHydratedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get("from");
    const toParam = params.get("to");
    if (fromParam) {
      setRouteOriginId(fromParam);
      setIsRoutePanelOpen(true);
    }
    if (toParam) {
      setRouteDestinationId(toParam);
      setIsRoutePanelOpen(true);
    }
  }, [setRouteOriginId, setRouteDestinationId, setIsRoutePanelOpen]);

  // Update URL search parameters when route selection changes
  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedRef.current) return;
    const url = new URL(window.location.href);
    let changed = false;
    if (routeOriginId) {
      if (url.searchParams.get("from") !== routeOriginId) {
        url.searchParams.set("from", routeOriginId);
        changed = true;
      }
    } else if (url.searchParams.has("from")) {
      url.searchParams.delete("from");
      changed = true;
    }

    if (routeDestinationId) {
      if (url.searchParams.get("to") !== routeDestinationId) {
        url.searchParams.set("to", routeDestinationId);
        changed = true;
      }
    } else if (url.searchParams.has("to")) {
      url.searchParams.delete("to");
      changed = true;
    }

    if (changed) {
      window.history.replaceState({}, "", url.toString());
    }
  }, [routeOriginId, routeDestinationId]);

  // Compute route when origin and destination are set
  useEffect(() => {
    if (!cityRoutability.isRoutable) {
      setActiveRoute(null);
      return;
    }
    if (!routeOriginId || !routeDestinationId) {
      setActiveRoute(null);
      return;
    }
    const result = findRoute(graph, routeOriginId, routeDestinationId);
    setActiveRoute(result);
  }, [routeOriginId, routeDestinationId, graph, cityRoutability.isRoutable, setActiveRoute]);

  // Filtered station suggestions
  const originSuggestions = useMemo(() => {
    if (!originQuery.trim()) return cityOperationalStations;
    const q = originQuery.toLowerCase();
    return cityOperationalStations.filter((st) =>
      st.name.toLowerCase().includes(q)
    );
  }, [cityOperationalStations, originQuery]);

  const destSuggestions = useMemo(() => {
    if (!destQuery.trim()) return cityOperationalStations;
    const q = destQuery.toLowerCase();
    return cityOperationalStations.filter((st) =>
      st.name.toLowerCase().includes(q)
    );
  }, [cityOperationalStations, destQuery]);

  const handleSwap = () => {
    const prevOrigin = routeOriginId;
    const prevDest = routeDestinationId;
    setRouteOriginId(prevDest);
    setRouteDestinationId(prevOrigin);
  };

  const handleClear = () => {
    clearRoute();
    setOriginQuery("");
    setDestQuery("");
  };

  const toggleLegExpanded = (idx: number) => {
    setExpandedLegs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!isRoutePanelOpen) return null;

  return (
    <aside
      data-testid="route-finder-panel"
      className={`absolute top-16 left-2 right-2 z-30 flex max-h-[calc(100vh-8.5rem)] w-auto flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-md sm:left-auto sm:right-6 sm:w-96 ${selectedFeature ? "md:hidden" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-800/40">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Route Finder</h2>
        </div>
        <div className="flex items-center gap-2">
          {(routeOriginId || routeDestinationId) && (
            <button
              onClick={handleClear}
              data-testid="route-clear-btn"
              className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setIsRoutePanelOpen(false)}
            data-testid="close-route-panel-btn"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Close Route Finder"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* City Selector */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Network / City
          </label>
          <select
            value={activeCityId}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              handleClear();
            }}
            data-testid="route-city-select"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            {dataset.cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Guard Notice if network is non-routable */}
        {!cityRoutability.isRoutable ? (
          <div
            data-testid="route-guard-notice"
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1.5"
          >
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Routing is not available for this network yet</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              {cityRoutability.reason}
            </p>
          </div>
        ) : (
          <>
            {/* Partly Routable Notice */}
            {cityRoutability.status === "partly_routable" && (
              <div
                data-testid="route-partly-routable-notice"
                className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-2.5 text-xs text-sky-200 flex items-start gap-2"
              >
                <Info className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-sky-200/90">
                  <span className="font-semibold text-sky-300">Partial Network:</span>{" "}
                  {cityRoutability.routableLineIds.length} verified lines available. Lines under review:{" "}
                  {cityRoutability.unroutableLines.map((u) => u.name).join(", ")}.
                </div>
              </div>
            )}

            {/* Origin & Destination Inputs */}
            <div className="space-y-2 relative">
              {/* Origin input */}
              <div className="relative">
                <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 focus-within:border-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 mr-2 shrink-0" />
                  <input
                    ref={originInputRef}
                    type="text"
                    value={originQuery}
                    onChange={(e) => {
                      setOriginQuery(e.target.value);
                      setRouteOriginId(null);
                    }}
                    onFocus={() => {
                      setIsOriginFocused(true);
                      setRouteFocusTarget("origin");
                    }}
                    onBlur={() => setTimeout(() => setIsOriginFocused(false), 200)}
                    placeholder="Origin station"
                    data-testid="route-origin-input"
                    className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                </div>
                {/* Autocomplete dropdown for origin */}
                {isOriginFocused && originSuggestions.length > 0 && !routeOriginId && (
                  <ul
                    data-testid="origin-suggestions-list"
                    className="absolute left-0 right-0 top-full mt-1 z-40 max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl py-1 text-xs"
                  >
                    {originSuggestions.map((st) => (
                      <li
                        key={st.id}
                        onMouseDown={() => {
                          setRouteOriginId(st.id);
                          setOriginQuery(st.name);
                          setIsOriginFocused(false);
                          if (!routeDestinationId) destInputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-slate-200 hover:text-white"
                      >
                        <span>{st.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-1">
                <button
                  type="button"
                  onClick={handleSwap}
                  data-testid="route-swap-btn"
                  className="rounded-full border border-slate-700 bg-slate-800 p-1 text-slate-400 hover:border-emerald-500 hover:text-emerald-400 transition-colors shadow-sm"
                  title="Swap origin and destination"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Destination input */}
              <div className="relative">
                <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 focus-within:border-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-rose-400 mr-2 shrink-0" />
                  <input
                    ref={destInputRef}
                    type="text"
                    value={destQuery}
                    onChange={(e) => {
                      setDestQuery(e.target.value);
                      setRouteDestinationId(null);
                    }}
                    onFocus={() => {
                      setIsDestFocused(true);
                      setRouteFocusTarget("destination");
                    }}
                    onBlur={() => setTimeout(() => setIsDestFocused(false), 200)}
                    placeholder="Destination station"
                    data-testid="route-destination-input"
                    className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                </div>
                {/* Autocomplete dropdown for destination */}
                {isDestFocused && destSuggestions.length > 0 && !routeDestinationId && (
                  <ul
                    data-testid="dest-suggestions-list"
                    className="absolute left-0 right-0 top-full mt-1 z-40 max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl py-1 text-xs"
                  >
                    {destSuggestions.map((st) => (
                      <li
                        key={st.id}
                        onMouseDown={() => {
                          setRouteDestinationId(st.id);
                          setDestQuery(st.name);
                          setIsDestFocused(false);
                        }}
                        className="px-3 py-1.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-slate-200 hover:text-white"
                      >
                        <span>{st.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Same origin and destination */}
            {routeOriginId &&
              routeDestinationId &&
              routeOriginId === routeDestinationId && (
                <div
                  data-testid="route-same-station-notice"
                  className="rounded-lg border border-slate-800 bg-slate-800/40 p-3 text-center text-xs text-slate-400"
                >
                  Origin and destination are the same station.
                </div>
              )}

            {/* No route exists */}
            {routeOriginId &&
              routeDestinationId &&
              routeOriginId !== routeDestinationId &&
              !activeRoute && (
                <div
                  data-testid="no-route-notice"
                  className="rounded-lg border border-slate-800 bg-slate-800/40 p-4 text-center text-xs text-slate-400 space-y-1"
                >
                  <p className="font-medium text-slate-300">
                    No route exists between these stations.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    The operational network segments do not connect these two stations.
                  </p>
                </div>
              )}

            {/* Active Route Details */}
            {activeRoute && activeRoute.totalStops > 0 && (
              <div data-testid="route-results-container" className="space-y-3 pt-2">
                {/* Optimization objective label */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                  <span className="text-emerald-400 font-medium">Estimated fastest route</span>
                  <span className="text-slate-500">Minimises time, then transfers, then stops • Fares not included</span>
                </div>

                {/* Stat summary cards */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-slate-800 bg-slate-800/60 p-2">
                    <span className="text-[10px] text-slate-400 block">Est. Time</span>
                    <span className="text-sm font-semibold text-emerald-400">
                      {activeRoute.estimatedMinutes} min
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-800/60 p-2">
                    <span className="text-[10px] text-slate-400 block">Stops</span>
                    <span className="text-sm font-semibold text-white">
                      {activeRoute.totalStops}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-800/60 p-2">
                    <span className="text-[10px] text-slate-400 block">Transfers</span>
                    <span className="text-sm font-semibold text-cyan-400">
                      {activeRoute.totalTransfers}
                    </span>
                  </div>
                </div>

                {/* Itinerary step-by-step */}
                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Itinerary
                  </h3>

                  {activeRoute.legs.map((leg, idx) => {
                    const isExpanded = expandedLegs[idx] ?? false;
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-800 bg-slate-800/40 p-2.5 space-y-2"
                      >
                        {/* Leg Line Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: leg.lineColor }}
                            />
                            <span className="text-xs font-semibold text-white">
                              {leg.lineName}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {leg.stopCount} stops ({leg.distanceKm} km)
                          </span>
                        </div>

                        {/* From station */}
                        <div className="flex items-start gap-2 text-xs">
                          <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] text-slate-400 block">Board at</span>
                            <span className="font-medium text-slate-200">
                              {leg.fromStation.name}
                            </span>
                          </div>
                        </div>

                        {/* Intermediate stops toggle */}
                        {leg.intermediateStations.length > 0 && (
                          <div className="pl-5">
                            <button
                              type="button"
                              onClick={() => toggleLegExpanded(idx)}
                              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                            >
                              <span>
                                {isExpanded ? "Hide" : "Show"}{" "}
                                {leg.intermediateStations.length} intermediate stops
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                            {isExpanded && (
                              <ul className="mt-1 space-y-0.5 border-l border-slate-700 pl-2 text-[11px] text-slate-400">
                                {leg.intermediateStations.map((st) => (
                                  <li key={st.id}>{st.name}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {/* To station */}
                        <div className="flex items-start gap-2 text-xs">
                          <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] text-slate-400 block">
                              {idx === activeRoute.legs.length - 1
                                ? "Arrive at"
                                : "Alight at (Interchange)"}
                            </span>
                            <span className="font-medium text-slate-200">
                              {leg.toStation.name}
                            </span>
                          </div>
                        </div>

                        {/* Transfer notice if followed by a transfer */}
                        {idx < activeRoute.transfers.length && (
                          <div className="mt-2 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1.5 text-[11px] text-cyan-200 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                            <span>
                              Transfer to {activeRoute.transfers[idx].toLineName} (approx{" "}
                              {activeRoute.transfers[idx].estimatedMinutes} min walk)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Disclaimer */}
                <div
                  data-testid="route-disclaimer"
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-[11px] text-slate-400 flex items-start gap-2 leading-relaxed"
                >
                  <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>{activeRoute.disclaimer}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
