# Codebase Cleanup Baseline Report

Recorded at: `2026-10-12T11:55:00+05:30`
Git branch: `chore/codebase-cleanup`
Base commit: `c2c1d88` (`fix(ci): handle basePath in static server and isolate dev server routing for e2e tests`)

---

## 1. Quality Gates Execution Log

### `npm run lint`
- **Exit code**: `0`
- **Output**:
  ```
  > indian-metro-tracker@0.1.0 lint
  > eslint .
  ```
  *(Zero ESLint warnings or errors)*

### `npm run typecheck`
- **Exit code**: `0`
- **Output**:
  ```
  > indian-metro-tracker@0.1.0 typecheck
  > tsc --noEmit
  ```
  *(Zero TypeScript diagnostics)*

### `npm test`
- **Exit code**: `0`
- **Output**:
  ```
  Test Files  29 passed (29)
       Tests  221 passed (221)
    Duration  29.84s
  ```
  *(All 29 test suites and 221 unit tests passed)*

### `npm run validate:data`
- **Exit code**: `0`
- **Output**:
  ```
  🔍 Validating Indian Metro Network Tracker datasets...

  ✅ Validation Successful!
     • Cities loaded: 11
     • Lines loaded: 45
     • Segments loaded: 67
     • Stations loaded: 709

  All schema and relational integrity checks passed.
  ```

### `npm run build`
- **Exit code**: `0`
- **Output**:
  ```
  ▲ Next.js 15.5.27
  Creating an optimized production build ...
  ✓ Compiled successfully in 19.0s
  Linting and checking validity of types ...
  Collecting page data ...
  Generating static pages (4/4)
  Finalizing page optimization ...
  Exporting (2/2)

  Route (app)                                 Size  First Load JS
  ┌ ○ /                                     119 kB         222 kB
  └ ○ /_not-found                            993 B         104 kB
  + First Load JS shared by all             103 kB
  ```

### `npm run audit:data`
- **Exit code**: `1` *(Expected strictly by design: audit exits non-zero locally when un-baselined warnings remain without errors)*
- **Output**:
  ```
  🔍 Running data audit...

  📊 Audit Summary:
    Gurugram: 1 lines, 2 segments, 11 stations — 0 errors, 3 warnings, 2 info
    Navi Mumbai: 1 lines, 1 segments, 11 stations — 0 errors, 0 warnings, 1 info
    Chennai: 5 lines, 5 segments, 41 stations — 0 errors, 4 warnings, 1 info
    Pune: 3 lines, 3 segments, 29 stations — 0 errors, 14 warnings, 3 info
    Bengaluru: 5 lines, 6 segments, 87 stations — 0 errors, 92 warnings, 2 info
    Mumbai: 7 lines, 16 segments, 113 stations — 0 errors, 229 warnings, 2 info
    Kolkata: 5 lines, 8 segments, 57 stations — 0 errors, 51 warnings, 1 info
    Delhi: 10 lines, 16 segments, 228 stations — 0 errors, 284 warnings, 1 info
    Hyderabad: 3 lines, 4 segments, 57 stations — 0 errors, 6 warnings, 1 info
    Ahmedabad: 4 lines, 4 segments, 54 stations — 0 errors, 55 warnings, 1 info
    Noida: 1 lines, 2 segments, 21 stations — 0 errors, 5 warnings, 1 info

  🔴 Errors: 0
  🟡 Warnings: 743
  🔵 Info: 16

  ❌ 0 errors and 290 un-baselined warnings remain.
  ```

---

## 2. Code Duplication Metric (`npx jscpd components lib hooks scripts --threshold 2`)

- **Exit code**: `0`
- **Clones Found**: `7 clones`
- **Duplication Percentage**: `0.69%` (66 duplicated lines across 9,609 total analyzed lines)
- **Breakdown**:
  - `javascript`: 3 files, 895 lines, 0 clones (0.00%)
  - `tsx`: 18 files, 2,143 lines, 2 clones (0.65% lines, 1.08% tokens)
  - `typescript`: 27 files, 6,571 lines, 5 clones (0.79% lines, 0.91% tokens)
  - `Total`: 48 files, 9,609 lines, 7 clones (0.69% lines, 0.86% tokens)

### Baseline Detected Clones:
1. `components/filters/network-stats.tsx` (lines 8-13) & `components/map/empty-state.tsx` (lines 9-14) — [6 lines, 60 tokens] (Filter criteria construction)
2. `components/legend/map-legend.tsx` (lines 169-176 & 180-187) — [8 lines, 55 tokens] (Station marker inline styling)
3. `lib/data.ts` (lines 135-146 & 159-170) — [12 lines, 88 tokens] (Filtering loops in `getSegments` / `getStations`)
4. `lib/geo.ts` (lines 20-31) & `scripts/audit/dedupe-report.ts` (lines 20-27) — [12 lines, 54 tokens] (Haversine distance formula)
5. `scripts/audit/audit-engine.ts` (lines 845-853 & 900-908) — [9 lines, 55 tokens] (Opening date audit check logic)
6. `scripts/audit/audit-engine.ts` (lines 1135-1145 & 1200-1209) — [11 lines, 81 tokens] (Reference validation iteration)
7. `scripts/pipeline/build-real-data.ts` (lines 147-154) & `scripts/pipeline/fetch-overpass.ts` (lines 125-132) — [8 lines, 61 tokens] (Direct CLI arguments parsing)
