"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { getCities } from "@/lib/data";
import { searchAndOrderCities } from "@/lib/city-order";
import { useMetroStore } from "@/store/use-metro-store";

export function CitySelect() {
  const selectedCityId = useMetroStore((state) => state.selectedCityId);
  const setSelectedCity = useMetroStore((state) => state.setSelectedCity);
  const cities = useMemo(() => getCities(), []);
  const selectedCity = cities.find((city) => city.id === selectedCityId);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const options = useMemo(
    () => searchAndOrderCities(cities, query, selectedCityId),
    [cities, query, selectedCityId]
  );
  const includesAll = !query.trim();
  const optionCount = options.length + Number(includesAll);
  const activeOptionId =
    includesAll && activeIndex === 0
      ? "all"
      : options[activeIndex - Number(includesAll)]?.id;

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  const chooseCity = (cityId: string | null) => {
    setSelectedCity(cityId);
    setQuery("");
    setActiveIndex(0);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "ArrowDown" && optionCount) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % optionCount);
    } else if (event.key === "ArrowUp" && optionCount) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + optionCount) % optionCount);
    } else if (event.key === "Enter" && optionCount) {
      event.preventDefault();
      chooseCity(
        includesAll && activeIndex === 0
          ? null
          : options[activeIndex - Number(includesAll)]?.id ?? null
      );
    }
  };

  return (
    <div
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        data-testid="city-picker-trigger"
        aria-label={`Select city. Current: ${selectedCity?.name ?? "All Cities"}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="city-picker-options"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex h-9 max-w-36 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 text-xs font-medium text-slate-100 transition-colors hover:border-emerald-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:max-w-44"
      >
        <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        <span className="truncate">{selectedCity?.name ?? "All Cities"}</span>
        <ChevronDown aria-hidden="true" className="h-3 w-3 shrink-0 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+.5rem)] z-50 w-64 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl sm:w-72">
          <label htmlFor="city-picker-search" className="sr-only">
            Search cities
          </label>
          <input
            ref={searchRef}
            id="city-picker-search"
            type="search"
            role="combobox"
            aria-label="Search cities"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="city-picker-options"
            aria-activedescendant={activeOptionId ? `city-option-${activeOptionId}` : undefined}
            data-testid="city-picker-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search 21 cities"
            className="mb-2 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <div
            id="city-picker-options"
            role="listbox"
            aria-label="Metro cities"
            className="max-h-64 overflow-y-auto overscroll-contain"
          >
            {includesAll && (
              <button
                type="button"
                role="option"
                id="city-option-all"
                data-testid="city-select-all"
                aria-selected={selectedCityId === null}
                onMouseEnter={() => setActiveIndex(0)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseCity(null)}
                className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm ${
                  selectedCityId === null
                    ? "bg-emerald-500/15 text-emerald-200"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span>All Cities</span>
                {selectedCityId === null && <Check aria-hidden="true" className="h-4 w-4" />}
              </button>
            )}
            {options.map((city, index) => (
              <button
                key={city.id}
                type="button"
                role="option"
                id={`city-option-${city.id}`}
                data-testid={`city-select-${city.id}`}
                aria-selected={selectedCityId === city.id}
                onMouseEnter={() => setActiveIndex(index + Number(includesAll))}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseCity(city.id)}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm ${
                  selectedCityId === city.id
                    ? "bg-emerald-500/15 text-emerald-200"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span className="truncate">{city.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                  {city.operator}
                  {selectedCityId === city.id && <Check aria-hidden="true" className="h-4 w-4" />}
                </span>
              </button>
            ))}
            {!options.length && (
              <p role="status" className="px-3 py-4 text-center text-sm text-slate-400">
                No cities match “{query}”.
              </p>
            )}
          </div>
          <p className="mt-2 border-t border-slate-800 px-2 pt-2 text-[11px] text-slate-500">
            Tier 1 networks first, then other cities alphabetically
          </p>
        </div>
      )}
    </div>
  );
}
