"use client";

import React, { useMemo, useEffect, useCallback, useRef } from "react";
import { useMetroStore } from "@/store/use-metro-store";
import { getMetroData } from "@/lib/data";
import {
  MIN_DATASET_YEAR,
  MAX_DATASET_YEAR,
  computeCumulativeOperationalKm,
  countUndatedOperationalRecords,
} from "@/lib/timeline-utils";
import {
  Play,
  Pause,
  RotateCcw,
  Calendar,
  Eye,
  EyeOff,
  MapPin,
  MapPinOff,
} from "lucide-react";

export function TimelineSlider() {
  const selectedYear = useMetroStore((state) => state.selectedYear);
  const isPlaying = useMetroStore((state) => state.isPlayingTimeline);
  const includeFuture = useMetroStore((state) => state.includeFuture);
  const setSelectedYear = useMetroStore((state) => state.setSelectedYear);
  const setIsPlaying = useMetroStore((state) => state.setIsPlayingTimeline);
  const setIncludeFuture = useMetroStore((state) => state.setIncludeFuture);
  const showStations = useMetroStore((state) => state.showStations);
  const toggleStations = useMetroStore((state) => state.toggleStations);

  const dataset = useMemo(() => getMetroData(), []);

  // Compute dataset-wide min and max opening years
  const { minYear, maxYear, kmPoints, undatedCounts } = useMemo(() => {
    const rawSegs = dataset.segments.features.map((f) => f.properties);
    const rawStns = dataset.stations.features.map((f) => f.properties);

    const undated = countUndatedOperationalRecords(rawSegs, rawStns);
    const points = computeCumulativeOperationalKm(
      rawSegs,
      MIN_DATASET_YEAR,
      MAX_DATASET_YEAR
    );

    return {
      minYear: MIN_DATASET_YEAR,
      maxYear: MAX_DATASET_YEAR,
      kmPoints: points,
      undatedCounts: undated,
    };
  }, [dataset]);

  const currentYear = selectedYear ?? maxYear;

  // Timer loop for Play / Pause scrubber
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    playTimerRef.current = setInterval(() => {
      const current = useMetroStore.getState().selectedYear;
      const next = (current ?? minYear) + 1;
      if (next > maxYear) {
        setIsPlaying(false);
        setSelectedYear(maxYear);
      } else {
        setSelectedYear(next);
      }
    }, 1200);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, minYear, maxYear, setSelectedYear, setIsPlaying]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>) => {
      const yr = parseInt((e.target as HTMLInputElement).value, 10);
      if (!Number.isNaN(yr)) {
        setSelectedYear(yr);
      }
    },
    [setSelectedYear]
  );

  const handleSliderKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const current = Number(e.currentTarget.value);
      if (!Number.isFinite(current)) return;

      let next: number | null = null;
      if (e.key === "Home") next = minYear;
      if (e.key === "End") next = maxYear;
      if (e.key === "ArrowLeft") next = Math.max(minYear, current - 1);
      if (e.key === "ArrowRight") next = Math.min(maxYear, current + 1);
      if (next !== null) {
        e.preventDefault();
        setSelectedYear(next);
      }
    },
    [maxYear, minYear, setSelectedYear]
  );

  const handleTogglePlay = useCallback(() => {
    // If at end or null (defaulted to maxYear), loop back to start
    const effectiveYear = selectedYear ?? maxYear;
    if (!isPlaying && effectiveYear >= maxYear) {
      setSelectedYear(minYear);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, selectedYear, maxYear, minYear, setSelectedYear, setIsPlaying]);

  const handleResetTimeline = useCallback(() => {
    setIsPlaying(false);
    setSelectedYear(null);
  }, [setIsPlaying, setSelectedYear]);

  // Current operational km for currentYear
  const currentKm = useMemo(() => {
    const pt = kmPoints.find((p) => p.year === currentYear);
    return pt ? pt.operationalKm : 0;
  }, [kmPoints, currentYear]);

  // SVG dimensions for the mini sparkline
  const maxKm = useMemo(
    () => Math.max(...kmPoints.map((p) => p.operationalKm), 1),
    [kmPoints]
  );

  const sparklineSvg = useMemo(() => {
    const width = 160;
    const height = 24;
    const padding = 2;

    const pointsStr = kmPoints
      .map((p, i) => {
        const x = padding + (i / (kmPoints.length - 1)) * (width - 2 * padding);
        const y =
          height -
          padding -
          (p.operationalKm / maxKm) * (height - 2 * padding);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    // Position of current scrubber dot on sparkline
    const curIndex = Math.max(0, currentYear - minYear);
    const curX =
      padding + (curIndex / (kmPoints.length - 1)) * (width - 2 * padding);
    const curY =
      height - padding - (currentKm / maxKm) * (height - 2 * padding);

    return { width, height, pointsStr, curX, curY };
  }, [kmPoints, maxKm, currentYear, minYear, currentKm]);

  const isFiltered = selectedYear !== null;

  return (
    <div
      data-testid="timeline-slider-container"
      role="region"
      aria-label="Network timeline scrubber"
      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-[94vw] max-w-lg rounded-xl border border-slate-800 bg-slate-900/95 p-2.5 text-slate-100 shadow-2xl backdrop-blur-md transition-all sm:bottom-4 sm:p-3 sm:max-w-xl"
    >
      <div className="flex flex-col gap-2">
        {/* Top row: Header, Year, Stats, Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="timeline-play-btn"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? "Pause timeline" : "Play timeline"}
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              data-testid="toggle-stations-btn"
              onClick={toggleStations}
              aria-pressed={showStations}
              aria-label={showStations ? "Hide stations" : "Show stations"}
              title={showStations ? "Hide stations" : "Show stations"}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium border transition-colors ${
                showStations
                  ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                  : "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {showStations ? (
                <MapPin className="h-3 w-3" />
              ) : (
                <MapPinOff className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">Stations</span>
            </button>

            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-emerald-400" />
                Year:
              </span>
              <span
                data-testid="timeline-current-year"
                className="text-base font-bold text-white tracking-tight font-mono"
              >
                {currentYear}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                ({currentKm} km open)
              </span>
            </div>
          </div>

          {/* Right actions: Include Future toggle, Reset */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="timeline-future-toggle"
              onClick={() => setIncludeFuture(!includeFuture)}
              aria-pressed={includeFuture}
              title={
                includeFuture
                  ? "Hide construction and planned lines"
                  : "Show construction and planned lines"
              }
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium border transition-colors ${
                includeFuture
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {includeFuture ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">Include Future</span>
            </button>

            {isFiltered && (
              <button
                type="button"
                data-testid="timeline-reset-btn"
                onClick={handleResetTimeline}
                title="Reset timeline (show all up to current year)"
                className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Middle row: Interactive Range Slider & Mini SVG Chart */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 font-mono">
            {minYear}
          </span>

          <div className="relative flex-1 flex flex-col justify-center">
            <input
              type="range"
              role="slider"
              data-testid="timeline-range-slider"
              min={minYear}
              max={maxYear}
              step={1}
              value={currentYear}
              onChange={handleSliderChange}
              onInput={handleSliderChange}
              onKeyDown={handleSliderKeyDown}
              aria-valuemin={minYear}
              aria-valuemax={maxYear}
              aria-valuenow={currentYear}
              aria-valuetext={`Year ${currentYear}, ${currentKm} km open`}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <span className="text-[10px] text-slate-500 font-mono">
            {maxYear}
          </span>

          {/* Mini Cumulative km sparkline (SVG) */}
          <div
            data-testid="timeline-sparkline-chart"
            className="hidden sm:flex items-center shrink-0 border border-slate-800 rounded px-1.5 py-0.5 bg-slate-950/60"
            title="Cumulative operational km over time"
          >
            <svg
              width={sparklineSvg.width}
              height={sparklineSvg.height}
              className="overflow-visible"
            >
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                points={sparklineSvg.pointsStr}
                opacity={0.7}
              />
              <circle
                cx={sparklineSvg.curX}
                cy={sparklineSvg.curY}
                r="3"
                fill="#34d399"
                stroke="#022c22"
                strokeWidth="1"
              />
            </svg>
          </div>
        </div>

        {/* Bottom row: Undated operational records indicator (if applicable) */}
        {isFiltered && undatedCounts.undatedOperationalStations > 0 && (
          <div
            data-testid="timeline-undated-indicator"
            className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-800/60"
          >
            <span>
              Network as of end of <strong className="text-slate-200">{currentYear}</strong>
            </span>
            <span className="text-amber-400/90 font-medium">
              {undatedCounts.undatedOperationalStations} stations undated
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
