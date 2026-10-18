# Parked Issues and Deferred Decisions

This document logs all deferred issues, pending-rule findings, unreviewed warnings, and data integrity decisions for the Indian Metro Network Tracker. Per project rules, these items are parked and must not be resolved without explicit owner decisions.

---

## 1. Pending-Rule Errors

These two findings violate audit rules currently classified as `pending_rules` in `data/audit-baseline.json`. They are reported in audit summaries but run in report-only mode until official ground-truth reconciliation is completed.

| ID | City | Rule | Current Finding | Owner Decision Needed | Suggested Next Step | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **PRE-01** | **Bhopal** | `city-km-vs-reference` | Operational length variance of 10.2%: computed 5.58 km vs reference 6.22 km (threshold: 10%). | Decide authoritative operational length basis for Orange Line Priority Corridor (Subhash Nagar to AIIMS) or provide surveyed track alignment. | Re-verify MPMRCL commercial run documentation or update reference once full commercial operations begin. | **High** (blocks rule enforcement) |
| **PRE-02** | **Gurugram** | `line-terminal-missing` | Terminal station 'Cyber City' (`gur-rapid\|gur-cyber-city`) is 1904 m away from nearest segment end of line `gur-rapid` (threshold: 300 m). | Clarify Cyber City loop geometry / traversal cut or provide loop terminal endpoint convention. | Align loop terminal definition in pipeline or adjust traversal endpoint coordinates. | **High** (blocks rule enforcement) |

---

## 2. Tracked Coverage Gaps (15)

These stretches represent sanctioned, under-construction, or planned transit corridors where geometry or station positions are not yet available in OpenStreetMap or official CAD/GIS releases. They are tracked explicitly in `data/audit/coverage-gaps.json` to prevent false-precision errors.

| # | City | Line / Stretch | Official Classification | Current Ground-Truth Status | Owner Decision Needed | Suggested Next Step | Severity |
|---:| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| 1 | **Ahmedabad** | `ahm-violet` GIFT City – Shahpur (Phase 2B) | Planned / Tendered | GMRC tender issued; physical award unverified; alignment uncompiled. | Confirm whether tender award has occurred. | Check GMRC project notices before building schematic alignment. | Medium |
| 2 | **Chennai** | `che-corridor-3-seg-01` Madhavaram – SIPCOT 2 (44.6 km) | Under Construction | CMRL active civil construction; declared OSM relation inactive; SIPCOT 2 node missing. | Decide whether to compile schematic construction geometry or retain gap. | Retain as tracked gap until surveyed alignment is published. | **High** |
| 3 | **Kolkata** | `kol-yellow` Jai Hind (Airport) – Michael Nagar | Under Construction | PIB reports active work; Michael Nagar station node not in OSM cache. | Confirm station coordinate for Michael Nagar. | Source coordinate node from Metro Railway Kolkata. | Medium |
| 4 | **Kolkata** | `kol-yellow` New Barrackpore – Barasat (7.5 km) | Planned / Held Up | PIB reports work held up by land acquisition and encroachment issues. | Confirm long-term sanction status. | Retain gap entry until land clearance is achieved. | Low |
| 5 | **Kolkata** | `kol-pink-seg-01` Baranagar – Barrackpore (12.5 km) | Under Construction / Held Up | PIB reports work held up by utility shifting / defense NOCs. | Confirm whether to retain declared override without geometry. | Retain declaration in overrides with coverage-gap link. | Low |
| 6 | **Mumbai** | `mum-line-2b` Phase 2 (Chembur – DN Nagar) | Under Construction | MMRDA active construction; route geometry uncompiled. | Confirm whether surveyed alignment is available from MMRDA. | Add geometry when MMRDA publishes Phase 2 survey data. | Medium |
| 7 | **Noida** | `noi-aqua` Sector 142 – Botanical Garden (11.56 km) | Planned / Approved | NMRC approved branch; proposed OSM way excluded from operational data. | Confirm target DPR status and funding approval. | Retain as planned coverage gap until construction tenders are awarded. | Low |
| 8 | **Nagpur** | `nag-aqua` Reach 3A Lokmanya Nagar to Hingna | Under Construction | Maha Metro Phase 2 civil package awarded; geometry not in OSM. | Confirm terminal coordinates at Hingna Mount View. | Trace alignment from Maha Metro Phase 2 DPR maps. | Medium |
| 9 | **Nagpur** | `nag-aqua` Reach 4A Prajapati Nagar to Transport Nagar | Under Construction | Maha Metro Phase 2 civil package awarded; geometry not in OSM. | Confirm Transport Nagar terminal coordinates. | Trace alignment from Maha Metro Phase 2 DPR maps. | Medium |
| 10 | **Nagpur** | `nag-orange` Reach 2B Automotive Square to Kanhan River | Under Construction | Maha Metro Phase 2 civil package awarded; geometry not in OSM. | Confirm Kanhan River terminal coordinates. | Trace alignment from Maha Metro Phase 2 DPR maps. | Medium |
| 11 | **Nagpur** | `nag-orange` Reach 1A Khapri to Butibori MIDC ESR | Under Construction | Maha Metro Phase 2 civil package awarded; geometry not in OSM. | Confirm Butibori terminal coordinates. | Trace alignment from Maha Metro Phase 2 DPR maps. | Medium |
| 12 | **Pune** | `pun-purple` PCMC – Nigdi (Bhakti Shakti, 4.41 km) | Under Construction | Maha Metro Phase 1A northern extension under construction. | Confirm Nigdi terminal node in OSM. | Trace 4.41 km elevated corridor along NH-48. | Medium |
| 13 | **Pune** | `pun-purple` Range Hill station infill | Under Construction | Maha Metro infill station delayed by defense land clearance. | Confirm station status and planned opening date. | Retain gap until defense land transfer is resolved. | Low |
| 14 | **Pune** | `pun-purple` Swargate – Katraj (5.46 km) | Under Construction / Tendered | Maha Metro Phase 1B southern underground extension tendered. | Confirm Katraj underground alignment. | Await tunnel boring package alignment release. | Medium |
| 15 | **Delhi** | `del-pink` Phase 4 extension (Majlis Park – Maujpur, 12.3 km) | Under Construction | Elevated loop completion corridor (7 stations) completing the Ring Metro. | Verify current commissioning stage with DMRC. | Move to operational openings once officially inaugurated. | **High** |

---

## 3. Chennai Corridor 3: Schematic vs Coverage Gap Strategy

- **Context**: Chennai Metro Phase 2 Corridor 3 (Madhavaram to SIPCOT 2, 44.6 km) is actively under construction by CMRL. However, the OSM relation contains only inactive member ways and lacks terminal coordinates for SIPCOT 2.
- **Owner Decision Needed**: Decide whether to:
  1. Restore `che-corridor-3-seg-01` as a schematic construction segment using published DPR terminal coordinates; or
  2. Retain it in `data/audit/coverage-gaps.json` as an explicit coverage gap until CMRL or OSM contributors map the surveyed alignment.
- **Suggested Next Step**: Retain Option 2 (coverage gap) to preserve audit geometry standards (evidence-based `exact` vs `schematic`).
- **Severity**: **Medium**.

---

## 4. Delhi Pink Line: Reference Alignment and Phase 4 Extension

- **Context**: In `data/reference/delhi.json`, `del-pink` is recorded with `operational_stations: 38` and `operational_length_km: 58.43` (Phase 3 revenue service), while the full Ring Metro scope is 71.55 km with 45 stations (including the Phase 4 Majlis Park to Maujpur-Babarpur elevated extension).
- **Owner Decision Needed**:
  - Reconcile station nomenclature on the Phase 4 extension: earlier walkthrough notes suggested Majlis Park to Maujpur-Babarpur might be undergoing trial runs and identified 8 stations on the stretch (Burari, Jharoda Majra, Jagatpur Village, Soorghat, Khajuri Khas, Bhajanpura, Yamuna Vihar, and Maujpur interchange), while DMRC project releases cite "7 new stations" because Maujpur already exists on Line 7.
- **Suggested Next Step**: Monitor DMRC official press releases; when the corridor opens for passenger service, update `data/reference/delhi.json` openings and compile the new segment.
- **Severity**: **Medium**.

---

## 5. Undated Operational Stations (588 Stations with `null` `opened_on`)

- **Context**: 588 operational stations across the 8 primary cities lack an exact `opened_on` date in `stations.geojson`.
- **Owner Decision Needed**:
  - Decide whether to bulk-backfill station `opened_on` dates from known line opening packages where the mapping between opening stages and stations is unambiguous, or keep them `null` and baseline them with historical explanations.
- **Suggested Next Step**: Pull forward `ordered_station_ids` (planned for M18/M10.3) to allow unambiguous sequential mapping from line opening stages to stations.
- **Severity**: **Low** (informational, does not block routing or map rendering).

---

## 6. Audit-Rule Geometric Exemptions (3 Cases)

The audit engine (`scripts/audit/audit-engine.ts`) implements three hardcoded exemptions:
1. `del-blue-seg-01|del-blue-seg-02`: ~525 m overlap along the Yamuna Bank branch approach.
2. `del-green-seg-01|del-green-seg-02`: ~424 m overlap along the Ashok Park Main branch approach.
3. `gur-rapid-seg-01`: Self-intersection and loop-fold check for the Gurugram Rapid Metro loop chord.
- **Owner Decision Needed**: Formalize whether shared branch approaches at physical junctions should remain permanently exempted in the audit engine or if line segments should terminate strictly at the junction switch point.
- **Suggested Next Step**: Document the branch junction modeling rule in `docs/DATA-STANDARDS.md`.
- **Severity**: **Low**.

---

## 7. Milestone Audit Report Arithmetic & Table Discrepancies

- **Context**: The `reports/progress/2026-10-16-milestone-audit.md` report contained an arithmetic error in the in-progress subtotal:
  - The report stated that the in-progress subtotal was 6.0762.
  - The actual mathematical sum of the 8 in-progress milestone fractions ($4/6 + 4/5 + 4/5 + 4/6 + 4/5 + 9/14 + 3/5 + 2/4$) is **5.4762** ($0.6667 + 0.8 + 0.8 + 0.6667 + 0.8 + 0.6429 + 0.6 + 0.5 = 5.4762$).
  - Therefore, the true weighted progress on `master` prior to M13.1 was:
    $$\frac{11.0000 + 5.4762}{23} = \frac{16.4762}{23} = \mathbf{71.6\%} \quad (\text{not } 74.3\%)$$
  - With M13.1 merged into `master`, M13.1 moves to Done (12 complete milestones), so the sum becomes $12.0000 + 4.9762 = 16.9762 / 23 = \mathbf{73.8\%}$.
  - Additionally, the per-city table column totals for operational km (835.4 km sum vs headline 998.0 km) and station breakdown columns did not sum consistently.
- **Owner Decision Needed**: Acknowledge the corrected baseline arithmetic ($71.6\%$ pre-M13.1, $73.8\%$ post-M13.1).
- **Suggested Next Step**: Use the corrected formula and column sums in all future audit documents.
- **Severity**: **Low** (documentation accuracy).

---

## 8. Data Audit Exit Code vs 88 Unreviewed Warnings Discrepancy

- **Context**: Running `npm run audit:data` exits with code 1 despite zero enforced errors, because 18 unbaselined warnings remain (15 coverage gaps + 3 minor length deltas).
- **Owner Decision Needed**: Decide whether coverage-gap findings should be accepted in `data/audit-baseline.json` so that CI passes with exit code 0, or remain unbaselined warnings yielding exit code 1 until M10 signoff.
- **Suggested Next Step**: Add reviewed baseline entries for known coverage gaps or configure CI to use `AUDIT_WARNINGS=report-only`.
- **Severity**: **Medium** (affects automated CI pipelines).

---

## 9. Stale Baseline Entries (14)

- **Context**: `data/audit-baseline.json` contains 14 entries that no longer match any active warning or defect in the compiled dataset:
  - 7 accepted warnings (e.g., Delhi Pink station gap, Kolkata Yellow dates, Noida Aqua segment gaps).
  - 6 unreviewed warnings (e.g., Delhi Grey hooks, Chennai Corridor 5 hook).
  - 1 known defect (Defect F-06 hook on Pune Line 3, cleanly resolved in commit `f5e9a46`).
- **Owner Decision Needed**: Approve pruning stale entries from `data/audit-baseline.json`.
- **Suggested Next Step**: Prune stale entries during M10.2 per-city defect triage.
- **Severity**: **Low** (cleanliness).

---

## 10. M10 Tier 1 Visual QA Checklists

- **Context**: `docs/VISUAL_QA.md` requires completing visual inspection checklists across all 3 zoom levels and attaching screenshots for the 6 Tier 1 cities before M10 can be formally marked complete.
- **Owner Decision Needed**: Review and approve visual QA inspection packages for Delhi, Mumbai, Bengaluru, Chennai, Kolkata, and Hyderabad.
- **Suggested Next Step**: Execute visual walkthroughs, fill out `docs/VISUAL_QA.md` checklists, and archive reference screenshots in `reports/data-audit/screenshots/`.
- **Severity**: **Medium** (gating M10 completion).

---

## 11. Patna Operational Network and Routing Guard Reconciliation

- **Context & Data Reconciled**:
  - `data/lines.json`: Contains 1 line (`pat-blue`, "Blue Line (Corridor 2)", operator `PMRC`).
  - `data/reference/patna.json`: Declares 1 line (`pat-blue`) with status `operational`, 5 operational stations, 5.28 km operational length, and two staged openings: Priority Corridor Stage 1 (New ISBT – Bhootnath, 3 stations, `opened_on: 2025-10-06`) and Stage 2 (Bhootnath – Malahi Pakri, 2 stations, `opened_on: 2026-07-02`).
  - `data/stations.geojson`: Contains 5 operational stations on `pat-blue` (`New ISBT`, `Zero Mile`, `Bhootnath` opened `2025-10-06`; `Khemnichak`, `Malahi Pakri` opened `2026-07-02`).
  - `/city/patna/`: Displays 5.3 km operational across 1 line and 5 operational stations (opening years 2025 – 2026).
  - `/compare/`: Displays Patna as Tier 2 with 1 line, 5 stations, 5.3 operational km, and opened in 2025.
  - Inconsistency: The routing guard (`lib/routing/city-guard.ts` and `scripts/verify-routing.ts`) reported `"no operational lines to verify"` due to an early hardcoded guard condition, even though Patna's 1 operational line (`pat-blue`) and 5 stations are fully declared and consistent across all dataset files.
- **Decision**: Patna Metro routing enabled on Blue Line (`pat-blue`). It passed all topological and geometric checks (5 operational stations, 0 gaps > 5 km, max projection 12 m, terminals matched).
- **Status**: **Resolved** (routing enabled).

---

## 12. Station-Count Discrepancies Between Routing Table and Audit Summary Tables

- **Context**: The data audit CLI summary (`scripts/audit/consistency-report.ts`) counts *all* stations associated with a city (including under-construction, planned, and out-of-scope infill nodes), whereas the routing table (`scripts/verify-routing.ts` and `lib/routing/graph.ts`) strictly counts *operational* stations (`properties.status === "operational"`):
  - **Mumbai**: Audit summary reports 88 stations; routing table counts 77 operational stations (11 stations are under construction across Line 2B and Line 3 extensions).
  - **Ahmedabad**: Audit summary reports 54 stations; routing table counts 53 operational stations (1 station under construction / non-operational).
  - **Bengaluru**: Audit summary reports 87 stations; routing table counts 83 operational stations (4 stations under construction, e.g. Jayadeva Interchange u/c on Yellow/Pink).
  - **Delhi**: Audit summary reports 240 stations; routing table counts 231 operational stations (9 stations are under construction Phase 4 extensions or unverified infills).
- **Decision**: Maintain strict separation between dataset inventory counts (all stations in `stations.geojson`) and operational transit graph counts (only `status === "operational"` with verified track edges).
- **Suggested Next Step**: Add a subtitle or explanatory column in documentation/audit tables explicitly distinguishing "Total Stations Compiled" from "Operational Routable Stations".
- **Severity**: **Low** (clarification and documentation alignment).

---

## 13. BUG-01: Station Deduplication Geometry Calculation Inlines Haversine

- **File**: `scripts/audit/dedupe-report.ts`
- **Line(s)**: Lines 14–25 & 100–115
- **Description**: `dedupe-report.ts` duplicates its own incomplete Haversine distance formula locally instead of importing canonical `haversineDistanceM` from `lib/geo.ts`. Furthermore, its station parsing logic relies on raw node structure assumptions that diverge from the pipeline's normalized station representation in `scripts/pipeline/normalize.ts`.
- **Severity**: **Low** (audit/report tooling inconsistency).
- **Status**: **Open** (parked for subsequent audit refactor).

---

## 14. BUG-02: `useUrlSync` Hardcodes Year Lower Bound (1984)

- **File**: `hooks/use-url-sync.ts`
- **Line(s)**: Line 89
- **Description**: Verification check: `MIN_DATASET_YEAR` is defined in `lib/timeline-utils.ts` (`export const MIN_DATASET_YEAR = 1984;`). Inspection of `hooks/use-url-sync.ts` (lines 6 & 89) confirms that `MIN_DATASET_YEAR` was already imported and used (`if (!Number.isNaN(yr) && yr >= MIN_DATASET_YEAR)`), committed in `4398c75` ("chore(cleanup): centralize constants and eliminate magic values (Batch 2)"). There is no remaining hardcoded `1984` literal in `hooks/use-url-sync.ts`.
- **Severity**: **Informational** (audit verification).
- **Status**: **Resolved** (already fixed in `4398c75`).



