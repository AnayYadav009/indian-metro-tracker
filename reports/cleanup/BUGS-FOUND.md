# Bugs Identified During Stage 1 Analysis

> **Protocol Notice**: As mandated by project constraints, identified bugs are **not** fixed in the cleanup refactor. They are logged below with precise file, line numbers, description, impact analysis, and recommended fixes for subsequent review.

---

### BUG-01: Station Deduplication Geometry Clone Uses Stale Pre-Refactored Structure
- **File**: `scripts/audit/dedupe-report.ts`
- **Line(s)**: Lines 14–25 & 100–115
- **Description**: `dedupe-report.ts` duplicates its own incomplete Haversine calculation instead of importing `haversineDistanceM` from `lib/geo.ts`. More critically, it attempts to load raw node objects using outdated schema assumptions, causing discrepancies when comparing deduplication cluster projections against the active pipeline in `scripts/pipeline/merge-overrides.ts`.
- **Suggested Fix**: Replace the internal `haversineDistanceM` in `scripts/audit/dedupe-report.ts` with the canonical implementation from `lib/geo.ts`. Update node extraction to reuse `scripts/pipeline/normalize.ts`'s `NormalizedStation` definition.

---

### BUG-02: `useUrlSync` Hardcodes Year Lower Bound (1984) Instead of Canonical Constant
- **File**: `hooks/use-url-sync.ts`
- **Line(s)**: Line 88
- **Description**: `hooks/use-url-sync.ts` validates URL year parameter with `if (!Number.isNaN(yr) && yr >= 1984)` instead of referencing `MIN_DATASET_YEAR` defined in `lib/timeline-utils.ts`. If the dataset incorporates historical systems or the lower bound shifts, URL parameter hydration will silently discard valid years.
- **Suggested Fix**: Import `MIN_DATASET_YEAR` from `@/lib/timeline-utils` and update line 88 to `yr >= MIN_DATASET_YEAR`.

---

### BUG-03: `scripts/audit/generate-triage-report.ts` Unhandled Missing Temporary File
- **File**: `scripts/audit/generate-triage-report.ts`
- **Line(s)**: Line 8
- **Description**: `generate-triage-report.ts` unconditionally performs `fs.readFileSync("reports/data-audit/triage-temp-rows.json", "utf-8")`. Because `triage-temp-rows.json` was a one-time ephemeral debug file from October 2026, running this script now throws an unhandled `ENOENT: no such file or directory` exception immediately on invocation.
- **Suggested Fix**: The file is orphaned and no longer referenced by any `package.json` script or workflow. It should either be retired or guarded with an existence check that logs a clean warning if the input triage file is absent.
