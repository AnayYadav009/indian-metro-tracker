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

## Public-usability plan: owner decisions (2026-10-24)

Recorded decisions. See `docs/PLAN-PUBLIC-USABILITY.md` for milestones M19-M26.

1. Fare and timing data covers Tier 1 cities first.
2. Where a city's fares are not officially sourced, the fare feature is hidden entirely for that city. No "not available" placeholder and no estimates.
3. M8, M8.1, M9 and M10.x (data quality) run in parallel with the new plan.
4. Data rules unchanged: no unsourced data; every interchange link needs a specific source; mock data while testing; real data only when usable.
5. Agents must not claim verification they did not perform and must report real test counts.

Explicitly skipped for now: live train tracking and real-time arrivals (no free public feeds; a wrong "live" claim is worse than none).

### New open items

- Tier 1 definition: confirm the exact city list from the M10 Tier 1 visual QA work before M21 starts. Do not guess.
- Fare and timing sources: for each Tier 1 city, identify the operator's official fare and first/last train publication. Cities without one get the fare feature hidden.
- Provenance backfill (M19 implemented): All 21 cities and 58 lines currently default to `unverified` status with `source_url: null` and `last_verified: null`. No real-world values were invented. Official operator URLs and verification dates will be progressively sourced starting in M21 (Tier 1 fare and timing data).
- M22 design brief requires owner sign-off before M23 starts.
- Golden Line (renamed from Silver): Alignment geometry exists in `data/segments.geojson` (`del-golden-seg-01` construction, `del-golden-branch-01` planned) with 4 stations in `data/stations.geojson` and line entry in `data/lines.json`. Closed in M10.2 (F-02). Note: earlier note stating "not yet onboarded" was obsolete.
- Live site: GitHub Pages deploy failed with 404 on 2026-10-17. Treated as a prerequisite for the public plan. Recheck and record the real HTTP status.
- M19 observed baseline: 341 unit tests pass (up from 328), 150 e2e tests pass (up from 142), 28 static build pages, `validate:data` passes (0 errors), `audit:data` exit 1 (0 enforced errors, 2 pending-rule errors, 21 unbaselined warnings, 14 coverage gaps).
- Pipeline regeneration verification (M19.4): `npm run pipeline:build` runs `build-real-data.ts`. When run offline against cached `data/raw`, it regenerates identical data facts. Generated data is not committed as part of audit verification. Array ordering in `data/cities.json` and `data/lines.json` was restored to exact master order in M19.4.
- M19 Provenance audit and test artifacts in `reports/`: `audit:data` and visual QA tests generate/touch tracked files under `reports/` (e.g. `reports/data-audit/*.png`), which must be reverted with `git checkout -- reports/` after running to keep git working trees clean.
- Interchange records lacking official source (4 total in `data/overrides/interchanges.json` forming 2 cross-network pairs):
  1. `del-sikanderpur` <-> `gur-sikanderpur` (Delhi Metro Yellow Line <-> Gurugram Rapid Metro)
  2. `del-noida-sector-52` <-> `noi-noida-sector-51` (Delhi Metro Blue Line <-> Noida Metro Aqua Line dedicated walkway)
  Sourced entries exist for Mumbai and Hyderabad, but these two Delhi-Gurugram and Delhi-Noida cross-network links lack specific official URLs.
- Feature-level vs line-level provenance juxtaposition: Stations and segments already display feature-level source metadata (`Feature source: osm/mock`, `Feature data date: <date>` or `Feature data date: Unrecorded (OSM data)`). The M19 line/city provenance footer renders right below it. Where a station has verified coordinates (e.g. `Feature data date: 2026-10-08`) but its line has unverified commercial details (e.g. `Unverified`, `Not verified`), users see both in the same panel. Owner decision needed on whether to merge these into a single unified provenance section or retain distinct feature geometry vs network operational provenance.
- Sourcing inventory counts (M19 baseline):
  - Lines per `source` tag value (Total 58 lines across 21 cities):
    - Overall: `osm+dmrc` (9), `osm+mmrda` (7), `osm+gmrc` (6), `osm+bmrcl` (5), `osm+mtp` (4), `osm+upmrc` (3), `osm+mpmrcl` (3), `cmrl` (3), `osm+ltmrhl` (3), `osm+cmrl` (2), `osm+mahametro` (2), `osm+maha_metro` (2), `dmrc+news` (1), `osm+rmgl` (1), `osm+jmrc` (1), `osm+kmrl` (1), `osm+kmrc` (1), `osm+cidco` (1), `osm+nmrc` (1), `osm+pmrc` (1), `osm+pmrda` (1).
    - Tier 1 cities (34 lines): Delhi (10: 9 `osm+dmrc`, 1 `dmrc+news`), Mumbai (7: `osm+mmrda`), Bengaluru (5: `osm+bmrcl`), Chennai (5: 3 `cmrl`, 2 `osm+cmrl`), Kolkata (5: 4 `osm+mtp`, 1 `osm+kmrc`), Hyderabad (3: `osm+ltmrhl`).
  - Segments with non-empty `references` array:
    - Total: 62 of 77 segments
    - Tier 1: 34 segments (Delhi: 7, Mumbai: 8, Bengaluru: 4, Chennai: 4, Kolkata: 7, Hyderabad: 4)
  - Stations with non-null `last_verified`:
    - Total: 495 of 915 stations
    - Tier 1: 205 stations (Delhi: 41, Mumbai: 38, Bengaluru: 5, Chennai: 41, Kolkata: 23, Hyderabad: 57)
- M20 Route state URL limitation: Active route origin, destination, and calculated routes are managed in the client Zustand store and are not currently synchronized to browser URL parameters. In accordance with milestone rule i, route issue reports prefill with the city page URL (`/city/[id]`). Deep linking for specific route queries can be introduced in a future routing milestone to supply direct route permalinks.
- M20 Issue template structure: GitHub Issue Forms (`data-correction.yml`) receive the markdown diagnostics via `?body=` into the `body` field (`Prefilled Feature Diagnostics`). All four contexts (Station, Segment, Route, City) share the single official issue template without requiring new templates or schema alterations.
- M19.3 Audit — Station source vs last_verified semantic conflict: 495 of 915 stations have a non-null `last_verified` date and non-empty `references` array, but retain `source: "osm"`. `docs/DATA-STANDARDS.md:61` states: "OSM-only records carry retrieved_at only." No validation or audit rule currently enforces this conflict. Owner decision needed on whether to update station `source` to reflect the cited operator/news sources (e.g., `osm+operator` or `manual`) or formalize a separate geometry source vs attribute verification standard.
- M19.3 Audit — Interchange primaryLine arbitrary selection: Resolved in M19.4. Station detail footer displays the weakest provenance status among connected lines (`unverified < schematic < verified`) labelled as "Lines" (or "Line" for single line), and the GitHub issue reporting body lists every connected line's individual provenance.
- M19.3 Audit — User-visible "official" claims in UI: `components/city/city-data-notice.tsx:37` displays "Official Length Variance" when computed km diverges from reference km by > 3%, and `components/panels/provenance-footer.tsx:111` displays "No official source link" for unverified records.
- M19.3 Audit — Tier 1 line count reconciliation: `data/lines.json` contains exactly 35 lines across Tier 1 cities (Delhi: 10, Mumbai: 7, Bengaluru: 5, Chennai: 5, Kolkata: 5, Hyderabad: 3). The earlier mention of 34 lines in M19.2 documentation was an undercount of 1 line.

### M19.4 Verification & Audit Gap Findings (2026-10-24)

- **Compare-Page Text Verification (Step 3)**:
  - Grep across `app/`, `components/`, `lib/` confirms the sentence *"Data is aggregated from OpenStreetMap and official operator records"* does **NOT** exist in code or in the rendered DOM of `/compare`.
  - The rendered `/compare` route contains no footer element; the only data attribution in code exists on individual city pages (`app/city/[id]/page.tsx:267`: *"Data verified from transit agency publications and OpenStreetMap vectors. Free and open data under ODbL."*) and OSM copyright tags in `lib/map-config.ts`.
- **`last_verified` Distribution & Reference URL Analysis (Step 4)**:
  - **Stations with `last_verified` (495 total)**:
    - Distinct verification dates: `2026-10-08`: 270, `2026-10-15`: 132, `2026-10-16`: 82, `2026-08-31`: 6, `2026-10-13`: 3, `2026-10-10`: 2.
    - Tier 1 dates: Delhi (41: 39 on `2026-10-08`, 1 on `2026-10-13`, 1 on `2026-10-10`), Mumbai (38: 32 on `2026-10-08`, 6 on `2026-08-31`), Bengaluru (5: all 5 on `2026-10-08`), Chennai (41: all 41 on `2026-10-08`), Kolkata (23: 21 on `2026-10-08`, 2 on `2026-10-13`), Hyderabad (57: all 57 on `2026-10-08`).
    - Distinct reference URLs: 28 unique URLs. 361 station records point to a root/bare homepage URL (path empty or `/`).
    - Top 10 most-shared URLs: `https://hmrl.co.in` (57), `https://ltmetro.com` (57), `https://chennaimetrorail.org` (41), `https://upmetrorail.com` (41), `https://www.delhimetrorail.com/network_map` (39), `https://www.metrorailnagpur.com` (37), `https://www.gujaratmetrorail.com` (36), `https://mmrda.maharashtra.gov.in` (30), `https://www.punemetrorail.org` (29), `https://kochimetro.org` (25).
    - Hostname categorization (allowlist: `operator`, `government`, `news`, `blog`, `other`):
      - `operator`: 345 stations (`chennaimetrorail.org`, `delhimetrorail.com`, `www.delhimetrorail.com`, `english.bmrc.co.in`, `hmrl.co.in`, `ltmetro.com`, `kochimetro.org`, `mmrcl.com`, `www.metrorailnagpur.com`, `www.mpmetrorail.com`, `www.nmrcnoida.com`, `www.punemetrorail.org`, `upmetrorail.com`, `patnametrorail.com`, `www.gujaratmetrorail.com`).
      - `government`: 72 stations (`mmrda.maharashtra.gov.in`, `mtp.indianrailways.gov.in`, `pmrda.gov.in`, `transport.rajasthan.gov.in`).
      - `news`: 42 stations (`www.thehindu.com`).
      - `blog`: 35 stations (`themetrorailguy.com`).
      - `other`: 0 stations (`www.openstreetmap.org`).
      - `mixed`: 1 station (references span multiple categories).
      - Unmapped hostnames: 0. Total = 495.
  - **Segments with `last_verified` (34 total)**:
    - Distinct verification dates: `2026-10-15`: 11, `2026-10-08`: 6, `2026-10-16`: 6, `2026-10-13`: 3, `2026-10-10`: 3, `2026-10-06`: 2, `2026-08-31`: 1, `2026-10-07`: 1, `2026-10-17`: 1.
    - Tier 1 dates: Delhi (3: 2 on `2026-10-10`, 1 on `2026-10-17`), Mumbai (7: 3 on `2026-10-08`, 1 on `2026-08-31`, 1 on `2026-10-06`, 1 on `2026-10-10`, 1 on `2026-10-13`), Bengaluru (3: 2 on `2026-10-13`, 1 on `2026-10-06`), Hyderabad (1: on `2026-10-07`), Chennai (0), Kolkata (0).
    - Hostname categorization:
      - `operator`: 14 segments
      - `government`: 4 segments
      - `news`: 2 segments
      - `blog`: 2 segments
      - `other`: 0 segments
      - `mixed`: 12 segments
      - Unmapped hostnames: 0. Total = 34.
- **Golden Line Status Verification (Step 5)**:
  - `data/lines.json` entry: `id: "del-golden"`, `name: "Golden Line"`, `city: "Delhi"`, `city_id: "delhi"`, `color: "#B8860B"`, `operator: "DMRC"`, `source: "dmrc+news"`, `aliases: ["Silver Line", "Gold Line"]`, `provenance: { "status": "unverified" }`.
  - Segments in `data/segments.geojson`:
    - `del-golden-seg-01`: status `"construction"`, phase `"IV"`, 3 stations, LineString with 71 coordinate vertices.
    - `del-golden-branch-01`: status `"planned"`, phase `"IV"`, 1 station, LineString with 55 coordinate vertices.
  - Stations in `data/stations.geojson`: 4 stations (`del-delhi-aerocity`, `del-tughlakabad`, `del-saket`, `del-andrews-ganj`).
  - Geometry exists: **Yes** (both segments carry full continuous LineString geometry).
  - Obsolete documentation: The note in `docs/PARKED-ISSUES.md:175` stating "not yet onboarded" was identified and corrected; F-02 was closed in M10.2.

### M21a Open Items & Findings (2026-10-24)

- **Overclaiming UI Text (Item a)**: `app/compare/page.tsx:357` ("All figures computed from verified geospatial vectors") and `lib/city-seo.ts:17` and `:24` ("verified geospatial data") overclaim verification while every city and line in the dataset currently carries `unverified` provenance. Needs rewording in a future pass.
- **Routing Status Terminology Collision (Item b)**: `components/routing/route-finder-panel.tsx:308` and `lib/routing/city-guard.ts` use "verified lines" to denote topological routing verification, which collides with the provenance data status "verified". Rename to "routable lines" or "lines passing topology checks" in M24.
- **Station Verification Threshold Label (Item c)**: `app/city/[id]/page.tsx:220` displays the label `"≥80% stations verified"`. Reword to remove "verified" (e.g. `"≥80% stations with recorded dates"`).
- **Pipeline Trailing Newline Convention (Item d)**: `build-real-data.ts` atomically writes `data/cities.json` and `data/lines.json` without a trailing newline, while git-committed files expect one, dirtying files on every run. A repository-wide formatting convention should be enforced.
- **Flaky E2E Test Candidate (Item e)**: `e2e/m13-1-ux.spec.ts:128` ("switches to every city and renders its network") timed out once under heavy parallel load during M19.4. Passed cleanly on standalone run and subsequent full runs.
- **Station `last_verified` Distribution (Item f)**: 495 stations carry `last_verified` across 6 distinct dates (270 on `2026-10-08`, 132 on `2026-10-15`, 82 on `2026-10-16`), 28 distinct reference URLs, and 361 point to bare homepages (empty or `/` path). Treated as unproven; the neutral feature date label stays. Sourcing cleanup to be determined after Tier 1 review.
- **Pipeline Skipped Segments (Item g)**: Pipeline logs show `che-corridor-3-seg-01` and `kol-pink-seg-01` skipped with "no valid coordinates". Confirmed as expected (Chennai Corridor 3 is already parked; Kolkata Pink has no coordinate geometry in OSM).
- **Cross-Network Interchanges Without Source (Item h)**: 4 interchange records in `data/overrides/interchanges.json` lack an official reference URL (`del-sikanderpur` <-> `gur-sikanderpur`, `del-noida-sector-52` <-> `noi-noida-sector-51`). Parked for M25.
- **Live Site & Static Export CI (Item i)**: Live GitHub Pages site returned 404 on 2026-10-17 and M9 (CI static export validation) is pending. Proceeding with offline validation by owner decision.
- **Typecheck Baseline & `lastVerifiedFormatted` Usage (Item j)**:
  - `npm run typecheck` passes with exit code 0 after adding `provenance: { status: "unverified" }` to mock test fixtures (`compare-stats.test.ts`, `issue-url.test.ts`, `pipeline-merge-validation.test.ts`, `report-issue-button.test.tsx`, `route-finder.test.ts`).
  - `lastVerifiedFormatted` from `lib/data.ts:208` is computed in `getDatasetMetadataSummary()` and formatted as part of `badgeLabel` (`Data: <Month Year> (<Sources>)`). It is rendered at `app/page.tsx:192` (`<span data-testid="data-last-updated">{metadataSummary.badgeLabel}</span>` in map bottom-right bar) and at `app/compare/page.tsx:157` (`{metadataSummary.badgeLabel}` in header badge).
- **Next Step: Milestone M21b (Real Tier 1 Fare and Timing Data)**:
  - Load real fares and service hours for Tier 1 cities (`delhi`, `mumbai`, `bengaluru`, `chennai`, `kolkata`, `hyderabad`).
  - Rule: each city is sourced separately from official operator publications with specific non-root URLs (`source_url`) and verified dates (`last_verified`, `effective_from`).
  - Unverified cities remain with empty fare rules (fare feature hidden for that city entirely).
  - No synthetic estimates, no placeholders, no unverified records marked "verified".

### M21b Delhi Fare and Timing Sourcing Findings (2026-10-24)

1. **Excluded Lines and Reasons**:
   - `del-golden`: Excluded from `del-fare-dmrc`. Entirely under construction and planned (`del-golden-seg-01` construction, `del-golden-branch-01` planned); 0 operational segments open to public service.
   - `del-airport` (Airport Express Line): Excluded from standard DMRC distance-band FareRule. DMRC publishes an origin-destination station-to-station fare matrix (`https://delhimetrorail.com/fare-for-airport-express-line`) with fares ranging from Rs 11 to Rs 75 between pairs, rather than distance bands. Per project rules, we do not force non-band published structures into distance bands, and load nothing for this line group pending owner decision on station-to-station fare modeling.
2. **Band-Edge Ambiguities & Published Wording**:
   - The published DMRC fare table lists bands as `0-2`, `2-5`, `5-12`, `12-21`, `21-32`, and `More than 32` (`32 से अधिक` in Hindi).
   - In our schema, bands are modeled as half-open intervals `[min_km, max_km)`. The published numbers are retained without modification (`0-2`, `2-5`, `5-12`, `12-21`, `21-32`, `32-null`).
   - Wording is documented in `del-fare-dmrc.provenance.note`.
3. **Excluded Discount Products**:
   - Sunday and National Holiday discounted fares (e.g. Rs 11 for 0-5 km, Rs 21 for 5-12 km, Rs 32 for 12-21 km, Rs 43 for 21-32 km, Rs 54 for >32 km).
   - Smart card discounts (10% standard discount, additional 10% off-peak discount during non-peak hours 06:00-08:00, 12:00-17:00, 21:00-close).
   - Tourist card unlimited travel passes (1-day Rs 200, 3-day Rs 500).
   - Trip cards on Airport Express (10-trip and 30-trip discounted cards).
   - Rapid Metro flat Rs 20 single token fare.
   - All excluded per base single-journey Monday-Saturday fare scope.
4. **Timings Not Loaded**:
   - DMRC does not publish static first/last train timetables for line terminals. The official website only provides an interactive search form (`#first-and-last` modal) that queries station pairs dynamically.
   - Because official static terminal service hours cannot be read reliably without ambiguous scraping of interactive form permutations, 0 ServiceHours records were loaded (`data/timings.json` remains `[]`).
5. **Allowlist Host Review**:
   - All pages fetched (`https://delhimetrorail.com/fare`, `https://delhimetrorail.com/fare-for-airport-express-line`) reside on `delhimetrorail.com`, which is already on the allowlist in `lib/official-source-hosts.ts`.
   - No new host required addition.
6. **Missing Effective Date and Unverified Status (Superseded by M21c)**:
   - In M21b, `del-fare-dmrc` was loaded as `unverified` because the official page lacked an `effective_from` date.
   - In M21c, under Owner Decision A, `effective_from` was made optional for verified FareRules when the official page states none, provided a non-empty explanatory note is given. With complete evidence re-capture (DOM hash, API hash, scripted verification), `del-fare-dmrc` is now `verified`.

---

## M21c Parked Issues: Fares, Timings, and Caveats (Delhi Re-capture)

1. **Sunday and Holiday Fares Not Modeled**:
   - DMRC publishes a discounted tariff schedule for Sundays and National Holidays (Rs 11 for 0–5 km, Rs 21 for 5–12 km, Rs 32 for 12–21 km, Rs 43 for 21–32 km, Rs 54 for >32 km).
   - The data model maintains a strict one-rule-per-line constraint; Sunday and holiday fares are NOT modeled as active calculation rules.
   - Per data standards, `day_scope` is recorded as `"mon_sat"`. Any future UI must explicitly label estimated fares with their day scope so users understand the quote applies to Monday through Saturday travel only.
2. **Band-Edge Ambiguity**:
   - The official publication labels distance bands as `"0-2"`, `"2-5"`, `"5-12"`, `"12-21"`, `"21-32"`, `"More than 32"`.
   - The text does not define whether the boundary values (e.g. exactly 2.0 km or 5.0 km) belong to the upper or lower band.
   - The engine models bands as closed-open `[min_km, max_km)` with `near_boundary` detection when route distance falls within 0.5 km of an edge, providing an alternative fare hint.
3. **del-pink Phase 4 Caveat**:
   - `del-pink` is included in `del-fare-dmrc` as DMRC operates the entire Pink Line under unified fare rules.
   - However, the Phase 4 extension alignment carries open geometric uncertainty. Distance-derived fare estimates on routes involving those stations are less reliable than surveyed operational segments.
4. **Airport Express Origin-Destination Matrix (7 Stations)**:
   - Airport Express uses an origin-destination matrix between 7 stations (New Delhi, Shivaji Stadium, Dhaula Kuan, Delhi Aerocity, IGI Airport, Dwarka Sec 21, Yashobhoomi Dwarka Sector 25) with fares from Rs 11 to Rs 75.
   - Distance bands cannot represent this matrix. Parked as a future model candidate if station-to-station pricing tables are introduced.
5. **DMRC Timings Not Loadable**:
   - DMRC first/last train timings are available only via dynamic frontend queries on the `#first-and-last` modal.
   - There are no static terminal timetables published by DMRC that can be reliably captured as fixed data records. Service hours for Delhi remain empty.
6. **Staleness Rule for Old last_verified Fares (M26)**:
   - Operators revise fares infrequently, but pages can change or fares can increase without URL changes.
   - In Milestone M26, an audit rule should be designed to flag `last_verified` dates older than an agreed threshold (e.g. 1 year or 2 years) to require recurring provenance re-checks.

---

## M22 Parked Issues: UI Inventory Findings

1. **Station Search Placeholder Misrepresentation**:
   - `components/filters/filter-panel.tsx` features an input with placeholder `"Search lines, phases, stations..."` (`filter-search-input`).
   - However, in `lib/filter-utils.ts` (`matchesSegmentFilter`), the query only checks `[props.line_name, props.city, props.phase, ...lineAliases]`.
   - Stations are completely unindexed by this filter. Users searching for a station receive zero matching segments and an empty map. A dedicated, working station search index must be introduced in M23.

2. **Mobile Panel Overlap and Map Occlusion**:
   - On Pixel 7 mobile viewport (412×915 px), selecting a station causes the `MetadataPanel` (`top: 168px`, height: 671px) to overlap the collapsed `FilterPanel` (`top: 72px`, height: 59px).
   - Together, the two panels consume 730px of vertical space (80% of the viewport), occluding the map canvas and pushing the timeline slider off-screen.
   - Replacing stacked panels with a unified 3-state bottom sheet is required in M23.

3. **Sprawling City Selection Chips**:
   - The filter panel currently renders 22 city chips ("All Cities" + 21 cities) which consume over 300px of vertical scrolling height on mobile devices.
   - This pushes operational status checkboxes and phase filters below the fold. A searchable combobox/picker is needed in M23.

4. **Header Markup Duplication Across Pages**:
   - `app/page.tsx`, `app/compare/page.tsx`, and `app/city/[id]/page.tsx` each maintain separate, custom `<header>` implementations with diverging navigation styles, differing back links, and duplicate metadata badges.
   - Must be unified into a single shared `AppHeader` component in M23.1.

5. **Inaccurate Verification Claims in User-Facing Copy**:
   - The dataset metadata badge renders `"Data: Oct 2026 (MANUAL, OSM)"` or `"Data: Oct 2026 (DMRC, BMRCL, OSM)"`, creating an impression that all lines from those agencies are verified.
   - `app/compare/page.tsx` references `"comprehensive verified geospatial statistics"` and `lib/city-seo.ts` claims `"verified track alignments"`, while `app/city/[id]/page.tsx` displays `"≥80% stations verified"` (meaning opened).
   - `components/routing/route-finder-panel.tsx` uses `"verified lines"` to mean graph connectivity validation.
   - All these claims must be cleaned up in M23 to adhere strictly to the project rule forbidding unsubstantiated verification claims.

---

## M22.1 Parked Issues: Measured Accessibility, Search, and Copy Discrepancies

1. **Station Search Indexing Mismatch & Interim Fix**:
   - The search input inside `components/filters/filter-panel.tsx` promises station search via placeholder `"Search lines, phases, stations..."`.
   - `lib/filter-utils.ts:138` filters only line names, cities, phases, and aliases. Stations are never searched or returned.
   - In M23.1, an interim fix must adjust the placeholder to `"Search lines, phases..."` until M23.5 builds the client-side station search index against `data/stations.geojson` and overrides aliases.

2. **Header, Mode, and Chip Touch Targets Under 44 px**:
   - Playwright Part 1a DOM measurement revealed that **64 out of 65** visible interactive elements on Pixel 7 mobile (and **62 of 66** on desktop) fail the standard WCAG / Android touch-target minimum of 44 × 44 px.
   - Specifically:
     - All 22 city chips are `height: 24px` (`width: 169.5px`).
     - Header mode buttons (`find-route-btn`, `find-nearest-btn`, `city-directory-btn`, `nav-to-compare`) are `38 × 26 px`.
     - Filter panel collapse button is `24 × 24 px`.
     - Timeline controls range from `16px` to `28px` in height.
   - M23 shell redesign must pad all primary mobile targets to at least 44 × 44 px.

3. **Accessible Name Evaluation on Mobile**:
   - Part 1a verified that while 0 elements have a strictly empty name under fallback evaluation, mobile navigation buttons (`find-route-btn`, `find-nearest-btn`, `city-directory-btn`) hide their text labels (`hidden sm:inline`) and rely solely on `title`.
   - On touchscreen devices without hover states, `title` does not expose tooltips. Explicit `aria-label` attributes must be added to all icon-only buttons.

4. **Arbitrary City Array Ordering**:
   - Currently, the 22 city chips render in raw `data/cities.json` array order (Gurugram 1st, Navi Mumbai 2nd, ..., Delhi 11th, Patna 22nd) with verbose operator legal names.
   - M23 must introduce structured ordering (Tier 1 major networks by ridership/size first, followed by alphabetical for Tier 2) with public-facing transit branding.

5. **Data Badge Placement and Copy**:
   - The dataset last-updated badge (`data-last-updated`) is rendered at `app/page.tsx:192` within the bottom-right container, not in the top header as previously logged.
   - The badge text `"Data: Oct 2026 (MANUAL, OSM)"` suggests dataset-wide verification. In M23, it must be simplified to `"Data updated: Oct 2026"` with an accessible click disclosure listing specific sources.

---

## M22.2 Parked Issues: Inventory Reconciliations, Layout Occlusion, and City Ordering

1. **Control Counts and Crawlable Nav Reconciliation**:
   - The interactive element audit previously counted 66 desktop elements with 65 failing < 44 px, while the summary cited 62.
   - Re-running the measurement with explicit classification revealed that 21 elements are `<a>` tags inside `[data-testid="crawlable-city-directory"]` (`h-[1px]`, `overflow: hidden`, for search engine crawlers only) and 1 is the MapLibre `<canvas>` background.
   - Excluding visually hidden crawler links and the map canvas isolates exactly **43 visible-to-user controls** on first load on both Desktop and Pixel 7.
   - On Desktop (1280x800), **39 of 43 (90.7%)** visible controls fail the 44 px minimum in either width or height.
   - On Pixel 7 (412x915), **42 of 43 (97.7%)** visible controls fail < 44 px.

2. **Pixel 7 Viewport Height (915 px) and Panel Occlusion**:
   - Using the exact Pixel 7 viewport height (915 px), on first load the expanded Filter Panel covers **44.7%** (`top: 72px`, `height: 409px`), while the Timeline Slider covers **7.2%** (`top: 770px`, `height: 66px`).
   - With a station selected (`/?city=delhi&selected=station:del-kashmere-gate`), the fixed Metadata Panel covers **75.6%** (`top: 223px`, `height: 692px`).
   - `document.elementFromPoint` testing confirms that when a station is selected, the Metadata Panel visually occludes the Timeline Slider, Map Legend, Data Badge, and Attribution. The Timeline Slider remains mounted in the DOM (`z-30` vs `z-40`), but is 100% covered by the metadata panel.

3. **Journey Steps and Routing Fare Status**:
   - Route calculation in today's UI produces 8 total actions (5 clicks + 1 select + 2 typing) or 6 inputs.
   - Raw `innerText` of `[data-testid="route-results-container"]` displays `"Minimises time, then transfers, then stops • Fares not included"`. Real fare rules (verified for Delhi in M21c) are not wired to the routing UI yet; UI integration is scheduled for M24.
   - Verified that the report-an-error button testid is `report-issue-button` (linking to GitHub data correction template).

4. **Tier 1 City Scope and City Ordering**:
   - Clarified that `TIER_1_CITY_IDS` in `lib/compare-stats.ts` and `docs/MILESTONES-v2.md` strictly comprises 6 cities: Delhi, Mumbai, Bengaluru, Chennai, Kolkata, Hyderabad.
   - Neither Ahmedabad nor Pune is in Tier 1. They are placed in Tier 2 (alphabetical). City combobox ordering will list the 6 Tier 1 networks first, followed by alphabetical for the remaining 15 Tier 2 cities, marked as an owner decision.

5. **Dataset Retrieval Date Wording**:
   - The data badge proposal is updated to reflect the machine dataset fetch date (`retrieved_at: "2026-10-16"`): proposed wording is `"Data retrieved: Oct 2026"` or `"Data: Oct 2026"`, with a popover disclosure identifying OpenStreetMap (ODbL) and public operator information.

---

## M23.0 Parked Issues: E2E Test Decoupling & In-Browser Evaluates

1. **In-Browser DOM Query Evaluations in `e2e/m13-1-ux.spec.ts`**:
   - `e2e/m13-1-ux.spec.ts` performs geometric bounding-box overlap checks inside `page.evaluate()` and `page.waitForFunction()` (`document.querySelector('[data-testid="metadata-panel"]')` and `document.querySelector('[data-testid="map-container"]')`) to ensure that selected stations and segments are panned away from floating details panels.
   - These in-browser evaluate scripts execute inside the Chromium JavaScript context rather than through Playwright Locator handles.
   - Additionally, `m13-1-ux.spec.ts` reads the `data-testid` attribute off chip elements to filter out `"city-select-all"` and collect city IDs dynamically.
   - These 9 evaluate references are explicitly allowlisted in `e2e/layout-drift-allowlist.json` and documented so the drift guard (`__tests__/e2e-layout-drift-guard.test.ts`) verifies that all Playwright locator code outside this spec uses `e2e/helpers.ts`. When M23 redesigns the details panel into a bottom sheet, the evaluate bounding-rect functions will be updated to test against the bottom sheet drawer.

2. **Flaky E2E Test Under Heavy Parallel Load (`e2e/m13-1-ux.spec.ts:140`)**:
   - The test `"switches to every city and renders its network"` loops sequentially through all 21 cities and waits for MapLibre WebGL line layers to render.
   - When run in parallel across multiple workers on machines under load, this test can exceed default timeouts.
   - Retains a `test.setTimeout(120_000)` timeout override and should be kept in mind during CI runs.









