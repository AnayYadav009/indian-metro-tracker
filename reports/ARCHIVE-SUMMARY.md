# Historical Reports & Data Audit Archive Summary

**Consolidation Date:** 2026-10-18  
**Scope:** Replaces and consolidates 56 intermediate subagent debugging notes, outdated daily audit snapshots, and superseded milestone drafts across `reports/data-audit/`, `reports/data/`, `reports/progress/`, and `reports/cleanup/`.

---

## 1. Summary of Consolidated Report Groups

### A. Intermediate Data Audit Notes (Oct 10 Tasks D–H & Oct 15 Phases 2–7)
The 20 intermediate task files (`2026-10-10-*.md` and `2026-10-15-phase*.md`) recorded step-by-step investigations into network defects:
- **Delhi Network:** Analyzed Pink Line Phase 4 extension, Grey Line Najafgarh/Dhansa Bus Stand terminal geometry, and twin-track parallel alignment near Majlis Park. Root-cause findings confirmed that twin tracks in OSM were surveyed per direction and merged in the pipeline.
- **Mumbai Network:** Investigated Line 2B (Chembur to DN Nagar) construction coverage gap and Line 3 underground alignments. Recorded interchange discrepancies at D.N. Nagar, Gundavali, and Western Express Highway where single-line interchange flags existed.
- **Pune Line 3:** Detailed the 18.3 km distance between the nearest station and start of segment, and the Hinjawadi–District Court alignment. Tracked as an accepted geometry warning.
- **Kolkata Network:** Investigated Green Line (East-West) subaqueous tunnel length variance (15.06 km vs 16.55 km reference) and Yellow Line construction hold-ups at Airport–Michael Nagar due to land acquisition and NOC requirements.
- **Chennai Corridor 3:** Documented the temporary 44.6 km coverage gap while civil contract packages and underground alignment revisions are pending survey.

*Permanent Landing:* All active architectural findings from these notes are permanently tracked in [`docs/FINDINGS-2026-10-12.md`](../docs/FINDINGS-2026-10-12.md) and [`reports/known-issues.md`](known-issues.md).

---

### B. Historical Daily Audit Snapshots (2026-10-07 through 2026-10-17)
Between 2026-10-07 and 2026-10-17, daily runs of `npm run audit:data` generated `.json` and `.md` files tracking the audit progression:
- **2026-10-07 / 08 / 09:** Initial baseline triage (24 errors, 1,020 warnings). Established baseline categories: `accepted_warnings`, `unreviewed_warnings`, and `known_walkthrough_defects`.
- **2026-10-10 / 12 / 13:** Expanded rules to flag sparse vertices, hairpin turns, line terminals missing, and ground truth length variance. Recorded in `reports/data-audit/blind-spots-2026-10-12.md`.
- **2026-10-15:** Major data refresh across all Tier 1 cities; audited 25 errors down to 17 errors across 7 defect-repair phases (`2026-10-15-error-fix*.md`).
- **2026-10-16 / 17:** Tier 2 city onboarding (Agra, Jaipur, Kanpur, Kochi, Lucknow, Patna) completed without adding new audit errors; established M13–M18 feature implementations.
- **2026-10-18 (Current Source of Truth):** 3 errors (1 non-pending twin-track overlap in Delhi Pink; 2 pending-rule errors in Bhopal & Gurugram); 1,234 warnings; 14 coverage gaps; 14 stale baseline entries.

*Active Authoritative Audit:* [`reports/data-audit/2026-10-18.md`](data-audit/2026-10-18.md) and [`reports/data-audit/2026-10-18.json`](data-audit/2026-10-18.json).

---

### C. Iterative Delhi Pink Line Phase 4 Data Drafts (v1 through v4)
During Delhi Pink Phase 4 onboarding on branch `data/delhi-pink-phase4-v2`, drafts v1 through v4 documented iterative node extractions from OSM ways 1076936306, 1269386348, etc.
- **Draft v1–v4:** Trial alignments connecting Majlis Park to Maujpur-Babarpur, evaluating 7 new stations vs 8 named stops (Burari, Jharoda Majra, Jagatpur Village, Soorghat, Khajuri Khas, Bhajanpura, Yamuna Vihar).
- **Final Accepted Summary:** [`reports/data/delhi-pink-phase4-v5-2026-10-17.md`](data/delhi-pink-phase4-v5-2026-10-17.md) contains the complete commit history, schema validation diffs, and merge verification into `master`.

---

### D. Older Milestone Audits (2026-10-15 and 2026-10-16)
- **Oct 15 Audit:** Measured repo progress at 47.8% prior to Tier 2 completion and feature milestone implementation.
- **Oct 16 Audit:** Recorded 74.25% progress across 23 milestones, but contained an arithmetic discrepancy in the in-progress subtotal (6.0762 vs true 5.4762).
- **Correction:** Formally documented in [`docs/PARKED-ISSUES.md`](../docs/PARKED-ISSUES.md) (recalculated baseline: 73.8% post-M13.1).
- **Current Milestone Audit:** Fully superseded by [`reports/progress/2026-10-18-milestone-audit.md`](progress/2026-10-18-milestone-audit.md) (85.84% conservative weighted completion / 93.42% code-complete).

---

### E. Early Task 0 Cleanup Inventory (Oct 10)
Early cleanup scratch documents (`inventory.md`, `CLEANUP-PLAN.md`, `CLEANUP-LOG.md`, `BUGS-FOUND.md`, `baseline.md`) from October 10 documented git status on commit `3117dcd`. They are completely superseded by the October 18 cleanup baseline [`reports/cleanup/baseline.txt`](cleanup/baseline.txt) and manifest [`reports/cleanup/manifest.md`](cleanup/manifest.md).

---

## 2. Resolved Items Since Cleanup

The following defects, code hygiene bugs, and responsive layout conflicts were triaged and resolved:

1. **BUG-01: Station Deduplication Geometry Calculation Inlines Haversine**
   - *File*: `scripts/audit/dedupe-report.ts` (lines 4 & 85)
   - *Resolution*: Replaced local haversine implementation with `haversineDistanceM` from `lib/geo.ts`.
   - *Fixing Commit*: `5816e50` ("chore(cleanup): extract buildFilterCriteria helper, dedupe haversine, fix mobile-chrome E2E slider test (Batch 3)")

2. **BUG-02: `useUrlSync` Hardcodes Year Lower Bound (1984)**
   - *File*: `hooks/use-url-sync.ts` (lines 6 & 89)
   - *Resolution*: Centralized timeline year constant; imported and hydrated using `MIN_DATASET_YEAR` from `@/lib/timeline-utils`.
   - *Fixing Commit*: `4398c75` ("chore(cleanup): centralize constants and eliminate magic values (Batch 2)")

3. **BUG-03: `scripts/audit/generate-triage-report.ts` Unhandled Missing Temporary File**
   - *File*: `scripts/audit/generate-triage-report.ts` (referenced in historical `BUGS-FOUND.md`)
   - *Resolution*: Ephemeral triage script removed during cleanup manifest execution.
   - *Fixing Commit*: `61a7e25` ("chore(hygiene): consolidate historical reports into ARCHIVE-SUMMARY and remove superseded files")

4. **BUG-04: Mobile Viewport (390x844) Pointer Event Interception on Filter Controls**
   - *File*: `components/legend/map-legend.tsx` & `e2e/legend.spec.ts` & `e2e/attribution.spec.ts`
   - *Resolution*: Collapsed MapLegend by default on viewports below 768px via client `useEffect` after mount; synchronized E2E specs for mobile legend toggle.
   - *Fixing Commit*: `10a6e5d` ("fix(ui, e2e): collapse MapLegend by default on mobile, fix spec synchronization, and resolve mobile filter obstruction")

---

## 3. Consolidation of Milestone M10 Progress Notes & Diagnostic Reviews (Oct 19 – Oct 27, 2026)

### A. M10 Milestone Execution & Defect Handover (Oct 19)
Consolidates `reports/progress/2026-10-19-handover.md`, `2026-10-19-m10-2-delhi-complete.md`, `2026-10-19-m10-2-mumbai-complete.md`, and `2026-10-19-m10-final-handover.md`:
- **M10.1 Geometry Consolidation**:
  - Implemented single midpoint centerlines for twin-track traces on Delhi Pink Line (Maujpur approach), Pune Lines 1, 2, and 3, and Mumbai Line 4.
  - Cleared artificial schematic connectors on Mumbai Line 3 and Line 2B.
  - Preserved owner decisions: Bhopal official reference length 6.22 km retained (variance investigated without forcing geometry distortion) and Gurugram Rapid Metro loop exempted from terminal checks.
- **M10.2 City-by-City Defect Repairs**:
  - **Delhi (Finding F-02 Closed)**: Constructed continuous 19.16 km, 71-coordinate alignment for Golden Line (`del-golden-seg-01`) connecting Delhi Aerocity (`[77.12124, 28.54799]`) to Tughlakabad (`[77.29924, 28.50236]`) from surveyed OSM ways 538930435 and Phase 4 station coordinates. Reconciled 3 orphan future stations: aliased `del-aerocity` to operational `Delhi Aerocity` interchange; scoped out detached construction node `del-domestic-airport` in favor of operational `Terminal 1 IGI Airport`; snapped `del-andrews-ganj` to vertex `[77.232392, 28.562312]` on Golden Line branch. Delhi audit error count reached 0.
  - **Mumbai**: Snapped Eastern Express Highway station (`mum-eeh`) coordinates to `[72.887562, 19.056585]` directly on Line 4 centerline (&le; 1 m distance), clearing `station-far-from-nearest-segment`. Verified `D. N. Nagar` layout as `elevated` with MMRDA citations while preserving Line 1 association. Mumbai audit error count reached 0.
- **M10.3 Interchanges & Verification**:
  - Verified cross-network interchanges in `data/overrides/interchanges.json`: Sikanderpur (`int-sikanderpur` connecting Delhi Yellow and Gurugram Rapid Metro), Noida Sector 51/52 (`int-noida-sec51-52`), Mumbai WEH/Gundavali, and DN Nagar/Andheri West.
  - Verified 47 operational lines and 142/142 Playwright E2E tests passing.

### B. Tier 2 and Chennai Corridor Source Review (Oct 19)
Consolidates `reports/data-audit/2026-10-19-tier2-coverage-review.md`:
- Inventoried official projects and references across 16 networks: Agra (Phase 1 Corridors 1 & 2), Ahmedabad (Phase 2A Airport and Phase 3 tenders), Chennai (Phase II C3/C4/C5, keeping C3 coverage gap per owner decision), Gurugram (Millennium City Centre–Cyber City corridor tenders), Jaipur (Phase 2 North-South 41 km approved corridor), Kanpur (remaining C1 and C2 sections), Kochi (Phase II ongoing), Lucknow (Phase 1B approved), Navi Mumbai (Routes 2, 3, 4 scopes), Patna (Corridor 2 under construction), Pune (Phase 2 extensions), Surat (Corridor II extension to HSR station).
- Confirmed full existing reference representation for Bhopal, Nagpur, Noida, and Indore.

### C. Audit Blind-Spots & Walkthrough Findings Root-Cause Mapping (Oct 19 & Oct 27)
Consolidates `reports/data-audit/blind-spots-2026-10-19.md` and `reports/data-audit/blind-spots-2026-10-27.md`:
- Comprehensive root-cause mapping of walkthrough findings F-01 through F-22 from `docs/FINDINGS-2026-10-12.md`.
- Implemented and verified test fixture coverage for all 11 M8.1 audit rules in `__tests__/data-audit.test.ts`: `segment-parallel-duplicate`, `segment-hairpin`, `segment-sparse-vertices`, `city-km-vs-reference` (M10.1); `line-terminal-missing`, `reference-construction-stretch-missing`, `orphan-future-station` (M10.2); `future-segment-no-stations`, `cross-network-interchange`, `verified-without-official-source`, `operational-station-no-opened-on` (M10.3).
- Established central audit thresholds in `scripts/audit/audit-config.ts` with per-city override capabilities.


