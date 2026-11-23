"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  AlertTriangle,
  Info,
  CheckCircle2,
  Building2,
  Train,
  Layers,
  Calendar,
  Percent,
  MapPin,
} from "lucide-react";
import {
  getCityCompareStats,
  getNationwideTotals,
  CityCompareStats,
} from "@/lib/compare-stats";
import { getDatasetMetadataSummary } from "@/lib/data";

type SortKey =
  | "cityName"
  | "tier"
  | "linesCount"
  | "operationalKm"
  | "constructionKm"
  | "plannedKm"
  | "totalKm"
  | "totalStations"
  | "interchangesCount"
  | "completionPercent"
  | "firstOpenedYear";

type SortDirection = "asc" | "desc";

export default function ComparePage() {
  const allStats = useMemo(() => getCityCompareStats(), []);
  const totals = useMemo(() => getNationwideTotals(), []);
  const metadataSummary = useMemo(() => getDatasetMetadataSummary(), []);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<"all" | "1" | "2">("all");
  const [sortKey, setSortKey] = useState<SortKey>("operationalKm");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedCityId, setExpandedCityId] = useState<string | null>(null);
  const [compareCityIds, setCompareCityIds] = useState<string[]>([]);
  const [showHeadToHead, setShowHeadToHead] = useState(false);
  const compareCities = compareCityIds.map((id) => allStats.find((city) => city.cityId === id)).filter((city): city is CityCompareStats => !!city);

  const toggleCompareCity = (cityId: string) => {
    if (compareCityIds.includes(cityId)) {
      setCompareCityIds(compareCityIds.filter((id) => id !== cityId));
      setShowHeadToHead(false);
    } else if (compareCityIds.length < 2) {
      const next = [...compareCityIds, cityId];
      setCompareCityIds(next);
      if (next.length === 2) setShowHeadToHead(true);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "cityName" ? "asc" : "desc");
    }
  };

  const filteredStats = useMemo(() => {
    return allStats.filter((c) => {
      if (selectedTier !== "all" && c.tier.toString() !== selectedTier) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return (
          c.cityName.toLowerCase().includes(query) ||
          c.cityId.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [allStats, selectedTier, searchQuery]);

  const sortedStats = useMemo(() => {
    return [...filteredStats].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === null && valB === null) return 0;
      if (valA === null) return sortDirection === "asc" ? 1 : -1;
      if (valB === null) return sortDirection === "asc" ? -1 : 1;

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      const numA = Number(valA);
      const numB = Number(valB);
      return sortDirection === "asc" ? numA - numB : numB - numA;
    });
  }, [filteredStats, sortKey, sortDirection]);

  const renderSortIndicator = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-3 w-3 text-slate-500 opacity-60" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-emerald-400" />
    );
  };

  return (
    <div
      data-testid="compare-page"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col"
    >
      {/* Top Header Bar */}
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            data-testid="nav-to-map"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700 hover:text-white"
            title="Return to Interactive Map"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Map</span>
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-sm font-bold text-emerald-400">
            IM
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-100 md:text-base">
              Metro Stats & City Comparison
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            data-testid="data-last-updated"
            className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300"
          >
            {metadataSummary.badgeLabel}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {compareCities.length === 2 && (
          <section className="sticky top-2 z-30 rounded-xl border border-emerald-500/30 bg-slate-950/95 shadow-xl backdrop-blur-md" data-testid="head-to-head-compare">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="text-xs text-slate-300"><span className="font-semibold text-emerald-300">2 cities selected</span><span className="hidden sm:inline"> · {compareCities.map((city) => city.cityName).join(" vs ")}</span></div>
              <button type="button" onClick={() => setShowHeadToHead((open) => !open)} aria-expanded={showHeadToHead} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">{showHeadToHead ? "Hide comparison" : "Compare Cities"}</button>
            </div>
            {showHeadToHead && (
              <div className="grid gap-4 border-t border-slate-800 px-4 py-4 sm:grid-cols-[minmax(120px,0.8fr)_1fr_1fr]" data-testid="head-to-head-card">
                <div className="hidden text-[11px] font-medium text-slate-500 sm:block">Network measures</div>
                {compareCities.map((city) => <h2 key={city.cityId} className="text-sm font-semibold text-white">{city.cityName}</h2>)}
                {(["Total Network Build", "Operational km", "Stations", "Interchanges", "Status Ratios"] as const).map((metric) => <React.Fragment key={metric}>
                  <div className="text-[11px] font-medium text-slate-400">{metric}</div>
                  {compareCities.map((city) => {
                    const total = city.totalKm || 0;
                    const ratios = [city.operationalKm, city.constructionKm, city.plannedKm].map((value) => total ? value / total * 100 : 0);
                    return <div key={`${city.cityId}-${metric}`} className="min-w-0 text-xs text-slate-200">
                      {metric === "Total Network Build" && <strong>{city.totalKm.toLocaleString()} km</strong>}
                      {metric === "Operational km" && <strong className="text-emerald-300">{city.operationalKm.toLocaleString()} km</strong>}
                      {metric === "Stations" && <><strong>{city.totalStations.toLocaleString()} total</strong><span className="mt-0.5 block text-[10px] text-slate-400">{city.operationalStations} open · {city.constructionStations} building · {city.plannedStations} planned</span></>}
                      {metric === "Interchanges" && <strong>{city.interchangesCount.toLocaleString()}</strong>}
                      {metric === "Status Ratios" && <><div className="flex h-2 overflow-hidden rounded-full bg-slate-800" aria-label={`${city.cityName} corridor status ratios`}>{ratios.map((ratio, index) => <span key={index} className={["bg-emerald-500", "bg-amber-500", "bg-sky-500"][index]} style={{ width: `${ratio}%` }} />)}</div><span className="mt-1 block text-[10px] text-slate-400">{ratios.map((ratio) => `${ratio.toFixed(1)}%`).join(" / ")}</span></>}
                    </div>;
                  })}
                </React.Fragment>)}
                <div className="hidden text-[10px] text-slate-500 sm:block">Operational / construction / planned</div>
                <div className="text-[10px] text-slate-500">Operational / construction / planned</div>
                <div className="text-[10px] text-slate-500">Operational / construction / planned</div>
              </div>
            )}
          </section>
        )}
        {/* Nationwide Summary Hero Cards */}
        <section
          data-testid="nationwide-summary"
          aria-label="Nationwide Summary Metrics"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Active Networks</span>
            </div>
            <div className="mt-1 text-xl font-bold text-white tracking-tight">
              {totals.citiesCount}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {totals.linesCount} total lines
            </p>
          </div>

          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              <span>Operational</span>
            </div>
            <div className="mt-1 text-xl font-bold text-emerald-300 tracking-tight">
              {totals.operationalKm.toLocaleString()} km
            </div>
            <p className="mt-0.5 text-[11px] text-emerald-500/80">
              {totals.operationalStations} stations open
            </p>
          </div>

          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              <span>Under Construction</span>
            </div>
            <div className="mt-1 text-xl font-bold text-amber-300 tracking-tight">
              {totals.constructionKm.toLocaleString()} km
            </div>
            <p className="mt-0.5 text-[11px] text-amber-500/80">
              {totals.constructionStations} stations active
            </p>
          </div>

          <div className="rounded-xl border border-sky-900/40 bg-sky-950/20 p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium text-sky-400">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
              <span>Planned Corridor</span>
            </div>
            <div className="mt-1 text-xl font-bold text-sky-300 tracking-tight">
              {totals.plannedKm.toLocaleString()} km
            </div>
            <p className="mt-0.5 text-[11px] text-sky-500/80">
              Sanctioned phases
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span>Interchanges</span>
            </div>
            <div className="mt-1 text-xl font-bold text-white tracking-tight">
              {totals.interchangesCount}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {totals.totalStations} total stops
            </p>
          </div>

          <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-400">
              <Percent className="h-3.5 w-3.5 text-indigo-400" />
              <span>Total Network Build</span>
            </div>
            <div className="mt-1 text-xl font-bold text-indigo-300 tracking-tight">
              {totals.totalKm.toLocaleString()} km
            </div>
            <p className="mt-0.5 text-[11px] text-indigo-400/80">
              {totals.completionPercent}% operational
            </p>
          </div>
        </section>

        {/* Filters and Controls */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              data-testid="search-cities-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city name..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Tier Selector Pills */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-xs mr-1 hidden sm:inline">
              Filter:
            </span>
            <button
              type="button"
              data-testid="tier-filter-all"
              onClick={() => setSelectedTier("all")}
              className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                selectedTier === "all"
                  ? "bg-slate-700 text-white"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              All Cities ({allStats.length})
            </button>
            <button
              type="button"
              data-testid="tier-filter-tier1"
              onClick={() => setSelectedTier("1")}
              className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                selectedTier === "1"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              Tier 1 (6)
            </button>
            <button
              type="button"
              data-testid="tier-filter-tier2"
              onClick={() => setSelectedTier("2")}
              className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                selectedTier === "2"
                  ? "bg-cyan-700 text-white"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              Tier 2 (15)
            </button>
          </div>
        </section>

        {/* Legend for Status Stack Bars */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 px-1 gap-2">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-300">Corridor Status:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-3.5 rounded-sm bg-emerald-500" />
              <span>Operational</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-3.5 rounded-sm bg-amber-500" />
              <span>Under Construction</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-3.5 rounded-sm bg-sky-500" />
              <span>Planned</span>
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            * All figures computed from verified geospatial vectors at build time.
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
          <table
            data-testid="compare-table"
            className="w-full border-collapse text-left text-xs"
          >
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-300">
                <th scope="col" className="w-10 px-2 py-3 text-center text-[10px] font-medium text-slate-500">H2H</th>
                <th
                  scope="col"
                  className="py-3 px-4 font-semibold cursor-pointer select-none hover:text-white"
                  onClick={() => handleSort("cityName")}
                  data-testid="sort-city"
                >
                  <div className="flex items-center gap-1.5">
                    <span>City</span>
                    {renderSortIndicator("cityName")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 font-semibold cursor-pointer select-none hover:text-white"
                  onClick={() => handleSort("tier")}
                  data-testid="sort-tier"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tier</span>
                    {renderSortIndicator("tier")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 font-semibold cursor-pointer select-none hover:text-white text-right"
                  onClick={() => handleSort("linesCount")}
                  data-testid="sort-lines"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Lines</span>
                    {renderSortIndicator("linesCount")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 font-semibold cursor-pointer select-none hover:text-white text-right"
                  onClick={() => handleSort("totalStations")}
                  data-testid="sort-stations"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Stations</span>
                    {renderSortIndicator("totalStations")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 font-semibold cursor-pointer select-none hover:text-white text-right"
                  onClick={() => handleSort("interchangesCount")}
                  data-testid="sort-interchanges"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Interchanges</span>
                    {renderSortIndicator("interchangesCount")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 font-semibold cursor-pointer select-none hover:text-white text-right"
                  onClick={() => handleSort("operationalKm")}
                  data-testid="sort-operational-km"
                >
                  <div className="flex items-center justify-end gap-1.5 text-emerald-400">
                    <span>Op km</span>
                    {renderSortIndicator("operationalKm")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 font-semibold cursor-pointer select-none hover:text-white text-right"
                  onClick={() => handleSort("constructionKm")}
                  data-testid="sort-construction-km"
                >
                  <div className="flex items-center justify-end gap-1.5 text-amber-400">
                    <span>Const km</span>
                    {renderSortIndicator("constructionKm")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 font-semibold cursor-pointer select-none hover:text-white text-right"
                  onClick={() => handleSort("totalKm")}
                  data-testid="sort-total-km"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total km</span>
                    {renderSortIndicator("totalKm")}
                  </div>
                </th>
                <th scope="col" className="py-3 px-4 font-semibold min-w-[130px]">
                  <span>Status Ratio</span>
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 font-semibold cursor-pointer select-none hover:text-white text-right"
                  onClick={() => handleSort("completionPercent")}
                  data-testid="sort-completion"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Done %</span>
                    {renderSortIndicator("completionPercent")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 font-semibold cursor-pointer select-none hover:text-white text-right"
                  onClick={() => handleSort("firstOpenedYear")}
                  data-testid="sort-year"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Opened</span>
                    {renderSortIndicator("firstOpenedYear")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedStats.map((c) => {
                const isExpanded = expandedCityId === c.cityId;
                const opRatio =
                  c.totalKm > 0 ? (c.operationalKm / c.totalKm) * 100 : 0;
                const constRatio =
                  c.totalKm > 0 ? (c.constructionKm / c.totalKm) * 100 : 0;
                const planRatio =
                  c.totalKm > 0 ? (c.plannedKm / c.totalKm) * 100 : 0;

                return (
                  <React.Fragment key={c.cityId}>
                    <tr
                      data-testid={`city-row-${c.cityId}`}
                      onClick={() =>
                        setExpandedCityId((prev) =>
                          prev === c.cityId ? null : c.cityId
                        )
                      }
                      className="group cursor-pointer transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-2 py-2.5 text-center" onClick={(event) => event.stopPropagation()}>
                        <input type="checkbox" checked={compareCityIds.includes(c.cityId)} disabled={!compareCityIds.includes(c.cityId) && compareCityIds.length === 2} onChange={() => toggleCompareCity(c.cityId)} aria-label={`Select ${c.cityName} for head-to-head comparison`} data-testid={`compare-select-city-${c.cityId}`} className="h-3.5 w-3.5 cursor-pointer accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-30" />
                      </td>
                      {/* City Name with link to city page, map link, and caveat icon */}
                      <td className="py-2.5 px-4 font-medium text-slate-100">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/city/${c.cityId}/`}
                            data-testid={`city-page-link-${c.cityId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-slate-100 hover:text-emerald-400 hover:underline"
                            title={`View ${c.cityName} Overview & Stats`}
                          >
                            {c.cityName}
                          </Link>
                          <Link
                            href={`/?city=${c.cityId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-500 hover:text-emerald-400"
                            title={`View ${c.cityName} on Map`}
                          >
                            <MapPin className="h-3 w-3" />
                          </Link>

                          {/* Data Quality / Length Mismatch Warning Flag (> 3%) */}
                          {c.hasLengthMismatch && (
                            <span
                              data-testid={`data-quality-flag-${c.cityId}`}
                              title={c.lengthMismatchNote ?? "Length variance > 3%"}
                              className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30"
                            >
                              <AlertTriangle className="mr-0.5 h-3 w-3 text-amber-400" />
                              {c.lengthVariancePercent}% Δ
                            </span>
                          )}

                          {/* Data Completeness Caveat Notice */}
                          {c.hasCompletenessCaveat && (
                            <span
                              data-testid={`completeness-caveat-${c.cityId}`}
                              title={c.completenessCaveatText ?? "Data incomplete"}
                              className="inline-flex items-center text-slate-400 hover:text-amber-300"
                            >
                              <Info className="h-3.5 w-3.5 text-amber-400/80" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tier Badge */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            c.tier === 1
                              ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                              : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                          }`}
                        >
                          T{c.tier}
                        </span>
                      </td>

                      {/* Lines Count */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {c.linesCount}
                      </td>

                      {/* Stations Total (with breakdown tooltip) */}
                      <td
                        className="py-2.5 px-3 text-right font-mono text-slate-300"
                        title={`${c.operationalStations} operational, ${c.constructionStations} under construction, ${c.plannedStations} planned`}
                      >
                        <span>{c.totalStations}</span>
                        {c.constructionStations > 0 && (
                          <span className="text-[10px] text-amber-400/80 ml-1">
                            (+{c.constructionStations})
                          </span>
                        )}
                      </td>

                      {/* Interchanges */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {c.interchangesCount > 0 ? (
                          <span className="text-emerald-300 font-semibold">
                            {c.interchangesCount}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Operational km */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400">
                        {c.operationalKm > 0 ? `${c.operationalKm}` : "0"}
                      </td>

                      {/* Construction km */}
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                        {c.constructionKm > 0 ? `${c.constructionKm}` : "—"}
                      </td>

                      {/* Total km */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-200">
                        {c.totalKm}
                      </td>

                      {/* Plain SVG/CSS Stacked Horizontal Ratio Bar */}
                      <td className="py-2.5 px-4">
                        <div
                          className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800"
                          title={`${c.operationalKm} km op (${Math.round(
                            opRatio
                          )}%), ${c.constructionKm} km const (${Math.round(
                            constRatio
                          )}%), ${c.plannedKm} km plan (${Math.round(
                            planRatio
                          )}%)`}
                        >
                          {opRatio > 0 && (
                            <div
                              style={{ width: `${opRatio}%` }}
                              className="bg-emerald-500"
                            />
                          )}
                          {constRatio > 0 && (
                            <div
                              style={{ width: `${constRatio}%` }}
                              className="bg-amber-500"
                            />
                          )}
                          {planRatio > 0 && (
                            <div
                              style={{ width: `${planRatio}%` }}
                              className="bg-sky-500"
                            />
                          )}
                        </div>
                      </td>

                      {/* Completion % */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {c.completionPercent}%
                      </td>

                      {/* First Opened Year */}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-400">
                        {c.firstOpenedYear ? (
                          <span className="text-slate-300">{c.firstOpenedYear}</span>
                        ) : (
                          <span className="text-slate-500 italic">None</span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Details Drawer on Row Click */}
                    {isExpanded && (
                      <tr className="bg-slate-900/80 border-b border-slate-800">
                        <td colSpan={12} className="py-3 px-6 text-xs">
                          <div className="flex flex-col gap-2">
                            {c.hasCompletenessCaveat && (
                              <div
                                role="status"
                                className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-200"
                              >
                                <span className="font-semibold text-amber-300 mr-1.5">
                                  ⚠️ Data Completeness Notice:
                                </span>
                                {c.completenessCaveatText}
                              </div>
                            )}

                            {c.hasLengthMismatch && (
                              <div className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-300">
                                <span className="font-semibold text-amber-400 mr-1.5">
                                  ℹ️ Length Audit Variance:
                                </span>
                                {c.lengthMismatchNote}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between text-slate-400 pt-1">
                              <div>
                                Station breakdown:{" "}
                                <strong className="text-slate-200">
                                  {c.operationalStations}
                                </strong>{" "}
                                operational,{" "}
                                <strong className="text-amber-300">
                                  {c.constructionStations}
                                </strong>{" "}
                                under construction,{" "}
                                <strong className="text-sky-300">
                                  {c.plannedStations}
                                </strong>{" "}
                                planned.
                              </div>
                              <div className="flex items-center gap-3">
                                <Link
                                  href={`/city/${c.cityId}/`}
                                  className="font-semibold text-emerald-400 hover:underline"
                                >
                                  {c.cityName} City Page →
                                </Link>
                                <span className="text-slate-600">|</span>
                                <Link
                                  href={`/?city=${c.cityId}`}
                                  className="text-slate-300 hover:text-white hover:underline"
                                >
                                  View on map →
                                </Link>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Nationwide Table Totals Row */}
            <tfoot>
              <tr className="border-t-2 border-slate-700 bg-slate-900/95 font-semibold text-slate-100">
                <td className="px-2 py-3" />
                <td className="py-3 px-4 font-bold">
                  Total ({allStats.length} Cities)
                </td>
                <td className="py-3 px-3 text-slate-400">—</td>
                <td className="py-3 px-3 text-right font-mono">
                  {totals.linesCount}
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  {totals.totalStations}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-400">
                  {totals.interchangesCount}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-400">
                  {totals.operationalKm.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right font-mono text-amber-400">
                  {totals.constructionKm.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-100">
                  {totals.totalKm.toLocaleString()}
                </td>
                <td className="py-3 px-4">
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      style={{
                        width: `${(totals.operationalKm / totals.totalKm) * 100}%`,
                      }}
                      className="bg-emerald-500"
                    />
                    <div
                      style={{
                        width: `${(totals.constructionKm / totals.totalKm) * 100}%`,
                      }}
                      className="bg-amber-500"
                    />
                    <div
                      style={{
                        width: `${(totals.plannedKm / totals.totalKm) * 100}%`,
                      }}
                      className="bg-sky-500"
                    />
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  {totals.completionPercent}%
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-300">
                  {totals.earliestOpenedYear}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </main>
    </div>
  );
}
