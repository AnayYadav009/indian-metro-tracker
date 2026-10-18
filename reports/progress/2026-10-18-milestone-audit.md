# Milestone Audit — 2026-10-18

## Headline

**10 / 23 milestones fully verified; 85.8% weighted completion.** This is **+12.0 percentage points** from the corrected 2026-10-16 post-M13.1 baseline of 73.8% documented in `docs/PARKED-ISSUES.md` (the Oct 16 report's own 76.42% figure used incorrect arithmetic). M11, M13.1, M14, M16, M17, and M18 have complete implementations and tests in the repo, but are marked partial here because their required Playwright pass criteria could not be re-verified. Current Git state at final sync: clean `master`, up to date with `origin/master`, HEAD `8d920e8`. The initial sync during this audit was on `data/delhi-pink-phase4-v2`; the checkout changed during the audit to the just-merged master commit `8d920e8`. I did not switch branches or commit. There is no unmerged local work in the final snapshot.

### Weighting

Kept the prior method: equal weight for each of the 23 milestone units, with each in-progress milestone contributing its verified fraction of acceptance criteria. `weighted % = sum of milestone fractions / 23 × 100`. Existing in-progress fractions: M8 4/6, M8.1 4/5, M9 4/5, M10 4/6, M10.1 4/5, M10.2 9/14, M10.3 3/5 (sum 4.9762). E2E-gated milestones are conservatively partial pending a fresh passing run: M11 5/6, M13.1 3/4, M14 3/4, M16 4/5, M17 4/5, M18 5/6 (sum 4.7667). Ten fully verified milestones + 4.9762 + 4.7667 = 19.7429; 19.7429 / 23 = **85.84%**. The method and denominator match `reports/progress/2026-10-16-milestone-audit.md`; the previous arithmetic is corrected per `docs/PARKED-ISSUES.md`.

## Git and verification snapshot

- `git status`: `On branch master`; `Your branch is up to date with 'origin/master'`; `nothing to commit, working tree clean`.
- `git branch --show-current`: `master`.
- `git log --oneline -15`: HEAD `8d920e8 merge: feat(delhi, ui): Delhi Pink Phase 4 onboarding and UI declutter refactor`; immediately prior commits include `622fdb3 feat(ui): declutter dashboard, streamline drawer panels, and update audit reports`, and the Delhi Phase 4 commits `2856471` through `b07616d`. Latest 15-commit output was captured during the audit; no branch commits remain unmerged at final sync.
- `npm run lint`: PASS (exit 0; `eslint .`).
- `npm run typecheck`: PASS (exit 0; `tsc --noEmit`).
- `npm run build`: PASS (exit 0). Next.js 15.5.27 compiled and statically generated 28 pages; `/city/[id]` generated for all 21 cities, `/compare`, `/robots.txt`, and `/sitemap.xml` exported.
- `npm run validate:data`: PASS (exit 0): 21 cities, 58 lines, 77 segments, 917 stations; schema and relational integrity checks passed.
- Unit tests: `npx vitest run --exclude __tests__/atomic-write.test.ts` PASS, **35 files / 322 tests passed** (0 failed), exit 0.
- Playwright E2E: **not verified; no pass/fail count available**. `npm run test:e2e` on the default dev port failed to start because port 3000 returned `EADDRINUSE`; retries on ports 3010 and static-export port 3005 did not reach a test summary. A direct local socket probe returned “access ... forbidden by its access permissions.” This execution environment blocks the server sockets Playwright needs, so dev-server and static-export E2E acceptance remains unverified here. `playwright.config.ts` defines the dev and `PLAYWRIGHT_STATIC_EXPORT=true` server paths.
- Data audit: `scripts/audit/consistency-report.ts` was run on a copied dataset so it would not overwrite the existing `reports/data-audit/2026-10-18.*` artifacts. It printed 3 total errors, 1,234 warnings, 25 info, 1,076 accepted warnings, 88 unreviewed warnings, 42 pending-rule findings, 14 active coverage-gap findings, 14 stale baseline entries, then `❌ 1 errors and 30 un-baselined warnings remain`. The CLI source calls `process.exit(1)` for this condition. A PowerShell wrapper around the isolated run returned 0 after `Pop-Location`, which masked that child exit status; **do not treat that wrapper's 0 as an audit pass**. A later exact `npm run audit:data` retry could not be completed in the isolated temp directory because that execution's temp filesystem was not retained between command sessions. Existing tracked report `reports/data-audit/2026-10-18.md` independently records the same totals. Audit failure is confirmed from its output and `scripts/audit/consistency-report.ts`; shell exit status from the isolated wrapper was unreliable.

## Milestone status

| Milestone | Status | % | Evidence | Blocker |
|---|---:|---:|---|---|
| M1 Project setup and architecture | Pass | 100% | `next.config.ts`, `package.json`, `.github/workflows/` | — |
| M2 Map foundation and attribution | Pass | 100% | `components/map/map-canvas.tsx`, `lib/map-config.ts` | — |
| M3 Core data model and validator | Pass | 100% | `data/`, `scripts/validate-data.ts`; current validation passes | — |
| M4 Map rendering and filters | Pass | 100% | `components/map/`, `components/filters/`, filter tests | — |
| M5 Interaction and state sync | Pass | 100% | `store/use-metro-store.ts`, `hooks/use-url-sync.ts`, URL/store tests | — |
| M6 Map controls and polish | Pass | 100% | `components/legend/map-legend.tsx`, `components/timeline/`, `app/page.tsx` | — |
| M7 Real data pipeline | Pass | 100% | `scripts/pipeline/`, `data/`; validator passes | — |
| M8 Data audit and repair | Partial | 66.7% | `scripts/audit/consistency-report.ts`, `scripts/audit/audit-engine.ts`, audit report; tool and baseline exist | 3 total errors, 88 unreviewed warnings; 30 un-baselined findings cause CLI failure; manual station sampling and owner baseline review remain incomplete |
| M8.1 Audit blind-spot closure | Partial | 80% | `reports/data-audit/blind-spots-2026-10-12.md`; rules and fixtures in `scripts/audit/audit-engine.ts`, `__tests__/data-audit.test.ts` | Owner review is recorded as a STOP; 5 pending rule names remain in `data/audit-baseline.json`; audit still has findings |
| M9 Data foundation v2 | Partial | 80% | Additive schema/geo/site config and static export build exist; `lib/geo.ts`, `lib/site-config.ts` | The milestone overview says the size-budget baseline gate remains; E2E export/dev acceptance could not be run in this environment |
| M10 Tier 1 completion | Partial | 66.7% | References and data exist for Delhi NCR, Mumbai, Bengaluru, Chennai, Hyderabad, Kolkata; current data validates | M10 requires M10.1–M10.3 and all six Tier 1 visual QA checklists; Tier 1 errors/coverage and owner signoff remain |
| M10.1 Geometry cleanup | Partial | 80% | Geometry rules/config/tests in `scripts/audit/audit-engine.ts`, `scripts/audit/audit-config.ts`, `__tests__/data-audit.test.ts`; Delhi Pink geometry is present | Rules are not all enforcing; current audit has Delhi Pink parallel-track error and sparse-vertex warnings; visual QA and remaining geometry review are open |
| M10.2 Per-city defect repair | Partial | 64.3% | Per-city overrides/references and `docs/FINDINGS-2026-10-12.md`; Delhi Pink Phase 4 on current master | Current per-city audit still has unreviewed warnings and tracked construction/planned gaps; several listed findings remain open |
| M10.3 Metadata integrity and cross-network links | Partial | 60% | `data/overrides/interchanges.json`, `data/audit-baseline.json`, station metadata and audit tests | 5 pending rules; audit still flags interchange inconsistencies and undated stations; owner decisions and coverage review remain |
| M11 Report an error | Partial (implementation complete; E2E unverified) | 83.3% | Report issue builder, `components/panels/segment-detail.tsx`, `components/panels/station-detail.tsx`, issue template and unit/e2e specs | Required line/station-panel E2E pass not re-verified |
| M12 Interchange highlighting | Pass, known data defects | 100% | Interchange pipeline/overrides, map marker and station detail UI; tests | Feature exists; audit still flags inconsistent interchange metadata in Mumbai, Hyderabad and Gurugram (repair is M10.3) |
| M13 Timeline slider | Pass | 100% | `components/timeline/timeline-slider.tsx`, timeline/store tests | — |
| M13.1 UX hardening | Partial (implementation complete; E2E unverified) | 75% | `e2e/m13-1-ux.spec.ts`, UI commits now in `master`, relevant unit tests | Required interaction/overlap E2E pass not re-verified |
| M14 Comparison dashboard | Partial (implementation complete; E2E unverified) | 75% | `app/compare/page.tsx`, `__tests__/compare-stats.test.ts`, `e2e/compare.spec.ts` | Six comparison E2E cases not re-verified; data-quality caveats remain |
| M15 Tier 2 onboarding | Pass | 100% | City/reference files in `data/`; M15 batch completion sections in `docs/MILESTONES-v2.md`; city-page generation built for 21 cities | Existing Tier 2 geometry/coverage issues remain tracked under M10.2/M10.3 |
| M16 Nearest station finder | Partial (implementation complete; E2E unverified) | 80% | `components/panels/nearest-station-panel.tsx`, `lib/nearest-station.ts`, unit and e2e specs | Six geolocation/fallback E2E cases not re-verified |
| M17 City pages and SEO | Partial (implementation complete; E2E unverified) | 80% | `app/city/[id]/page.tsx`, `app/sitemap.ts`, `app/robots.ts`, `__tests__/city-seo.test.ts`; build generated all 21 pages | Seven static path/base-path E2E cases not re-verified |
| M18 Route finder | Partial (implementation complete; E2E unverified) | 83.3% | `components/routing/route-finder-panel.tsx`, `lib/routing/`, `__tests__/route-finder.test.ts`; route tests exist | Seven routing E2E cases not re-verified; graph still depends on M10.3 network/interchange integrity |

### Done

M1–M7, M12, M13, and M15: **10 milestone units fully verified**. M11, M13.1, M14, M16, M17, and M18 have implementation and test suites present, but remain partial until the required Playwright suites pass in an environment that permits local server sockets. M12 and M14 implementations consume data with known audit defects/caveats.

### In progress

- **M8 — 66.7% (S):** tool, baseline, rules, and report exist. Resolve audit errors, review the 88 unreviewed warnings and 14 stale baseline entries, complete owner review, and perform documented station spot checks.
- **M8.1 — 80% (S/M):** root-cause report and rule fixtures exist. Obtain owner review and resolve/enforce the pending findings when their target milestones close.
- **M9 — 80% (S):** schema and helpers exist. Close the measured data/JS size baseline gate and verify dev plus static-export Playwright runs.
- **M10 — 66.7% (L):** six Tier 1 systems are represented. Finish the subordinate geometry, defect, and metadata milestones; complete and obtain owner signoff on six city visual QA packages.
- **M10.1 — 80% (M):** cleanup pipeline and rules exist. Resolve the current Delhi Pink duplicate-track finding and remaining geometry cases; enforce rules after data repairs and finish visual checks.
- **M10.2 — 64.3% (L):** substantial repairs are present, including Delhi Pink Phase 4. Triage remaining city warnings/gaps, attach references and visual QA, and verify every line/station expectation against current official references.
- **M10.3 — 60% (M/L):** metadata and cross-network support exist. Resolve owner model decisions, remaining false interchange flags/provenance/undated fields, and the four rule-enforcement gate.
- **E2E verification for M11/M13.1/M14/M16/M17/M18 — remaining acceptance work (S):** run `npm run test:e2e` once against dev and once with `PLAYWRIGHT_STATIC_EXPORT=true` on a host that permits binding local ports; review failures and update the partial criteria above.

### Not started

No numbered M1–M18 milestone is at 0%. The unscheduled backlog in `docs/MILESTONES-v2.md` has no assigned milestone or acceptance plan; each item depends on an owner decision and scheduling. Examples include station search, opening-soon view, downloads, other rail modes, language support, PWA/offline, and embedded map.

## Data health

Live audit output by city (lines / segments / stations; errors / warnings). “Coverage gaps” is counted from `data/audit/coverage-gaps.json`; the CLI found 14 active `coverage-gap` findings from 15 declared gap records.

| City | L/S/St | Errors | Warnings | Declared coverage gaps | Findings / known defects |
|---|---:|---:|---:|---:|---|
| Delhi NCR (audit id `delhi`) | 10 / 17 / 247 | 1 | 537 | 1 | `segment-parallel-duplicate`: Pink segments parallel for ~1,199 m; 7 unverified Phase 4 station-layout warnings; Pink Phase 4 tracked extension |
| Mumbai | 7 / 11 / 88 | 0 | 146 | 1 | Four `interchange-consistency` warnings; Line 2B construction coverage gap |
| Bengaluru | 5 / 6 / 87 | 0 | 166 | 0 | Yellow length discrepancy and planned segment endpoint warning are unreviewed; mostly missing `last_verified` provenance info |
| Chennai | 5 / 4 / 41 | 0 | 46 | 1 | Corridor 3 (44.6 km) is an explicit gap; 41 operational-station date warnings; two line length warnings |
| Hyderabad | 3 / 4 / 57 | 0 | 66 | 0 | Two interchange consistency warnings; 3 stations lack `last_verified` |
| Kolkata | 5 / 7 / 57 | 0 | 101 | 3 | Three construction/planned coverage gaps; Green Line length warning |
| Ahmedabad | 4 / 4 / 54 | 0 | 110 | 1 | GIFT City–Shahpur Phase 2B gap; tender award/alignment unconfirmed |
| Pune | 3 / 3 / 29 | 0 | 36 | 3 | Three extension/infill gaps; Line 3 start is 18.3 km from nearest station, District Court 191 m from segment, both warnings |

Global audit result: **3 errors** (Delhi active twin-track finding, Gurugram pending terminal finding, Bhopal pending 10.2% length variance); **1,234 warnings**, **25 info**; **1,076 accepted**, **88 unreviewed** warnings; **42 pending-rule findings**; **14 active coverage-gap findings / 15 declared coverage gaps**; **14 stale baseline entries**. The CLI's effective gate reports **1 un-baselined error and 30 un-baselined warnings**. The difference between 3 total errors and 1 enforcing/un-baselined error is that two findings are in report-only pending rules.

## Feature status

| Feature | Status | Evidence |
|---|---|---|
| Timeline slider | Complete; unit-verified | `components/timeline/timeline-slider.tsx`; M13 tests |
| Nearest-station finder | Implemented; E2E pass unverified | `components/panels/nearest-station-panel.tsx`, `lib/nearest-station.ts`; unit/e2e specs |
| SEO city pages | Implemented and statically built; E2E pass unverified | `app/city/[id]/page.tsx`, `app/sitemap.ts`, `app/robots.ts`; build emitted 21 pages |
| Comparison dashboard | Implemented; E2E pass unverified | `app/compare/page.tsx`, compare stats tests and e2e spec |
| Interchange highlighting | Complete; metadata defects remain | map/station UI and interchange tests; current audit flags inconsistent metadata |
| Report an error | Implemented; E2E pass unverified | issue URL builder, panel buttons, issue template and tests |
| Route finder | Implemented; E2E pass unverified | route panel and `lib/routing/`; route tests |
| Tier 2 onboarding | Complete | all 12 candidate cities represented in `data/`; M15 batch records in milestone doc |

## Open owner decisions

The following are still explicitly marked for owner input in `docs/PARKED-ISSUES.md` or STOP points in `docs/MILESTONES-v2.md`:

1. **Bhopal:** accept/replace the Orange Line operational-length basis (5.58 vs 6.22 km, 10.2%) or provide surveyed alignment (PRE-01).
2. **Gurugram:** resolve the Cyber City terminal versus loop geometry endpoint (1,904 m from segment endpoint; PRE-02).
3. **Chennai Corridor 3:** restore a sourced schematic construction segment or retain the explicit 44.6 km coverage gap.
4. **Delhi Pink Phase 4:** confirm the “7 new stations” versus eight named stops interpretation and update references when officially confirmed.
5. **Undated openings:** decide whether to backfill only unambiguous station opening dates or retain null dates with historical reasons; the parked report records 588 stations, and current audit still reports date warnings.
6. **Branch geometry:** decide whether the three hard-coded overlap/loop exemptions remain accepted or segments must terminate at junction switch points.
7. **Audit policy:** decide whether known coverage-gap warnings are reviewed into baseline or continue failing CI until M10 signoff.
8. **Baseline cleanup:** approve removal of 14 stale entries.
9. **M10 visual QA:** review desktop/mobile packages for Delhi, Mumbai, Bengaluru, Chennai, Kolkata, and Hyderabad.
10. **Progress arithmetic:** acknowledge the corrected Oct 16 baseline (71.6% pre-M13.1; 73.8% after M13.1), as requested in the parked issue.

## Risks and discrepancies

- `docs/MILESTONES-v2.md` still labels M8 as “0 errors” and records earlier status snapshots; current audit finds 3 total errors. Its gate also says M14 onward cannot start before M10, but M14–M18 are now merged and complete while M10 remains partial. This is a process-order exception, not evidence those features are absent.
- `reports/progress/2026-10-16-milestone-audit.md` states an in-progress subtotal of 6.0762 and 74.25%; `docs/PARKED-ISSUES.md` correctly recomputes the subtotal as 5.4762 and post-M13.1 progress as 73.8%. Also, the prior per-city operational-km table sums to 835.4 km while its headline says 998 km. Use this audit's corrected baseline.
- Audit totals must be read with pending-rule and baseline categories. Three total errors do not mean three enforcing errors; two are report-only. Conversely, `audit:data` is not passing: it reports one active un-baselined error and 30 un-baselined findings. A wrapper returning 0 after `Pop-Location` masked the script's failure in one isolated run.
- There are 15 declared coverage-gap records but 14 active findings emitted by `coverage-gap`; investigate the unmatched declaration before treating coverage accounting as closed.
- The current run could not verify E2E. Existing E2E specs and older reports do not substitute for a fresh dev and static-export run.
- Current `master` has merged the Delhi Phase 4 and UI declutter commits, but audit still finds a Pink twin-track overlap across two compiled segments. Review the merged geometry before treating Phase 4 geometry as fully accepted.

## Recommended next 3 milestones

1. **Finish M8.1 audit blind-spot closure.** Owner review first, then reconcile the 5 pending rule definitions/findings and the 15-versus-14 coverage mismatch. This makes subsequent repairs measurable and prevents baselining away defects.
2. **Finish M10.1 geometry cleanup.** Resolve the active Delhi Pink parallel-track error and remaining listed geometry cases, then enforce the geometry rules and complete visual QA. This protects network totals and comparison accuracy.
3. **Finish M10.2 per-city defect repair.** Close the Tier 1 and existing Tier 2/NCR gaps, including Chennai Corridor 3 and unresolved line ends, then attach city-by-city visual and reference evidence. This is required before M10 can close.

After these, complete M10.3 and obtain M10 owner signoff. In parallel with that sequence, run the required Playwright dev and static-export suites in an environment that permits local server sockets before moving the six E2E-gated milestones from partial to done.
