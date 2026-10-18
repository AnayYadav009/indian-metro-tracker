# Cleanup Inventory & Action Manifest

**Date:** 2026-10-18  
**Branch:** `chore/repo-cleanup` (cut from `master` at `8d920e8`)  
**Status:** Read-only inventory (Phase 1). No deletions have been executed.

---

## 1. Executive Summary & Inventory Matrix

| Bucket | Category / Description | Count | Size (MB) | Proposed Action |
|---|---|---:|---:|---|
| **Bucket A** | Untracked build output & test artifacts (`.next/`, `out/`, `playwright-report/`, `test-results/`) | 229 files | 371.26 MB | **Delete via FS / clean up** |
| **Bucket A** | Untracked scratch & debug directory (`scratch/`) | 12 files | 1.70 MB | **Delete via FS** |
| **Bucket A** | Untracked generated debug geojson (`reports/data-audit/2026-10-10-map-issues-debug.geojson`) | 1 file | 0.48 MB | **Delete via FS** |
| **Bucket B** | Dead Code / Dead Files (`scripts/verify-routing.ts`) | 1 file | 0.03 MB | **NEEDS-OWNER** (contains 945 lines of verified routing test algorithms) |
| **Bucket B** | Unused Dependencies (`eslint-config-next`) | 1 dep | — | **KEEP** (imported via FlatCompat in `eslint.config.mjs`) |
| **Bucket B** | Missing Dependency (`postcss-load-config`) | 1 dep | — | **NEEDS-OWNER** (flagged by Knip for `postcss.config.mjs`, but build passes) |
| **Bucket B** | Stale Merged Local Branches | 44 branches | — | **Propose delete `git branch -d`** (upon approval) |
| **Bucket B** | Stale Merged Remote Branches (`origin/*`) | 8 branches | — | **Propose delete `git push origin --delete`** (upon approval) |
| **Bucket B** | Stale Audit Baseline Entries | 14 entries | — | **NEEDS-OWNER** (Do NOT edit baseline without owner decision) |
| **Bucket C** | Superseded Intermediate Audit Reports (Oct 10 tasks D–H, Oct 15 phase 2–7) | 20 files | 0.07 MB | **Consolidate & Delete originals** |
| **Bucket C** | Historical Daily Audit Logs (2026-10-07 through 2026-10-17 `.json`/`.md`) | 18 files | 2.31 MB | **Consolidate & Delete originals** |
| **Bucket C** | Older Iterative Progress Reports (`2026-10-15-error-fix*.md`, `2026-10-15-raw-refresh-diff.md`) | 7 files | 0.11 MB | **Consolidate & Delete originals** |
| **Bucket C** | Iterative Delhi Pink Phase 4 data drafts (v1 through v4; keep v5) | 4 files | 0.06 MB | **Delete (superseded by v5)** |
| **Bucket C** | Outdated Milestone Audits (`2026-10-15`, `2026-10-16` audits superseded by `2026-10-18`) | 2 files | 0.05 MB | **Consolidate & Delete originals** |
| **Bucket C** | Old Task 0 Cleanup Inventory Artifacts (`reports/cleanup/inventory.md`, etc. from Oct 10) | 5 files | 0.03 MB | **Delete / replace with current cleanup report** |
| **Bucket D** | Active Core Datasets & Overrides (`data/overrides/*`, `data/reference/*`, etc.) | 55 files | 2.92 MB | **KEEP** (Pipeline & validator inputs) |
| **Bucket D** | Raw OSM Overpass Cache (`data/raw/*.json` including 31.7MB Surat cache) | 21 files | 38.44 MB | **KEEP** (Resilience cache preventing Overpass rate limits) |
| **Bucket D** | Visual QA Screenshots in `reports/data-audit/*.png` | 14 files | 2.36 MB | **KEEP** (Official M15 & Tier 1 Visual QA compliance evidence) |
| **Bucket D** | Key Milestone Reference Documents (`reports/progress/2026-10-18-milestone-audit.md`, M13–M18 docs) | 14 files | 0.13 MB | **KEEP** |
| **Bucket D** | Permanent Documentation (`docs/*`, `README.md`, `LICENSE`, etc.) | 16 files | 0.12 MB | **KEEP** |

---

## 2. Detailed Breakdown by Bucket

### Bucket A: Untracked / Ignored Build and Tool Output (Safe to Delete)
These files are generated build outputs, caches, and test artifacts. Deleting them reclaims ~373.4 MB with zero impact on code or data.
1. `.next/` (144 files, 366.09 MB) — Next.js build and dev cache.
2. `out/` (81 files, 4.65 MB) — Next.js static export bundle (reproducible via `npm run build`).
3. `playwright-report/` (2 files, 0.51 MB) — HTML report from local Playwright runs.
4. `test-results/` (2 files, 0.01 MB) — Test artifacts from failing/retried tests.
5. `scratch/` (12 files, 1.70 MB) — Temporary debug scripts and one-off raw JSON files (`tmp-bengaluru-raw.json`, `tmp-mumbai-raw.json`).
6. `reports/data-audit/2026-10-10-map-issues-debug.geojson` (1 file, 0.48 MB) — Ignored debug geojson output.
7. `tsconfig.tsbuildinfo` (1 file, 0.16 MB) — Incremental TypeScript build cache (ignored).

*.gitignore Coverage Proposal:*
Add explicit rules to `.gitignore` to guarantee these never get staged:
```gitignore
# Temporary scratch and debug scripts
/scratch/
/reports/data-audit/*-debug.geojson
*.tsbuildinfo
test-results/
playwright-report/
```
*(All of these except `test-results/` and `playwright-report/` are already covered; we will ensure exact patterns are clean).*

---

### Bucket B: Likely Redundant / Needing Evidence

#### 1. Dead Code / Dead Files: `scripts/verify-routing.ts`
- **Path:** `scripts/verify-routing.ts` (35,594 bytes, 945 lines).
- **Evidence:** Knip reported this file as unused. Grep shows zero imports in `app/`, `components/`, or `lib/`. However, it contains the transit routing verification engine and CLI runner written during M18, and is referenced by `lib/routing/city-guard.ts` documentation and `reports/routing/2026-10-17-routing-verification.md`.
- **Recommendation:** **NEEDS-OWNER**. Do not delete without owner confirmation; alternatively, add `"verify:routing": "tsx scripts/verify-routing.ts"` to `package.json` scripts if it is intended to be a permanent verification tool.

#### 2. Dependencies
- **`eslint-config-next`:** Knip flags it as unused in `package.json:51`.
  - **Evidence:** In `eslint.config.mjs`, line 13 calls `...compat.extends("next/core-web-vitals")`. FlatCompat internally resolves `eslint-config-next`. Removing this devDependency breaks ESLint flat config resolution.
  - **Recommendation:** **KEEP**.
- **`postcss-load-config`:** Knip flags this as an unlisted dependency for `postcss.config.mjs`.
  - **Recommendation:** **NEEDS-OWNER** (Can be added or left as is since Next.js vendors it).

#### 3. Stale Local & Remote Branches Merged into Master
All of the following branches have been completely merged into `master` (`git branch --merged master` and `git branch -r --merged master`):

**Local Merged Branches (44):**
- `chore/audit-known-defects`
- `chore/codebase-cleanup`
- `data/delhi-pink-phase4`
- `data/delhi-pink-phase4-v2`
- `docs/doc-patches`
- `feat/m10-1-geometry-followup`
- `feat/m10-2-defect-followup`
- `feat/m10-3-metadata-followup`
- `feat/m10-tier1-followup`
- `feat/m10.1-twin-track-merge`
- `feat/m10.2-batch-cities`
- `feat/m10.2-bengaluru`
- `feat/m10.2-delhi`
- `feat/m10.2-kolkata`
- `feat/m10.2-mumbai`
- `feat/m13-1-ux-completion`
- `feat/m13.1-ux-hardening`
- `feat/m14-city-comparison`
- `feat/m14-compare`
- `feat/m15-tier2-acceptance`
- `feat/m15-tier2-agra`
- `feat/m15-tier2-jaipur`
- `feat/m15-tier2-kanpur`
- `feat/m15-tier2-kochi`
- `feat/m15-tier2-lucknow`
- `feat/m15-tier2-patna`
- `feat/m16-nearest`
- `feat/m16-nearest-station`
- `feat/m17-city-pages`
- `feat/m17-city-seo`
- `feat/m18-route-finder`
- `feat/m8-1-audit-followup`
- `feat/m8-audit-followup`
- `feat/m8.1-audit-blind-spots`
- `feat/m9-foundation-followup`
- `fix/m10-audit-errors`
- `fix/m10-declared-not-compiled`
- `fix/m10-delhi-pink-stations`
- `fix/m10-geometry-cleanup-pune-gurugram`
- `m8-m9-completion`
- `m8-repair-tier1`
- `maintenance/cleanup-and-audit-sync`
- `maintenance/phase-3`
- `onboard-pune`
- `refactor/prune-and-concise`

**Remote Merged Branches (8):**
- `origin/chore/codebase-cleanup`
- `origin/data/delhi-pink-phase4-v2`
- `origin/feat/m13-1-ux-completion`
- `origin/fix/m10-audit-errors`
- `origin/m8-m9-completion`
- `origin/maintenance/cleanup-and-audit-sync`
- `origin/refactor/prune-and-concise`

*(Unmerged branches preserved and NOT touched: `onboard-ahmedabad`, `origin/maintenance/phase-3`).*

#### 4. Stale Baseline Entries (14)
Identified by audit CLI:
- Accepted: `delhi | station-gap | del-pink|del-shiv-vihar|del-jaffrabad`, `kolkata | future-date-unconfirmed | kol-yellow-seg-02`, `kolkata | segment-end-far-from-station | kol-yellow-seg-02`, `noida | station-gap | noi-aqua|noi-depot|noi-noida-sector-137`, `noida | station-gap | noi-aqua|noi-noida-sector-83|noi-noida-sector-143`, `pune | segment-self-intersecting | pun-line-3-seg-01`, `noida | consecutive-segment-gap | noi-aqua-seg-01|noi-aqua-seg-02`.
- Unreviewed: `delhi | segment-self-intersecting | del-grey-seg-01`, `delhi | polyline-hook | del-grey-seg-01`, `chennai | polyline-hook | che-corridor-5-seg-01`, `delhi | ground-truth-length | del-pink`, `delhi | station-far-from-nearest-segment | del-dwarka`, `delhi | station-gap | del-grey|del-dwarka|del-najafgarh`.
- Defect F-06: `pune | polyline-hook | pun-line-3-seg-01`.
- **Status:** **NEEDS-OWNER**. Per Hard Rule #1, we do NOT touch `data/audit-baseline.json`.

---

### Bucket C: Reports, Logs, and Agent Output

#### 1. Intermediate Task Notes in `reports/data-audit/` (20 files, 75.7 KB)
- **Files:** `2026-10-10-ahmedabad-hyderabad.md`, `2026-10-10-delhi-followups.md`, `2026-10-10-map-issues-c2.md`, `2026-10-10-map-issues.md`, `2026-10-10-noida-pune-kolkata.md`, `2026-10-10-task-d-diagnosis.md`, `2026-10-10-task-e.md`, `2026-10-10-task-f.md`, `2026-10-10-task-g.md`, `2026-10-10-task-h.md`, `2026-10-15-phase2-delhi-pink.md`, `2026-10-15-phase2.md`, `2026-10-15-phase3-schematic-status.md`, `2026-10-15-phase3.md`, `2026-10-15-phase4.md`, `2026-10-15-phase5-geometry-gates.md`, `2026-10-15-phase5.md`, `2026-10-15-phase6-history-km.md`, `2026-10-15-phase6.md`, `2026-10-15-phase7.md`.
- **Evidence:** These were step-by-step intermediate progress notes written by subagents during single debugging sessions on Oct 10 and Oct 15. All findings were folded into `docs/FINDINGS-2026-10-12.md`, `reports/known-issues.md`, and the main daily audit logs.
- **Recommendation:** **Consolidate** high-level key takeaways into `reports/ARCHIVE-SUMMARY.md` and **delete originals**.

#### 2. Historical Daily Audit Snapshots (18 files, 2.31 MB)
- **Files:** `2026-10-07.{md,json}`, `2026-10-08.{md,json}`, `2026-10-09.{md,json}`, `2026-10-10.{md,json}`, `2026-10-12.{md,json}`, `2026-10-13.{md,json}`, `2026-10-15.{md,json}`, `2026-10-16.{md,json}`, `2026-10-17.{md,json}`.
- **Evidence:** Each run of `npm run audit:data` writes the full 300KB JSON and 74KB markdown of all 1,200 warnings. Daily copies from Oct 7 through Oct 17 take over 2.3 MB of git tracking.
- **Recommendation:** Keep the latest active run (`2026-10-18.{md,json}`) and foundational references (`blind-spots-2026-10-12.md`, `tier1-completion-2026-10-08.md`, `triage-2026-10-07.md`). Consolidate daily delta trends into `reports/ARCHIVE-SUMMARY.md` and **delete older historical daily runs**.

#### 3. Iterative Delhi Pink Phase 4 Data Drafts (4 files, 65.5 KB)
- **Files:** `reports/data/delhi-pink-phase4-2026-10-17.md`, `delhi-pink-phase4-v2-2026-10-17.md`, `delhi-pink-phase4-v3-2026-10-17.md`, `delhi-pink-phase4-v4-2026-10-17.md`.
- **Evidence:** Iterative draft prompts and logs created during the multi-turn Delhi Pink onboarding. `reports/data/delhi-pink-phase4-v5-2026-10-17.md` contains the final accepted summary and merge proof.
- **Recommendation:** Keep `delhi-pink-phase4-v5-2026-10-17.md`, **delete v1, v2, v3, v4**.

#### 4. Superseded Milestone Progress & Audit Reports (9 files, 155.7 KB)
- **Files:**
  - `reports/progress/2026-10-15-error-fix.md` (17.7 KB)
  - `reports/progress/2026-10-15-error-fix-2.md` (16.9 KB)
  - `reports/progress/2026-10-15-error-fix-3.md` (14.8 KB)
  - `reports/progress/2026-10-15-raw-refresh-diff.md` (6.3 KB)
  - `reports/progress/2026-10-15.md` (4.2 KB)
  - `reports/progress/2026-10-15-milestone-audit.md` (24.5 KB) — Superseded by Oct 18 audit.
  - `reports/progress/2026-10-16-milestone-audit.md` (23.4 KB) — Superseded by Oct 18 audit and noted in `docs/PARKED-ISSUES.md` for arithmetic errors.
  - Old Task 0 cleanup artifacts: `reports/cleanup/inventory.md`, `CLEANUP-PLAN.md`, `CLEANUP-LOG.md`, `BUGS-FOUND.md`, `baseline.md` (from Oct 10).
- **Recommendation:** **Consolidate** essential historical decisions into `reports/ARCHIVE-SUMMARY.md` and **delete originals**.

---

### Bucket D: Explicitly Kept (Critical Infrastructure & Assets)

1. **Active Core Datasets (`data/`)**:
   - `data/cities.json`, `data/lines.json`, `data/segments.geojson`, `data/stations.geojson` (Main application database).
   - `data/overrides/*.json` (23 files) — Sourced geometric and metadata overrides read by `merge-overrides.ts`.
   - `data/reference/*.json` (21 files) — Official reference files for city operational length, station count, and terminal stations.
   - `data/audit-baseline.json` & `data/audit/coverage-gaps.json` — Input to data audit engine.
   - `data/mock/*` (4 files) — Required for mock test fixtures and test environments.
2. **Raw Overpass Cache (`data/raw/*.json`, 21 files, 38.44 MB)**:
   - Includes all 21 cities (e.g. `delhi.json`, `bengaluru.json`, `mumbai.json`, and `surat.json`).
   - *Reason:* Verified against `scripts/pipeline/fetch-overpass.ts` and `build-real-data.ts`. The pipeline strictly checks this cache first to avoid Overpass rate-limits and HTTP 504 gateway timeouts.
3. **Visual QA Evidence (`reports/data-audit/*.png`, 14 files, 2.36 MB)**:
   - *Reason:* Sourced evidence files demonstrating visual compliance at 3 zoom levels and mobile viewports for Tier 1 and Tier 2 cities per `docs/VISUAL_QA.md`.
4. **Permanent Documentation & Specifications**:
   - `docs/BLUEPRINT.md`, `docs/MILESTONES-v2.md`, `docs/PARKED-ISSUES.md`, `docs/FINDINGS-2026-10-12.md`, `docs/DATA-STANDARDS.md`, `docs/DATA_AUDIT.md`, `docs/CITY_ONBOARDING.md`, `docs/VISUAL_QA.md`.
   - Root files: `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`.
5. **Key Landmark Reports**:
   - `reports/progress/2026-10-18-milestone-audit.md` (Current authoritative progress audit).
   - `reports/routing/2026-10-17-routing-verification.md` (M18 routing audit evidence).
   - `reports/data-audit/2026-10-18.{md,json}` (Active audit report matching current master).
   - `reports/data-audit/blind-spots-2026-10-12.md` (M8.1 audit blind spot analysis).
   - `reports/data-audit/tier1-completion-2026-10-08.md` (M10 Tier 1 milestone signoff report).
   - `reports/milestone-verification/2026-10-10.md` (M1–M12 verification record).
   - Individual feature milestone completion reports: `reports/progress/2026-10-16-m13.1.md`, `m14.md`, `m15-*.md`, `m16.md`, `2026-10-17-m17.md`, `m18.md`.
   - `reports/data/delhi-pink-phase4-v5-2026-10-17.md`.

---

## 3. Summary of Proposed Changes (Pending Phase 2 Approval)

| Action Category | Target Files / Items | Space Reclaimed | Verification Impact |
|---|---|---:|---|
| **Build & Tool Artifacts** | Remove `.next/`, `out/`, `playwright-report/`, `test-results/`, `scratch/`, debug geojson | ~373.4 MB | None (build/test commands regenerate them cleanly) |
| **Old Superseded Reports** | Consolidate 58 dated/intermediate reports into `reports/ARCHIVE-SUMMARY.md` and delete originals | ~2.69 MB | None (core docs and latest audit preserved) |
| **Merged Git Branches** | Delete 44 merged local branches (`git branch -d`) and 8 merged remote branches (`git push origin --delete`) | — | Zero code loss (all commits already in master) |
| **.gitignore Cleanliness** | Update `.gitignore` with explicit ignore entries for scratch and debug output | — | Prevents future accidental check-in |

### STOP: Waiting for Owner Approval
Per Phase 1 instructions, execution is paused until you review this manifest and reply with your approval (or any modifications to the list).
