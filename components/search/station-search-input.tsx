"use client";

import React, { useState, useId, useMemo, useRef, useEffect } from "react";
import { Search, MapPin, X } from "lucide-react";
import { useMetroStore } from "@/store/use-metro-store";
import { getMetroData } from "@/lib/data";
import { searchStations, type StationSearchResult } from "@/lib/station-search";

interface StationSearchInputProps {
  onSelectStation?: (result: StationSearchResult) => void;
  className?: string;
  placeholder?: string;
}

export function StationSearchInput({
  onSelectStation,
  className = "",
  placeholder = "Search stations...",
}: StationSearchInputProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selectedCityId = useMetroStore((state) => state.selectedCityId);
  const setSelectedFeature = useMetroStore((state) => state.setSelectedFeature);

  const dataset = useMemo(() => getMetroData(), []);
  const stationsList = useMemo(() => dataset.stations.features, [dataset]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchStations(query, stationsList, {
      activeCityId: selectedCityId,
      limit: 8,
    });
  }, [query, stationsList, selectedCityId]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  function handleSelect(result: StationSearchResult) {
    setSelectedFeature({
      type: "station",
      data: result.station,
    });
    setQuery("");
    setIsOpen(false);
    if (onSelectStation) {
      onSelectStation(result);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) {
      if (e.key === "ArrowDown" && results.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < results.length) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className={`relative ${className}`} data-testid="station-search-container">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          data-testid="station-search-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onBlur={() => {
            // Slight delay so clicks on results list register
            setTimeout(() => setIsOpen(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-expanded={isOpen && results.length > 0}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `stn-opt-${results[activeIndex]?.station.station_id}` : undefined
          }
          className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-9 pr-8 text-xs text-slate-100 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear station search"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-2 flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          data-testid="station-search-results"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/95 p-1 shadow-2xl backdrop-blur-md"
        >
          {results.map((res, idx) => {
            const isActive = idx === activeIndex;
            return (
              <li
                key={res.station.station_id}
                id={`stn-opt-${res.station.station_id}`}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(res);
                }}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                  isActive ? "bg-emerald-500/20 text-emerald-200" : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div className="truncate font-medium">{res.station.name}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-slate-400">
                  <span>{res.station.city}</span>
                  {res.station.is_interchange && (
                    <span className="rounded bg-sky-500/20 px-1 py-0.5 text-[9px] font-semibold text-sky-300">
                      Interchange
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
