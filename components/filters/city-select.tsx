"use client";

import React from "react";
import { useMetroStore } from "@/store/use-metro-store";
import { getCities } from "@/lib/data";

export function CitySelect() {
  const selectedCityId = useMetroStore((state) => state.selectedCityId);
  const setSelectedCity = useMetroStore((state) => state.setSelectedCity);
  const cities = getCities();

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        City
      </label>
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
        <button
          type="button"
          data-testid="city-select-all"
          onClick={() => setSelectedCity(null)}
          aria-pressed={selectedCityId === null}
          aria-label="Filter network to all cities"
          className={`flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            selectedCityId === null
              ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/40"
              : "bg-slate-800/80 text-slate-300 hover:bg-slate-750 hover:text-white"
          }`}
        >
          All Cities
        </button>

        {cities.map((city) => {
          const isActive = selectedCityId === city.id;
          return (
            <button
              key={city.id}
              type="button"
              data-testid={`city-select-${city.id}`}
              onClick={() => setSelectedCity(city.id)}
              aria-pressed={isActive}
              aria-label={`Filter network to ${city.name}`}
              className={`flex items-center justify-between gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/40"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-750 hover:text-white"
              }`}
            >
              <span>{city.name}</span>
              <span
                className={`rounded px-1 text-[10px] uppercase font-mono ${
                  isActive
                    ? "bg-emerald-700/60 text-emerald-100"
                    : "bg-slate-900/60 text-slate-400"
                }`}
              >
                {city.operator}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
