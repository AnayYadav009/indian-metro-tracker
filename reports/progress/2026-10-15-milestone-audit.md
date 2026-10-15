# Milestone Audit — 2026-10-15

Audit basis: current checkout and commands run on 2026-10-15. This report does not treat earlier progress claims as proof. Milestones are assessed against `docs/MILESTONES.MD`, `docs/MILESTONES-v2.md`, `docs/DOC_PATCHES.md`, `docs/FINDINGS-2026-10-12.md`, `reports/data-audit/blind-spots-2026-10-12.md`, current source/data, Git, and the checks below. A checkbox is **Pass** only where current repository evidence supports it; missing artifacts or unexecuted visual/manual checks are **UNVERIFIED**.

## Repository state and checks

- Checkout: branch `refactor/prune-and-concise`, HEAD `aa852d0`; `master` and `origin/master` point to the same commit. `git status --short --branch` reports 17 changed paths: modified UI, hooks, utilities, pipeline/audit files, deleted `data/raw-audit/delhi-ways.txt`, and untracked `scripts/lib/station-name.ts`. These are uncommitted user work; see risk below.
- `git branch -a` includes feature branches `feat/m10.1-twin-track-merge` (`4d41603`), `feat/m10.2-delhi` (`5a806ed`), `feat/m10.2-mumbai` (`3edb031`), `feat/m10.2-bengaluru` (`1067726`), `feat/m10.2-kolkata` (`d065edf`), `feat/m10.2-batch-cities` (`36f22e2`), `feat/m13.1-ux-hardening` (`21c34c8`), `feat/m8.1-audit-blind-spots` (`4c436f1`), plus `m8-m9-completion`, `m8-repair-tier1`, onboarding and maintenance branches. The M10.1/2 and M13.1 feature commits listed above are ancestors of current master (merged); they are not currently unmerged work.
- `npm run audit:data`: exit 0. 25 errors, 1,238 warnings, 19 info; 1,096 accepted, 94 unreviewed, 1 known defect tracked, 72 pending-rule findings (individual pending rules are 7). The script prints “All checks pass” because errors are baseline-tracked/otherwise accepted by its policy; this does **not** mean zero audit errors. Full per-city counts below.
- `npm run lint`: exit 0, `eslint .`.
- `npm run typecheck`: exit 0, `tsc --noEmit`.
- `npm test` / `vitest run`: **237 passed, 3 failed; 29 files, 28 passed and 1 failed**. All three failures are in `__tests__/atomic-write.test.ts`, where temp-file rename receives Windows sandbox `EPERM` before the intended assertions. This run is environment-constrained evidence, not proof the tests pass elsewhere.
- E2E suite and `validate:data` were not rerun in this audit. Their current status is **UNVERIFIED**. The audit command regenerated `reports/data-audit/2026-10-15.md` and `.json`; no source/data file was changed by that command.

## Per-city coverage (current compiled dataset and audit JSON)

“Lines” is line records; “stations” is station records. Missing `opened_on` counts operational stations only. Missing layout/phase counts all stations. Geometry issues count audit findings with geometry/proximity/terminal-related rules (`polyline-hook`, `segment-*`, `line-terminal-missing`, segment gaps/end proximity); each row reports the finding count, not unique defects. This count includes warnings and errors.

| City | Lines | Stations | Missing opened_on | Missing layout | Missing phase | Geometry/audit issues |
|---|---:|---:|---:|---:|---:|---:|
| Delhi NCR (`delhi`) | 10 | 240 | 230 | 202 | 0 | 40 |
| Mumbai | 7 | 88 | 41 | 54 | 0 | 7 |
| Bengaluru | 5 | 87 | 83 | 64 | 0 | 9 |
| Chennai | 5 | 41 | 41 | 0 | 0 | 5 |
| Hyderabad | 3 | 57 | 57 | 0 | 0 | 4 |
| Kolkata | 5 | 57 | 55 | 36 | 0 | 6 |
| Ahmedabad | 4 | 54 | 53 | 50 | 0 | 1 |
| Pune | 3 | 29 | 28 | 0 | 0 | 11 |

Live audit totals by requested city: Delhi 7 errors/538 warnings; Mumbai 1/154; Bengaluru 1/167; Chennai 1/46; Hyderabad 0/64; Kolkata 2/100; Ahmedabad 1/109; Pune 4/39. The active audit report includes geometry finding subjects; for example Delhi has terminal misses for Grey and Pink, four `segment-parallel-duplicate` errors, and multiple `segment-sparse-vertices` warnings; Pune has the tracked Line 3 hook/parallel issue; Kolkata has a Green Line terminal error. See generated live output `reports/data-audit/2026-10-15.md` and `.json`.

## Milestones and criteria

Percent is a literal verified-criterion ratio for the checkable criteria enumerated here. **Pass / Fail / UNVERIFIED** are per criterion; partial criteria count as not met. For milestones with multiple explicit city-level acceptance clauses, the clause is checked across applicable cities. Earlier progress documents were used to locate assertions, not to convert them into current evidence.

| Milestone | Status | % done | Remaining work | Blocker |
|---|---|---:|---|---|
| M1 | Done on master | 3/3 (100%) | — | — |
| M2 | Done on master | 3/3 (100%) | — | — |
| M3 | Done on master | 4/4 (100%) | — | — |
| M4 | Done on master | 4/4 (100%) | — | — |
| M5 | Done on master | 4/4 (100%) | — | — |
| M6 | Done on master | 3/3 (100%) | — | — |
| M7 | Done on master | 5/5 (100%) | — | — |
| M8 | In progress | 1/6 (17%) | Triage unreviewed warnings; resolve active errors; reference/manual sampling and validator checks | 25 current audit errors, 94 unreviewed warnings |
| M8.1 | In progress | 3/5 (60%) | Complete rule fixture coverage/root-cause traceability; explain remaining F findings | Pending rules still report-only; live audit has findings |
| M9 | In progress | 3/5 (60%) | Record gzip/data and initial-JS size baseline; verify export/mobile E2E | Baseline artifact not found; E2E not rerun |
| M10 | In progress | 2/6 (33%) | Complete six-city quality gate and attach city visual-QA evidence | Current audit errors and metadata gaps; Chennai Corridor 3 absent |
| M10.1 | In progress | 2/5 (40%) | Fix all active parallel/hairpin/sparse geometry findings; verify visual cases and km totals; enforce rules | Audit still reports errors for current geometries; M10 gate depends on M10.2/10.3 |
| M10.2 | In progress | 5/14 (36%) | Repair remaining Pune/Chennai/Bengaluru future coverage and clean terminal/geometry errors; city evidence | Current data audit has errors; several known defects remain |
| M10.3 | In progress | 2/5 (40%) | Close opened-date/provenance coverage and audit errors; enforce all required rules | 579 missing operational station dates among the eight requested cities alone; audit errors remain |
| M11 | Done on master | 6/6 (100%) | — | — |
| M12 | Done on master | 5/5 (100%) | — | — |
| M13 | Done on master | 6/6 (100%) | — | — |
| M13.1 | In progress | 1/4 (25%) | Finish UX findings, labels, overlap/loading checks and e2e validation | Current work is uncommitted; E2E not rerun |
| M14 | Not started | 0/4 (0%) | Build comparison route, visualizations, divergence and total assertions | Explicit M10 gate |
| M15 | In progress | 2/4 (50%) | Verify Tier 2 references/confidence and complete defects/enforcement; current cities include 4 added in master | M10.2 data quality gate |
| M16 | Not started | 0/5 (0%) | Geolocate control, local lookup/privacy, denied/manual fallback, tests | M10 gate |
| M17 | Not started | 0/5 (0%) | Static city pages, metadata/sitemap/robots, share cards, export verification | M10 gate |
| M18 | Not started | 0/6 (0%) | Station topology, graph/Dijkstra, UI/URL, geometry, performance | M10 gate; topology chosen as optional field but not yet populated/verified |

### Criterion evidence and remaining work by milestone

**M1 (3/3).** Pass: Next App Router/TypeScript in `package.json`, `app/`; static export in `next.config.ts`; deploy workflow `.github/workflows/deploy.yml` exists. No remaining work.

**M2 (3/3).** Pass: MapLibre dependency and `components/map/map-canvas.tsx`; basemap config `lib/map-config.ts`; attribution and worker files/tests `components/map/osm-attribution.tsx`, `scripts/copy-maplibre-worker.mjs`, `e2e/attribution.spec.ts`, `e2e/worker.spec.ts`. Visual runtime not rerun in this audit.

**M3 (4/4).** Pass: schemas/validation in `types/metro.ts`, `lib/data-validator.ts`; separate line/segment/station data files; status/phase fields; `DATA_SOURCE` in `lib/data-loader.ts`. Current typecheck passes.

**M4 (4/4).** Pass: three status layer styles and filter panel in `components/map/map-layers.ts`, `components/filters/filter-panel.tsx`; filter utility `lib/filter-utils.ts`; e2e spec exists. The current full suite is not green (see atomic-write failures); no timed runtime assertion rerun.

**M5 (4/4).** Pass: map click handlers, metadata panel, Zustand store, URL sync are present in `components/map/map-canvas.tsx`, `components/panels/metadata-panel.tsx`, `store/use-metro-store.ts`, `hooks/use-url-sync.ts`; interaction e2e spec exists. Runtime test unverified in this audit.

**M6 (3/3).** Pass: legend, mock banner and mobile viewport styling/spec exist (`components/legend/map-legend.tsx`, `components/ui/mock-banner.tsx`, `e2e/mobile-viewport.spec.ts`). Responsive visual acceptance not independently rerun.

**M7 (5/5).** Pass: fetch/normalize/override/build and atomic-write pipeline files exist; `scripts/pipeline/*`, `scripts/lib/atomic-write.ts`; data validation and typecheck present. Full test suite has environment failures, so operational pipeline acceptance is only structurally verified.

**M8 (1/6).** Pass: audit tool exists and executes, and zero warnings are unbaselined per its policy (all findings are accepted, unreviewed, known or pending). Fail: zero errors (25); remaining warnings reviewed/resolved (94 unreviewed); reference counts/manual 10-station samples (not reproducibly evidenced in this run); lint/typecheck/test/validate gate (lint/typecheck pass, test 3 fail, validate not run). UNVERIFIED: every changed source value carries a valid official reference and each city matches references within tolerance. Tasks: resolve current error findings (L); city-by-city unreviewed triage (L); run validate and manual sampling (M).

**M8.1 (3/5).** Pass: blind-spot report exists; pending rules are in `data/audit-baseline.json`; audit engine and fixtures exist. Fail: new rules are no longer only 4/11 implemented as older report claimed, but current findings still demonstrate the checks are not clear/closed; acceptance of at least one finding per data defect F-01–F-22 is not fully evidenced. UNVERIFIED: every rule has a failing and passing fixture and every finding has a root-cause row. Work: map all F-01–F-22 to current audit evidence (M); strengthen fixtures/rules for false positives (L).

**M9 (3/5).** Pass: additive fields and geo helpers exist (`types/metro.ts`, `lib/geo.ts`); static-export CI workflow exists; coordinate truncation is present in pipeline. Fail: size baseline artifact not found. UNVERIFIED: both dev and static export e2e gates pass (not run). Work: record gzip baseline (S); execute CI-equivalent export/mobile e2e (M).

**M10 (2/6).** Pass: real city datasets exist and no mock source was observed in the listed active compiled data; Tier 1 city data and deploy/filter source code exist. Fail: current audit errors; count/reference matching not demonstrated across six; missing metadata and unfinished defect rows. UNVERIFIED: production mock banner hidden; mobile filter operation and deployed export verified. Work: complete M10.1–10.3, city QA, then zero-error/zero-unreviewed gate (L).

**M10.1 (2/5).** Pass: normalizer contains twin-track and hairpin processing; pipeline tests exist. Fail: live `segment-parallel-duplicate` errors persist (Delhi, Bengaluru, Chennai, Pune and others); no current visual audit proves named cases clean. UNVERIFIED: all listed cases verified at 3 zooms, km totals exact; all four rules enforcing with zero findings; full validator/audit/e2e gate (tests fail and validate/e2e not run). Work: investigate each error/rule false positive vs defect, repair geometry at source, rebuild and review (L); enforce only after clean audit (S).

**M10.2 (5/14).** Pass: Delhi, Mumbai, Bengaluru, Kolkata and Hyderabad/Pune/Ahmedabad/NCR data repair commits are on master; findings report documents those changes. Fail: current audit has errors in every requested city except Hyderabad; Pune Line 3 remains a defect; Chennai Corridor 3 remains deleted. UNVERIFIED: all per-city reference matching, all visual QA artifacts/checklists attached, per-city station samples, full future corridor completeness. Work: restore/verify Chennai Corridor 3 with reference; resolve Pune Line 3; reconcile terminal/geometry errors and each city's future coverage; require visual QA and run zero-error audit (L).

**M10.3 (2/5).** Pass: `ordered_station_ids` option is recorded in `docs/DATA-STANDARDS.md`; shared interchange IDs implemented in station data/overrides; pipeline test for not generating `last_verified` exists. Fail: requirements say four audit rules enforcing, but `pending_rules` still lists 7, including `orphan-future-station` and other M10.2 rules; current data contains operational stations without dates. UNVERIFIED: no OSM-only record has `last_verified` (F-19 says records still do; we did not independently count current exact subset); Sikanderpur panels show both networks at runtime; full validation gate. Work: verify provenance per record, backfill only sourced dates, close cross-network warnings and enforce rules after M10.2 (L).

**M11 (6/6).** Pass: report issue button and URL builder, GitHub issue template, contributor docs, URL-length guard, click-only behavior and unit/e2e specs exist in current tree. E2E not rerun.

**M12 (5/5).** Pass: interchange derivation/overrides, distinct marker layer, panel chips and tests exist (`scripts/pipeline/interchange-clusters.ts`, `data/overrides/interchanges.json`, `components/map/map-layers.ts`, `components/panels/station-detail.tsx`, `e2e/interchange.spec.ts`). Runtime suite unverified.

**M13 (6/6).** Pass: slider/play/pause/future toggle, date filtering, undated bucket, sparkline and tests exist in `components/timeline/timeline-slider.tsx`, `lib/timeline-utils.ts`, `e2e/timeline.spec.ts`. E2E not rerun; data-date completeness remains M10.3, not a slider feature defect.

**M13.1 (1/4).** Pass: station visibility toggle is implemented in `components/timeline/timeline-slider.tsx` and wired to map layers. Fail: plural/date/label copy remains visibly targeted by `docs/FINDINGS-2026-10-12.md`; full UX acceptance lacks current passing tests. UNVERIFIED: panel overlap and city-switch render timing tests. Work: correct label mapping/plurals, polish loading/panel and national zoom, add/check desktop/mobile tests; run lint/typecheck/test/e2e (M).

**M14 (0/4), M16 (0/5), M17 (0/5), M18 (0/6).** Fail: routes/features are absent from `app/` (only root page/layout/styles are present); searches found no nearest-station control, compare page, city SEO routes, or route-finder UI. Work in order after gate: comparison dashboard; nearest station and tests; city SEO/static export; route topology then route finder. Each is L. M18 topology decision is recorded as Option A but data population remains unverified.

**M15 (2/4).** Pass: Tier 2 data files exist, including Indore, Bhopal, Nagpur, Surat in master commit `aa852d0`. Fail: new Tier 2 records are not enough to satisfy their data-quality/defect acceptance; audit errors include Ahmedabad, Bhopal and Nagpur. UNVERIFIED: references/confidence are all formally upgraded and all Tier 2 defects closed. Work: reconcile sources, audit and repair each network (L), then apply M8.1 enforcement (M).

## Known data defects and map-render fixes

### F-01 through F-24 (findings ledger checked against current audit/data)

- **F-01 Delhi Blue/Noida extension:** earlier fix commit `5a806ed`; current data contains Delhi Blue extension and Noida records. **Pass structurally; visual/current reference verification UNVERIFIED.**
- **F-02 Golden corridor / Golden rename:** line data includes `del-golden` and backwards-compatible Silver alias per source/history; current audit still has construction/reference mismatch. **Partial, not closed**: compare actual stretch with reference; audit output has related terminal/end warnings.
- **F-03 Pink hairpin:** normalizer filter exists, but current geometry audit still reports parallel duplicates, so mark **UNVERIFIED/needs review**, not closed solely from commit.
- **F-04 Magenta U-hook:** documented as genuine geometry, but current visual check not repeated. **UNVERIFIED.**
- **F-05 Sikanderpur link:** shared `interchange_id` is implemented and M10.3 commit is in master. **Pass data model; panel display at runtime UNVERIFIED.**
- **F-06 Pune Line 3 hook/missing stations:** current `pun-line-3-seg-01` has audit parallel-duplicate/hook/proximity findings. **Open.**
- **F-07 Pune twin track:** pipeline handling exists, but its current geometry still produces a parallel-duplicate error associated with Line 3; Line 1 itself not singled out by live output. **Partial.**
- **F-08 Pune Line 2 chord/hook:** prior repair commit exists; no named current finding for that line. **UNVERIFIED visually/reference-wise.**
- **F-09 Pune double count:** earlier commit documents 31.2 km vs 31.3 km reference; current audit still has four errors overall but not a reported km mismatch among displayed rules. **Data value supported; total assertion not rerun.**
- **F-10 Mumbai Line 4:** prior repair commit, 11 lines/88 stations now; current audit has no parallel duplicate specifically for Mumbai. **Likely fixed structurally; visual check UNVERIFIED.**
- **F-11 Mumbai orphan hollow stations:** out-of-scope/data handling exists; **visual/current inventory UNVERIFIED.**
- **F-12 Mumbai chords:** prior removal commit; no current chord-specific rule evidence. **UNVERIFIED visually.**
- **F-13 Bengaluru Pink Line:** current coverage 4? (current data 87 stations overall) and audit has no Pink-specific failing finding. **Partial/UNVERIFIED** because corridor station coverage not checked against reference here.
- **F-14 Bengaluru Blue Line:** same; audit still has sparse-vertex warnings on Blue geometry. **Open/partial.**
- **F-15 Bengaluru Purple zig-zag:** geometry still has sparse-vertex warning; prior resolution claim not sufficient. **UNVERIFIED visually.**
- **F-16 Hyderabad west hook:** current audit has no hook/parallel error in Blue; **UNVERIFIED visually.**
- **F-17 future segments with zero stations:** remains open; data/audit baseline and findings list zero-station segments. **Open.**
- **F-18 operational stations undated:** **Open**; 579 operational stations lack `opened_on` across the eight cities requested (sum of live coverage table).
- **F-19 OSM verification provenance:** **Open/UNVERIFIED**; provenance criterion not established by running a current exact count; documentation contains conflicting historical claims.
- **F-20 corridor coverage:** **Open**; coverage review not established and Chennai Corridor 3 absence is explicitly a regression.
- **F-21 Chennai staged opening date:** **Open**; `che-blue-seg-01` still represents staged line data with one inauguration date per findings doc; not fixed/verified in this audit.
- **F-22 Ahmedabad stub:** previous commit maps Violet/GIFT stations; current audit reports a missing Phase 2B construction stretch. **Partial; reference mismatch open.**
- **F-23a–g interface findings:** **Open/partial**; station-hide toggle works structurally; no full UX acceptance run; label/plural issue remains.
- **F-24 totals positive control:** **UNVERIFIED** now; no current sum-vs-header assertion command run.

### Five map-render fixes explicitly requested

1. Legend/interchange marker: **implemented** (legend entry and interchange map layer); e2e exists but not rerun.
2. Missing stations: **mixed/open**; current dataset has stations, but known Bengaluru future line coverage and Pune Line 3 remain incomplete and audit findings persist.
3. Looping line ends: **open**; Pune Line 3 hook and audit parallel duplicate remain; Delhi/Bengaluru geometry also has current parallel errors.
4. Planned lines and Golden Line rename: **partial**; Golden identity/alias exists, but full corridor/reference mismatch and planned/future coverage are not resolved.
5. Station-hide toggle: **implemented in source** (`timeline-slider.tsx`, `map-canvas.tsx`, store); runtime e2e not rerun.

## Features: shipped vs planned

| Feature | Current evidence/status |
|---|---|
| Timeline slider | Shipped on master; source and unit/e2e specs present. Data has substantial undated station coverage. |
| Nearest-station finder | Planned, not found in app routes/components. |
| City SEO pages | Planned, not found; no dynamic city routes/sitemap/robots in `app/`. |
| Comparison dashboard | Planned, not found; no `/compare/`. |
| Interchange highlighting | Shipped structurally: map layer, legend, cluster pipeline, station chips. E2E not rerun. |
| Report-an-error button | Shipped structurally; GitHub issue URL/template and specs present. E2E not rerun. |
| Route finder | Planned, no UI/graph implementation found. `ordered_station_ids` decision exists, but population is unverified. |
| Tier 2 onboarding | Partial/shipped data: five earlier tier 2/NCR cities plus Indore/Bhopal/Nagpur/Surat; audit errors remain in three of these networks and full defect gate is not met. |

## Summary and critical path

Fully done: **10 / 23** milestones (M1–M7, M11–M13). Equal-weight estimate: **10/23 = 43.5% fully complete**. For a progress-weighted estimate, give each milestone equal weight and use criterion fractions in the table above; sum = **approximately 59.2%** (partial milestones contribute their verified criterion fractions; all acceptance clauses are weighted equally within each milestone). This is a project checklist measure, not a measure of feature value or remaining effort.

| Milestone | Status | % done | Remaining work | Blocker |
|---|---|---:|---|---|
| M1–M7 | Done on master | 100% each | None identified | — |
| M8 | In progress | 17% | Clear audit errors, review warnings, validate sources | Current 25 errors / 94 unreviewed |
| M8.1 | In progress | 60% | Complete fixture/finding traceability and rule enforcement plan | Pending/report-only rules and unresolved findings |
| M9 | In progress | 60% | Data size baseline, export/mobile E2E | Baseline absent; E2E not run |
| M10 | In progress | 33% | Close six-city quality/visual gate | M10.x incomplete and audit errors |
| M10.1 | In progress | 40% | Clean geometry findings, verify all named cases | Active parallel/hairpin/sparse findings |
| M10.2 | In progress | 36% | Finish city defects, restore missing corridor, QA | Pune/Chennai and current audit errors |
| M10.3 | In progress | 40% | Provenance/date coverage, enforce rules, verify panels | 588 requested-city undated operational stations |
| M11–M13 | Done on master | 100% each | Runtime verification optional for this audit | — |
| M13.1 | In progress | 25% | Labels, overlap, city-switch UX and tests | E2E not run; label fixes pending |
| M14 | Not started | 0% | Compare page | M10 gate |
| M15 | In progress | 50% | Tier 2 data/defects and audit gate | Audit errors |
| M16–M18 | Not started | 0% | Nearest, SEO pages, route finder | M10 gate |

### Critical path: next five tasks

1. **Reconcile the 25 audit errors and establish true status for pending rules** (L). Unblocks reliable, actionable M8 and stops treating “audit exit 0” as “no defects.”
2. **Restore/verify Chennai Corridor 3, close Pune Line 3 and remaining Tier 1 geometry/terminal issues** (L). Unblocks M10.1/M10.2 acceptance and corridor completeness.
3. **Resolve all Tier 1 city findings and warning reviews against official references; complete visual QA** (L). Unblocks the Tier 1 M10 gate and clean M8 baseline.
4. **Finish metadata integrity: dates only where evidenced, verification provenance, cross-network panel checks, enforce correct rules** (L). Unblocks M10.3 and keeps timeline data honest.
5. **Run the full validation matrix (validate:data, lint, typecheck, unit, dev/export e2e) and close M13.1 UX items** (M). Unblocks M10 gate signoff and then M14 onward.

## UNVERIFIED claims and at-risk work

- **UNVERIFIED:** any earlier “done” claim for M10.1 visual geometry, M10.2 city-by-city visual QA, M10.3 no-OSM-only `last_verified`, M13.1 complete UX, or F-01–F-24 closure not backed by current evidence above. A commit message is evidence of an attempted change, not proof the acceptance criterion still passes.
- **At risk:** all 17 uncommitted working-tree paths identified above, especially modified `scripts/pipeline/normalize.ts`, `scripts/audit/dedupe-report.ts`, `lib/geo.ts`, UI files, deleted `data/raw-audit/delhi-ways.txt`, and untracked `scripts/lib/station-name.ts`. Current branch name is `refactor/prune-and-concise`; these changes are not committed or pushed by this audit. Preserve them before switching branches or cleaning the checkout.
- Feature branch commits shown in Git are already ancestors of `master` (and master equals HEAD); these are not at risk as unmerged changes. The current working-tree edits are the outstanding loss risk.


