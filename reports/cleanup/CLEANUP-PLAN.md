# Comprehensive Codebase Cleanup Plan (Stage 1 Analysis)

Branch: `chore/codebase-cleanup`  
Baseline Date: `2026-10-12`  
Project Constraints: Zero functional or visual changes, pure Next.js static export, zero edits to active `data/` datasets or `data/audit-baseline.json`.

---

## Executive Summary & Findings Analysis

The Indian Metro Network Tracker codebase is structurally robust and high-performing, with 100% of linting, typechecking, data validation, and unit tests passing. However, multi-phase rapid feature additions (milestones M8 through M13, Tier 1 audit engine, interchange clustering, and timeline animation) have accumulated identifiable technical debt across 9 distinct categories:

1. **Dead Code & Unreferenced Assets**: Legacy re-export barriers (`lib/config.ts`), obsolete one-off triage and audit verification scripts (`generate-triage-report.ts`, `tier1-audit.mjs`), redundant schema types already handled by Zod inference.
2. **Duplicated Logic**: Identical filter parameter extraction across `EmptyFilterState` and `NetworkStats`, duplicated Haversine spatial calculations between `scripts/` and `lib/geo.ts`, copy-pasted CLI argument parsers.
3. **Hardcoded Magic Values**: Ad-hoc color hex fallbacks (`#94a3b8`), hardcoded year bounds (`1984`), and inline MapLibre styling rules that bypass central config files (`lib/station-style.ts`, `lib/map-config.ts`, `lib/timeline-utils.ts`).
4. **Oversized Files (>250 Lines)**: Five critical files (`audit-engine.ts`, `merge-overrides.ts`, `map-canvas.tsx`, `timeline-slider.tsx`, `data-validator.ts`) exceed the 250-line guideline and combine UI rendering, state synchronization, and complex mathematical or schema validations.
5. **Type Safety & Type Drift**: 10 instances of `as any` (primarily in MapLibre expression styling and testing mocks), loose `any` signatures in normalization scripts, and schema drift where Zod models and convenience interfaces duplicated definitions.
6. **State & Hook Subscriptions**: Selective Zustand selector optimization opportunities in `MapCanvas` and `TimelineSlider` to prevent unnecessary re-renders on unrelated filter changes.
7. **Housekeeping & Residue**: Residual `.gitkeep` markers in populated directories (`components/filters`, `components/map`, `components/panels`, `components/ui`, `data`, `scripts`, `store`, `types`).
8. **Test Health & Cohesion**: Test mocks in `url-sync-hardening.test.ts` using `as any` rather than typed fixtures.
9. **Documentation Drift**: Stale statements in `docs/` describing legacy v1 roadmap items or referencing non-existent files.

---

## Detailed Findings Table

| ID | Category | Target File(s) | Finding / Problem | Proposed Change | Risk | Effort |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DC-01** | Dead Code | `lib/config.ts` | Barrel file re-exporting `site-config`, `map-config`, `metro-styles`. Knip and ripgrep confirm zero consumers in the entire codebase (all files import directly). | Delete `lib/config.ts`. | Low | Minimal |
| **DC-02** | Dead Code | `scripts/audit/generate-triage-report.ts` | One-off historical triage script for 2026-10-07 audit findings. Requires absent temp files and is never invoked in `package.json` or CI. | Remove file or mark internal archive. | Low | Minimal |
| **DC-03** | Dead Code | `scripts/audit/tier1-audit.mjs` | 779-line legacy script used during early Tier 1 verification. Replaced by `audit-engine.ts` and `consistency-report.ts`. | Delete legacy script. | Low | Minimal |
| **DC-04** | Dead Code | `types/metro.ts` | Redundant type alias re-exports (`Status`, `Layout`, `BoundingBox`, etc.) that merely re-alias identical exports from `types/schema.ts`. | Consolidate barrel re-exports cleanly and keep only augmented composite interfaces (`MetroDataset`, etc.). | Low | Low |
| **DC-05** | Dead Code | Multiple populated directories | Residual `.gitkeep` files in `components/filters`, `components/map`, `components/panels`, `components/ui`, `data`, `scripts`, `store`, `types`. | Delete obsolete `.gitkeep` files in populated directories. | Low | Minimal |
| **DUP-01** | Duplication | `components/filters/network-stats.tsx`, `components/map/empty-state.tsx` | Identical criteria construction block creating `FilterCriteria` with `activeCity`, `selectedStatuses`, `selectedPhases`, `searchQuery`, and `lineAliases`. (Flagged by `jscpd`). | Extract a shared hook/helper `useActiveFilterCriteria()` in `hooks/use-active-filter-criteria.ts` or `lib/filter-utils.ts`. | Low | Low |
| **DUP-02** | Duplication | `scripts/audit/dedupe-report.ts`, `lib/geo.ts` | `dedupe-report.ts` re-implements Haversine distance formula with local trigonometry rather than importing `haversineDistanceM` from `lib/geo.ts`. (Flagged by `jscpd`). | Replace duplicated formula in `dedupe-report.ts` with canonical `haversineDistanceM` from `lib/geo.ts`. | Low | Minimal |
| **DUP-03** | Duplication | `components/legend/map-legend.tsx` | Duplicate inline station marker styling blocks (radius, border, stroke) across Construction and Planned markers. (Flagged by `jscpd`). | Create a small helper or sub-component `LegendMarkerSample` reusing `STATION_STYLE`. | Low | Minimal |
| **DUP-04** | Duplication | `lib/data.ts` | `getSegments` and `getStations` duplicate identical city, status, and phase property matching clauses. (Flagged by `jscpd`). | Reuse common filter predicates from `lib/filter-utils.ts`. | Low | Low |
| **VAL-01** | Hardcoded | `hooks/use-url-sync.ts` (L88) | Hardcoded year threshold `yr >= 1984` during URL param hydration instead of `MIN_DATASET_YEAR`. | Replace with `MIN_DATASET_YEAR` from `@/lib/timeline-utils`. | Low | Minimal |
| **VAL-02** | Hardcoded | `components/panels/station-detail.tsx` (L31) | Fallback color `#94a3b8` hardcoded in `connectedLines` mapping instead of central slate token. | Reference central style constant from `lib/metro-styles.ts`. | Low | Minimal |
| **TYP-01** | Type Safety | `components/map/map-layers.ts` | 5 casts to `as any` on `paint` properties (`line-width`, `circle-stroke-color`). | Use proper MapLibre GL expression types or `ExpressionSpecification` from `maplibre-gl` to eliminate `as any`. | Low | Low |
| **TYP-02** | Type Safety | `scripts/pipeline/normalize.ts` | Functions accept `rawData: any` and `elements: any[]`, `pt: any`. | Define Overpass JSON types (`OverpassResponse`, `OverpassElement`) to ensure strict pipeline typing. | Low | Low |
| **TYP-03** | Type Safety | `__tests__/url-sync-hardening.test.ts` | Test casts invalid segment/station props with `as any`. | Use partial fixture helper `createMockSegmentProps()` / `createMockStationProps()`. | Low | Low |
| **STA-01** | State & Hooks | `components/map/map-canvas.tsx` | `MapCanvas` subscribes to 10 separate store slices with individual calls; could optimize callbacks and filter calculations. | Ensure stable memoization for layer filter builders; keep fine-grained atomic selectors. | Med | Low |
| **SPL-01** | File Split | `components/map/map-canvas.tsx` (354 lines) | Combines MapLibre canvas lifecycle, layer filtering memoization, hover event handling, cursor state, and attribution. | Split map event handlers (`useMapInteractions`) and layer filters (`useMapLayerFilters`) into modular hooks under `components/map/hooks/`. | Med | Med |
| **SPL-02** | File Split | `components/timeline/timeline-slider.tsx` (349 lines) | Combines play/pause interval timer, keyboard accessibility shortcuts, SVG sparkline rendering, and UI controls. | Extract the SVG sparkline to `components/timeline/timeline-sparkline.tsx` and keyboard/timer controls to `use-timeline-controller.ts`. | Med | Med |
| **DOC-01** | Docs Drift | `README.md`, `docs/BLUEPRINT.md` | Minor references to outdated roadmap plans (e.g. Postgres v2, legacy Leaflet comparison). | Clarify that the app has finalized its pure static export Next.js architecture with zero Node runtime endpoints. | Low | Minimal |

---

## Execution Phasing (Ordered Batches)

### Batch 1: Safest — Unused Code, Dead Files & Housekeeping
- **Goals**: Remove completely dead files (`lib/config.ts`, `scripts/audit/generate-triage-report.ts`, `scripts/audit/tier1-audit.mjs`), purge residual `.gitkeep` files in populated directories, and clean unused re-exports.
- **Risk**: Very Low.
- **Verification**: `npm run lint && npm run typecheck && npm test && npm run validate:data && npm run build`.

### Batch 2: Constants Centralization & Hardcoded Values
- **Goals**: Eliminate magic values. Replace hardcoded `1984` in `use-url-sync.ts` with `MIN_DATASET_YEAR`. Centralize fallback hex codes in `station-detail.tsx` to `lib/metro-styles.ts`.
- **Risk**: Very Low.
- **Verification**: Quality gates + verify URL deep-linking test suite (`npm test -- __tests__/url-sync-hardening.test.ts`).

### Batch 3: Duplication Elimination (jscpd Reduction)
- **Goals**: Consolidate filter criteria extraction between `network-stats.tsx` and `empty-state.tsx`. Replace duplicated Haversine distance formula in `scripts/audit/dedupe-report.ts` with `lib/geo.ts`. Deduplicate station legend markers in `map-legend.tsx`.
- **Risk**: Low.
- **Verification**: Quality gates + re-run `npx jscpd components lib hooks scripts --threshold 2` to verify drop in duplication percentage.

### Batch 4: Type Safety & Strict Typing
- **Goals**: Replace `as any` in `map-layers.ts` with strongly typed MapLibre expression types. Introduce proper Overpass API element interfaces in `scripts/pipeline/normalize.ts`.
- **Risk**: Low.
- **Verification**: Quality gates + full typecheck (`npm run typecheck`).

### Batch 5: Modularization & Component File Splits (>250 Lines)
- **Goals**:
  - Extract SVG sparkline from `components/timeline/timeline-slider.tsx` into `components/timeline/timeline-sparkline.tsx` to bring `timeline-slider.tsx` below 250 lines.
  - Modularize `components/map/map-canvas.tsx` by moving MapLibre event handler wiring into a dedicated `useMapCanvasEvents` hook under `components/map/hooks/`.
- **Risk**: Medium (touches UI rendering and map lifecycle).
- **Verification**:
  - Full quality gates (`lint`, `typecheck`, `test`, `validate:data`, `build`).
  - Full E2E test runs (`npm run test:e2e`).
  - Capture visual before/after screenshots of Delhi and Mumbai networks under `reports/cleanup/screenshots/`.

---

## Next Steps

As per protocol, Stage 1 analysis is complete. Execution will **only** proceed upon your explicit approval of the plan and designated batches.
