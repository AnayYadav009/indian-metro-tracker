# Milestones v2 (M8 to M18, plus findings-driven additions)

M1 to M7 are in `docs/MILESTONES.MD`. This file continues from there.

Read before starting any milestone: `docs/BLUEPRINT.md`, `docs/DATA-STANDARDS.md`, `docs/DATA_AUDIT.md`, `docs/CITY_ONBOARDING.md`, `docs/FINDINGS-2026-10-12.md`, `docs/VISUAL_QA.md`, `.agents/rules/project.md`.

**Changelog**
- 2026-10-12: added M8.1, M10.1, M10.2, M10.3 and M13.1 and a backlog, from the walkthrough video review (`docs/FINDINGS-2026-10-12.md`). Amended the gate, M10 acceptance, M14, M15 and M18. Existing milestone text is otherwise unchanged. Statuses in the table below are the last known repo statuses (2026-10-10); confirm them at the start of the next session.

## Working rules (apply to every milestone)

1. One milestone at a time. Post a plan first and wait for approval before writing code.
2. Stop at every point marked **STOP** and wait for the owner.
3. Report lint, typecheck, unit tests and e2e results before saying "done".
4. No new dependency without asking. Currently avoided: chart libraries, Turf, image libraries.
5. Never invent real-world facts. Unknown values stay `null` and produce an audit warning.
6. Never hand-edit generated files in `data/`. Fix overrides or pipeline rules, then rebuild.
7. From M9 onward, e2e tests also run against the static export (`out/`), not only the dev server.
8. Findings in `docs/FINDINGS-2026-10-12.md` come from a screen recording. Treat each one as a lead: confirm it in the data or code first, then fix. Where a finding turns out to be correct geometry or data, record that in the PR and close the finding.

## Overview

| # | Milestone | Scope change | Status |
|---|---|---|---|
| M8 | Data audit and repair | Build `audit:data`, audit all existing cities, fix inconsistencies at the source | In progress: 0 errors; un-baselined warnings gate remains |
| M8.1 | Audit blind-spot closure | Explain the walkthrough misses and add the missing rules | In progress: all 11 rules have fixtures; root-cause review and live-data closure remain |
| M9 | Data foundation v2 | Additive schema changes, geo helpers, size budget, export e2e in CI | In progress: size budget baseline gate remains |
| M10 | Tier 1 completion | Onboard Chennai, Hyderabad, Kolkata (and any Tier 1 city M8 finds still mock or incomplete), one city per PR | In progress |
| M10.1 | Geometry cleanup | Twin-track merge, hairpin and chord fixes in the pipeline, km totals corrected | In progress: pipeline fixes exist, rules not implemented, Chennai Corridor 3 deleted, no VISUAL_QA |
| M10.2 | Per-city defect repair | Missing line sections, missing future corridors, missing stations, one city per PR | In progress (Delhi: Blue line extended, Golden line partial; Mumbai: Line 4 merged, chords removed; Bengaluru: Pink/Blue surveyed, 4 stations each; Kolkata: partial; Chennai/Hyderabad/Pune/Ahmedabad/Gurugram/Noida: partial repairs) |
| M10.3 | Metadata integrity | Cross-network interchanges, `last_verified` provenance, undated stations, coverage review | In progress |
| M11 | Report-an-error button | Prefilled GitHub issue from line and station panels | Complete |
| M12 | Interchange highlighting | Derived interchange clusters, distinct map marker, connecting-line chips | Complete |
| M13 | Timeline slider | Year scrubber using existing `inaugurated_on` and `opened_on` | Complete |
| M13.1 | UX hardening | Walkthrough UX issues, carry-over of the 10 Oct map fixes | In progress |
| M14 | Stats and comparison | Static `/compare/` page | Complete: merged in `c53574e`; 8 unit tests, 6 e2e tests |
| M15 | Tier 2 onboarding | Batches A to C, same runbook as Tier 1 | Complete: all 12 candidate cities onboarded |
| M16 | Nearest station | Client-side geolocation lookup | Complete: merged in `05ca6f3`; 8 unit tests, 6 e2e tests |
| M17 | City pages and SEO | `/city/[id]/` static pages, sitemap, metadata | Complete: merged in `2ef19d9`; 8 unit tests, 7 e2e tests |
| M18 | Route finder | Client-side graph search with transfers | Complete: merged into master; 42 unit tests, 7 e2e tests |

**Known regressions:**
- Chennai Corridor 3 (`che-corridor-3-seg-01`, 44.6 km under construction) was deleted in commit `4d41603` during geometry cleanup, dropping Chennai construction km from 74.9 km to 17.2 km.

**Gate:** M11 and later do not start until M10 is complete and every Tier 1 city has zero audit errors. (M11 to M13 were completed before the gate closed; no further milestone from M14 onward may start until M10, including M10.1 to M10.3, is complete.)

Tier 1 = Delhi, Bengaluru, Mumbai, Chennai, Kolkata, Hyderabad.

**Recommended order from here:** finish M8 and M9 gates, then M8.1, M10.1, M10.2 (city by city), M10.3, close M10, then M13.1, then M14 onward. M8.1 comes before the repairs so the audit can prove each fix and catch regressions.

---

## M8: Data audit and repair

**Goal:** make the existing data trustworthy before anything is added to it.

**Steps**
1. **Build the audit tool (read-only).** `scripts/audit/consistency-report.ts`, run with `npm run audit:data`. Implements every check in `docs/DATA_AUDIT.md`. Writes `reports/data-audit/<date>.md` and `.json`. Extend `lib/geo.ts` with point-to-segment distance. Unit tests with small fixtures, one per check.
2. **Run it on current data. Do not change any data.** Report, per city: whether data is real or mock, counts of lines, segments and stations, and every finding by severity.
3. **STOP.** Owner reviews the baseline report and adds the inconsistencies they have noticed by hand.
4. **Ground-truth files.** For each existing real city, create `data/reference/<city>.json` from official sources (format in `docs/DATA_AUDIT.md`). Every value carries a source URL and a retrieval date. Show the files to the owner before using them.
5. **Investigate and fix these suspected causes in the pipeline.** Confirm each in the code first, then fix with a test:
   - Segment `operator` appears to come from the city rather than the line, which would mislabel multi-operator cities (for example Delhi NCR, Mumbai). Segments should inherit the line's operator.
   - `stations_count` falls back to a default of 10 when no value is provided. Replace with the real count of deduplicated stations assigned to the segment, or fail the build.
   - `last_verified` is set from a hardcoded date for OSM-sourced records. Introduce `retrieved_at` (machine fetch date, from the raw cache) and keep `last_verified` for human or agent verification against an official source only.
   - Station-to-segment proximity looks at vertices only. Use point-to-segment distance.
   - Remove `maps.mail.ru` from the Overpass mirror list.
   - Phase labels: apply the convention in `docs/DATA-STANDARDS.md` and migrate.
6. **Repair data in the overrides files**, rebuild with the pipeline, re-run the audit. Every changed value has a source URL in `references`.
7. **Final report** and `data/audit-baseline.json` (accepted warnings, each with a one-line reason).

**Acceptance**
- `audit:data` reports zero errors for all existing cities.
- Each remaining warning is fixed or listed in the baseline with a reason.
- Counts per line and per city match the reference files within the tolerances in `DATA_AUDIT.md`.
- 10 randomly chosen stations per city are manually compared against the operator's official map and the result is listed in the report.
- `npm run lint`, `typecheck`, `test`, `validate:data` all pass.
- **Added 2026-10-12:** no baselined warning may hide a missing line end, a missing terminal or a line with no stations (see M8.1). If the current baseline does, those entries are removed and the finding is carried into M8.1.

**Out of scope:** new cities, new features, UI changes.

---

## M8.1: Audit blind-spot closure

**Goal:** the walkthrough video (`docs/FINDINGS-2026-10-12.md`) shows defects that a passing or near-passing audit should have caught: a truncated Blue Line, a missing Golden Line, doubled twin-track geometry, hairpins, orphan future stations. Find out why the audit missed each one, then close the gaps. No data is repaired in this milestone.

**Steps**
1. Read `docs/FINDINGS-2026-10-12.md`.
2. **Root-cause table (read-only).** For every finding F-01 to F-22 name the existing audit rule that should have caught it and why it did not. Possible reasons: rule missing, threshold too loose, rule only checks vertices or only operational records, reference file missing or `confidence: unverified` (downgraded to warn), reference counts wrong or incomplete (for example a branched line with only two terminals listed), warning baselined, rule exempted. Also list every entry in `data/audit-baseline.json` and the exemption lists that masks a real defect. Output `reports/data-audit/blind-spots-<date>.md`.
3. **STOP.** Owner reviews the root-cause table.
4. **Add or strengthen rules**, each with a failing fixture shaped like the real defect and a passing fixture (table below).
5. **Fail-closed pending rules.** Pending rules remain listed in `data/audit-baseline.json`, appear with their severity, and keep `audit:data` failing while findings remain. Remove a rule from `pending_rules` only after its target milestone repairs pass; do not use a report-only CI override.
6. Re-run the audit on current data and report new findings per city per rule. Do not baseline them. Do not fix data.
7. Update `docs/DATA_AUDIT.md` (text in `docs/DOC-PATCHES.md`).

| Rule id | Check | Severity | Enforced in |
|---|---|---|---|
| `segment-parallel-duplicate` | Two traces of the same line run within about 60 m of each other for more than about 300 m (twin tracks). The existing duplicate-geometry rule needs overlap and misses offset tracks. | error | M10.1 |
| `segment-hairpin` | A turn sharper than about 150 degrees within about 300 m (a spike that doubles back), including spikes that do not self-intersect. | error | M10.1 |
| `segment-sparse-vertices` | A leg longer than about 1 km in a segment not marked `schematic` (straight chord across a curve). | warn | M10.1 |
| `city-km-vs-reference` | City operational km differs from the reference by more than 10 percent (existing 3 percent warn stays). Each line counted once. | error | M10.1 |
| `line-terminal-missing` | Every terminal in the reference, including every branch terminal of a branched line, must have a station within about 300 m of a segment end of that line. Reference files must list all branch terminals. | error | M10.2 |
| `reference-construction-stretch-missing` | Every `construction[]` stretch in the reference needs a data segment with the matching status whose ends are within about 300 m of the stretch ends. | error | M10.2 |
| `orphan-future-station` | Construction or planned stations must also pass the orphan and 75 m checks (confirm in step 2 whether they are currently skipped). | error | M10.2 |
| `future-segment-no-stations` | Construction or planned segment with no stations, unless flagged `stations_not_published` in overrides with a reference. | warn | M10.3 |
| `cross-network-interchange` | Stations of different cities or networks within about 250 m, or with the same normalized name, must share an `interchange_id` or be listed in `data/overrides/interchanges.json`. | error | M10.3 |
| `verified-without-official-source` | `last_verified` set on a record whose only references are OSM or none. Plus a unit test that the pipeline never writes `last_verified`. | error | M10.3 |
| `operational-station-no-opened-on` | Operational station with null `opened_on`. | warn | M10.3 |

**Acceptance**
- Root-cause table delivered and approved.
- Every rule has a failing and a passing fixture; thresholds are constants in one place and tunable per city in overrides.
- The audit run lists at least one finding for each of F-01 to F-22 that is a data defect, or the report explains why not.
- Audit findings remain visible and blocking until repaired or individually source-reviewed; do not blanket-accept pending findings.
- `lint`, `typecheck`, `test`, `validate:data` pass.

**Out of scope:** data repair, UI changes, new cities.

---

## M9: Data foundation v2

**Goal:** one small additive schema bump and shared tooling, so later milestones do not each need a migration.

**Scope**
- Schema (all additive, migration script included, validator updated):
  - City: `tier` (1 or 2), optional `network_id`.
  - Segment: optional `official_length_km`.
  - Station: optional `segment_id`.
  - All records: `retrieved_at`.
- `lib/geo.ts`: nearest point on polyline, line slice between two points, haversine helper exports, all unit-tested.
- `lib/site-config.ts`: repository URL, site URL, one source of truth.
- Data size: truncate coordinates to 5 decimals in the pipeline output, measure gzip size of data and initial JS, and record a baseline. Lazy per-city loading is built only if the owner and the agent agree after measuring, because `getMetroData()` is synchronous today and many components depend on it.
- CI: second job that builds the static export, serves `out/` with `scripts/serve.mjs`, and runs the e2e smoke tests with the GitHub Pages base path set. Add a mobile viewport project to Playwright.
- Audit gets a "ratchet": new warnings beyond `data/audit-baseline.json` fail CI.

**Acceptance:** existing tests pass on dev and export, data changes are additive only, size baseline is recorded in the PR description.

---

## M10: Tier 1 completion

**Goal:** all six Tier 1 cities are real, audited and verified.

**Order:** any Tier 1 city that M8 found to be mock or incomplete, then Chennai, then Hyderabad, then Kolkata. Simpler systems first so the runbook is hardened before the hardest city.

**For each city, follow `docs/CITY_ONBOARDING.md` exactly.** One city per PR.

1. Reference file first (official sources), then **STOP** for owner review.
2. Overrides file, fetch, build, dedupe review.
3. `validate:data` and `audit:data` with zero errors.
4. Visual QA at three zoom levels plus filter checks.
5. **STOP** for owner review before merging.

**Tier 1 gate acceptance**
- `DATA_SOURCE` is real and no record has `source: "mock"`.
- Each city's line and station counts match its reference file within tolerance.
- Operators are correct per line.
- Mock banner is not shown anywhere.
- Deployed export loads all six cities and the filters work on mobile.
- **Added 2026-10-12:** M10.1, M10.2 and M10.3 are complete, and the `docs/VISUAL_QA.md` checklist is attached to the PR of every Tier 1 city and passes.

---

## M10.1: Geometry cleanup (pipeline)

**Goal:** lines render as single clean centrelines and km totals count each line once.

**Scope**
- **Twin-track merge.** Where OSM supplies one way per direction for the same line, the pipeline collapses them into one centreline (midline or a chosen track, decided in the plan and documented in `docs/DATA-STANDARDS.md`). Lengths come from the centreline. Unit test with a fixture of two tracks about 20 m apart.
- **Hairpin removal.** Remove backtracking spurs under the `segment-hairpin` threshold unless listed as intentional in overrides (loop lines, terminal reversing). Unit test with a spike fixture.
- **Chord and sparse-vertex fixes.** Densify from OSM where the data exists, otherwise override coordinates with references; mark the result `geometry_quality: schematic` when it is not surveyed.
- **Known cases to resolve (confirm each is a data artefact first):** Pune Line 1 twin traces, Pune Line 2 chord and west-end hook, Pune Line 3 hook near Mhalunge, Mumbai Line 4 twin dashed traces, Delhi Pink Line north-east hairpin and bulge, Delhi Magenta hook near Kalindi Kunj (may be genuine), Hyderabad Blue Line west-end hook, Bengaluru Purple Line zig-zag near Whitefield.
- Recompute km totals. Report before and after per city; Pune is expected to drop sharply. Switch `segment-parallel-duplicate`, `segment-hairpin`, `segment-sparse-vertices` and `city-km-vs-reference` to enforcing.

**Steps:** plan, **STOP**, implement one rule per PR with its test, rebuild all cities, before/after report, **STOP** for owner review before merge.

**Acceptance:** the listed cases look correct at three zoom levels on desktop and mobile; header totals change by the reported amounts; audit has zero findings for the four enforced rules; `lint`, `typecheck`, `test`, `validate:data`, `audit:data` pass; e2e on dev server and static export.

**Out of scope:** adding missing stations or lines (M10.2), UI.

---

## M10.2: Per-city defect repair

**Goal:** every Tier 1 city, plus the Tier 2 and NCR cities already in the dataset, has complete line extents, the future corridors it should have, and stations on every line.

**Rules:** one city per PR. Reference file updated first (include every branch terminal and every `construction[]` stretch), then **STOP** for owner review, then overrides and rebuild. Every added value has a URL in `references`. Follow `docs/VISUAL_QA.md` before asking for merge. Switch `line-terminal-missing`, `reference-construction-stretch-missing` and `orphan-future-station` to enforcing once all cities pass.

**Order and scope**
1. **Delhi.**
   - Blue Line east section: first check whether the pipeline clips to the city bounding box or the Overpass area (hypothesis H-1 in the findings doc), then restore the section from Botanical Garden to Noida Electronic City and confirm the Vaishali branch. Stations on this stretch belong to the DMRC Blue Line; the Aqua Line stays under Noida.
   - Golden Line (renamed from Silver, keep `del-silver` aliases): full Tughlakabad to Aerocity corridor as under construction, with stations if officially published, otherwise schematic with `stations_not_published`.
   - Carry-over from the 10 Oct list: missing stations on red, violet and blue lines; north ends of yellow and pink; planned lines and stations not showing.
   - Reconcile Delhi totals (335.1 km open, 44.6 km under construction, 3.6 km planned at last check) with the reference file.
2. **Mumbai.** Line 4 stations and geometry; orphan hollow stations around Worli, Mahim and Bandra (attach to their line or remove with a note); identify and fix the dashed light-blue chords between Andheri and Dadar; verify every line's status, station count and opening against the reference.
3. **Pune.** Line 3 stations and the western end; Line 1 and Line 2 geometry (from M10.1); operational km against the reference.
4. **Bengaluru.** Pink Line: segment name versus drawn extent (Kalena Agrahara to Nagawara) and both sections; Blue Line stations or an honest "not published" state; planned western Purple extension stations; Whitefield zig-zag (M10.1).
5. **Kolkata.** Yellow Line extension stations (shows 1); Orange Line; Esplanade and other undated stations (M10.3).
6. **Chennai.** Corridor 3 and Corridor 4 stations (both show 0); check whether a single `inaugurated_on` on the 31.5 km Blue Line segment loses opening stages and split by stage if the reference lists several.
7. **Hyderabad, Ahmedabad.** Hyderabad Blue west end; Ahmedabad purple stub without stations; confirm there is nothing sanctioned missing (see M10.3 coverage review).
8. **Gurugram, Noida, Navi Mumbai.** Link Gurugram and Noida interchanges with Delhi (M10.3); verify Navi Mumbai construction and planned lines.

**Acceptance (per city):** zero audit errors including the new rules; every finding assigned to that city in `docs/FINDINGS-2026-10-12.md` is fixed or closed with a reason; `docs/VISUAL_QA.md` checklist attached; 10 random stations compared by hand again if more than 20 stations were added.

**Out of scope:** UI, new cities.

---

## M10.3: Metadata integrity and cross-network links

**Goal:** panels and the timeline tell the truth about what is known and what is not.

**Scope**
- **Cross-network interchanges.** Sikanderpur exists as `del-sikanderpur` (Yellow Line, not marked interchange) and `gur-sikanderpur` (Rapid Metro, marked interchange, lists only Rapid Metro). **STOP for an owner decision** on the model: (a) shared `interchange_id` across city records, or (b) one station record with `line_ids` across networks. The plan recommends (a) because M12 already introduced `interchange_id`, and it keeps `network_id` boundaries for M18. Apply to all Delhi, Gurugram and Noida (Blue/Aqua, Yellow/Rapid Metro) links and to any other cross-network pair the rule finds.
- **`last_verified` provenance.** For every record with `last_verified` but only OSM or no references (for example OSM-sourced stations showing "Verified 2026-10-08"), either add an official source and keep the date, or clear the date and keep `retrieved_at`. Add the pipeline test that it never writes `last_verified`.
- **Undated stations.** Backfill `opened_on` from reference openings where the stage-to-station mapping is unambiguous; otherwise leave `null` and baseline with a reason. **Owner decision (STOP):** pull `ordered_station_ids` forward from M18, since it also enables line-end checks and unambiguous stage mapping.
- **Future segments.** Honest `stations_count` for construction and planned segments; `stations_not_published` flag in overrides with a reference where the operator has not published stations.
- **Coverage review.** Hyderabad (0 planned), Ahmedabad (0 under construction despite Phase 2A and 2B labels), Navi Mumbai (0 and 0), Pune extensions: confirm against official sources what is sanctioned or under construction. Add only what has an official source; otherwise record "none found, checked on <date>" in the reference file.
- Switch `future-segment-no-stations`, `cross-network-interchange`, `verified-without-official-source` and `operational-station-no-opened-on` to enforcing (undated stations may stay baselined with reasons).

**Acceptance:** each owner decision recorded in `docs/DATA-STANDARDS.md`; four rules enforcing; panels for Sikanderpur show both networks; no OSM-only record carries `last_verified`; `lint`, `typecheck`, `test`, `validate:data`, `audit:data` pass.

**Out of scope:** UI wording (M13.1).

---

## M11: Report-an-error button

- "Report an issue" button in line and station panels. Opens `https://github.com/<owner>/<repo>/issues/new` with template, labels, and a prefilled body: feature type, id, name, city, `retrieved_at`, `last_verified`, displayed values, map permalink.
- `.github/ISSUE_TEMPLATE/data-correction.yml` with a required "source link" field.
- `docs/DATA_CONTRIBUTING.md`: how to correct data through the overrides file.
- Keep the generated URL under about 6 KB; handle special characters.
- Nothing is sent anywhere until the user clicks.
- Tests: URL builder unit tests (encoding, length), e2e for both panels.

---

## M12: Interchange highlighting

- Derive interchange clusters in the pipeline by extending the existing dedupe logic and `interchangeStationNames`. Add `interchange_id` to stations (additive migration).
- Manual corrections in `data/overrides/interchanges.json` (merge or split a cluster).
- Map: distinct marker (larger, white-filled ring) so it does not depend on colour.
- Station panel: "Interchange: connects Line A, Line B" with clickable chips that select the line. No walking-time claims unless an override provides a sourced one.
- Tests: two stations on the same line never merge; false-merge and split fixtures; audit rule `is_interchange` agrees with cluster membership.

---

## M13: Timeline slider

- Uses existing fields: segment `inaugurated_on`, station `opened_on`. No new date fields.
- Year slider (earliest opening year to current year), play/pause, "include future" toggle for construction and planned, URL param `?year=`, keyboard control and `aria-valuetext`.
- Filtering through a MapLibre layer filter combined with existing filters, so updates stay under 100 ms and sources are never re-created.
- Operational records with no date are listed as "undated" in the UI. Dates are never guessed.
- Optional: a small km-operational-over-time chart in inline SVG.
- Tests: boundary years, undated handling, filter combination.

---

## M13.1: UX hardening (from the walkthrough)

**Goal:** fix the interface issues seen in the recording, and close the carry-over from the 10 Oct review. Data problems are not fixed here (see M10.x).

**Steps**
1. **Triage first.** Confirm which of the five 10 Oct fixes are done: (1) station legend matches the interchange marker, (2) stations on red, violet and blue lines (data, now M10.2 Delhi), (3) yellow and pink north-end loops (geometry, now M10.1), (4) planned lines and Golden Line naming (data, now M10.2 Delhi), (5) toggle to hide stations. Only items 1 and 5 are UI work and stay here; verify they work.
2. **National zoom.** At "All Cities" zoom the networks are almost invisible. Minimum line width and city markers or labels below a zoom threshold; thresholds live in `lib/map-config.ts`.
3. **City switching.** No blank grey frames while flying between cities: fit to city bounds with padding for the open panels, cap the animation duration, and show a short loading state if tiles are not ready.
4. **Panel overlap.** The metadata panel must not cover the selected feature (map padding on desktop); on mobile the filter panel collapses after a city is chosen.
5. **Labels and copy.** "1 station" not "1 stations"; "Opened On: N/A" becomes "Date not recorded"; "0 stations" on future segments becomes "Stations not yet published"; blank "Verified:" becomes "Not verified (OSM data)"; long segment titles wrap or show a tooltip instead of truncating; interchange chips show the status of the connected line (for example "Red Line (Corridor 5), under construction").

**Constraints:** no new dependency, no `localStorage`, filter updates stay under 100 ms, e2e includes a mobile viewport and runs on the static export.

**Acceptance:** unit tests for pluralisation and label mapping; e2e that the metadata panel does not intersect the selected feature on desktop and mobile; e2e that switching to each city renders its features within a set time; `lint`, `typecheck`, `test` pass.

**Out of scope:** data changes.

---

## M14: Stats and comparison

- **Status**: Complete. Merged in commit `c53574e`. Tests: 8 unit tests (`__tests__/compare-stats.test.ts`), 6 e2e tests (`e2e/compare.spec.ts`).
- Static `/compare/` page. Table per city: operational, construction and planned km, stations, lines, interchanges, first-opened year. Sortable.
- Bars drawn in plain SVG or CSS, no chart library.
- Km values come from `length_km`. If `official_length_km` exists, show a data-quality flag when they differ by more than the audit tolerance.
- Test that totals equal the map's network stats and that parallel per-direction geometry is not double counted.
- **Added 2026-10-12:** do not start until M10.1 has removed twin-track double counting (Pune showed 48.1 km operational against roughly 34 km expected). Show a data-quality flag when computed city km differs from the reference by more than 3 percent.

---

## M15: Tier 2 onboarding

- Batches of 3 to 4 cities, one PR per city, same runbook as Tier 1.
- Candidate list to be researched and confirmed in the batch plan, not assumed: Pune, Ahmedabad, Kochi, Jaipur, Lucknow, Nagpur, Kanpur, Agra, Bhopal, Indore, Patna, Surat. Navi Mumbai and Delhi NCR neighbours need a decision on whether they are separate cities or part of a `network_id`.
- A city qualifies only if a metro is operational, under construction, or an officially sanctioned project; this is verified from official sources in the reference file.
- Re-measure data size before each batch and apply the M9 budget.
- Smaller cities have thin OSM coverage of construction and planned lines, so override coordinates are expected, each with references and `last_verified`.
- **Added 2026-10-12:** the Tier 2 and NCR cities already in the dataset (Pune, Ahmedabad, Navi Mumbai, Noida, Gurugram) are subject to M10.2 before their M15 acceptance. Every new city passes `docs/VISUAL_QA.md` and the M8.1 rules from the start.

**Batch 1 (Complete):**
- **Indore** (Complete): Yellow Line (Line 3 ring loop, 16 op stations, 17.0 km op, 4 segments). Passed `validate:data`, `audit:data` and visual QA.
- **Bhopal** (Complete): Orange Line (Line 2: 8 op, 8 const) & Blue Line (Line 5: 14 const), Pul Bogda interchange. Passed `validate:data`, `audit:data` and visual QA.
- **Nagpur** (Complete): Orange Line (Line 1: 18 op stations, 18.96 km) & Aqua Line (Line 2: 20 op stations, 17.44 km), Sitabuldi interchange. Passed `validate:data`, `audit:data` and visual QA.
- **Surat** (Complete): Red Line (Phase 1: 21 stations, 21.61 km, under construction) & Green Line (Phase 1: 18 stations, 18.74 km, under construction), Majura Gate interchange. Passed `validate:data`, `audit:data` and visual QA.

**Batch 2 (Complete):**
- **Kochi** (Complete): Line 1 Blue Line (25 op stations, 27.95 km op, 1 segment). Passed `validate:data`, `audit:data` and visual QA.
- **Lucknow** (Complete): Red Line North-South Corridor (21 op stations, 23.386 km op, 1 segment). Passed `validate:data`, `audit:data` and visual QA.
- **Kanpur** (Complete): Orange Line Corridor 1 (14 op stations, 14.643 km op, 1 segment). Passed `validate:data`, `audit:data` and visual QA.

**Batch 3 (Complete):**
- **Agra** (Complete): Yellow Line Priority Corridor (6 op stations, 4.957 km op, 1 segment). Passed `validate:data`, `audit:data` and visual QA.
- **Jaipur** (Complete): Pink Line Phase 1A + 1B (11 op stations, 10.91 km op, 1 segment). Passed `validate:data`, `audit:data` and visual QA.
- **Patna** (Complete): Blue Line Priority Corridor (5 op stations, 5.283 km op, 1 segment). Passed `validate:data`, `audit:data` and visual QA.

---

## M16: Nearest station

- **Status**: Complete. Merged in commit `05ca6f3`. Tests: 8 unit tests (`__tests__/nearest-station.test.ts`), 6 e2e tests (`e2e/nearest-station.spec.ts`).
- MapLibre `GeolocateControl` for the position dot (no new dependency).
- Haversine over operational stations in memory; top 3 to 5 with straight-line distance (labelled as such), lines served, interchange flag.
- Location is never stored or sent anywhere.
- Handle permission denied, unavailable GPS, and nothing within a threshold distance. Fallback: tap the map to choose a point.
- Tests: distance and sorting unit tests, e2e with mocked geolocation.

---

## M17: City pages and SEO

- **Status**: Complete. Merged in commit `2ef19d9`. Tests: 8 unit tests (`__tests__/city-seo.test.ts`), 7 e2e tests (`e2e/city-pages.spec.ts`).
- `/city/[id]/` via `generateStaticParams` from `cities.json`. A new city needs no code change.
- Static text (stats, lines, opening years) plus the map focused on the city. The URL is the single source of truth, no clash with `useUrlSync`.
- `generateMetadata` per city, canonical URLs from `NEXT_PUBLIC_SITE_URL`, `sitemap.ts` and `robots.ts` marked force-static.
- One shared social image. Per-city images need an image dependency and require owner approval.
- Tests: every city page exists in `out/`, links work under the GitHub Pages base path.

---

## M18: Route finder

- **Status**: Complete. Merged into master. Tests: 42 unit tests (`__tests__/route-finder.test.ts`), 7 e2e tests (`e2e/route-finder.spec.ts`).
- Prerequisite data: `ordered_station_ids` per line (from OSM route-relation order, geometry projection as fallback). Additive migration, audited. May be pulled forward into M10.3 if the owner decides so there.
- Graph: nodes are stations; edges join adjacent stops (weight = distance divided by an assumed average speed); interchange edges carry a transfer penalty. Both constants are visibly labelled as estimates. Graphs are limited to a `network_id`. Cross-network interchanges from M10.3 are the only edges allowed to join networks, and only if the owner approves that in the plan.
- Dijkstra with a small hand-written heap, "fastest" and "fewest transfers".
- UI: from and to search boxes, swap, step-by-step legs, route highlight on the map using `lib/geo.ts` line slice, `?from=&to=` URL params.
- No fares and no live timings. Always show an "estimated" note.
- Tests: fixture network, symmetry, disconnected networks return "no route", under 200 ms on the largest network.

---

## Backlog (unscheduled)

Ideas that fit the hard constraints (static, free, no new dependency unless approved). None starts without an owner decision and a slot in the order above.

- Station search with fly-to from the search box.
- "Opening soon" view: construction lines sorted by expected completion.
- Per-city GeoJSON or CSV download.
- Data freshness badge per city and line, with an "unverified" flag.
- Other rail modes (RRTS, monorail, suburban) as an optional layer, if in scope.
- Light and dark basemap toggle.
- Hindi labels or station names.
- PWA and offline use of the static export.
- Embeddable map view.
- Inline-SVG growth chart of km over time (optional part of M13).


- M18.9 Planning and doc prep (docs only)
- M19 Provenance layer
- M20 Report-an-error button
- M21 Fare and timing data model (Tier 1): schema, validator, calculator, Delhi (`del-fare-dmrc`), Hyderabad (`hyd-fare-ltmrhl`), and M21e-1 station-count basis implemented. Owner approved on 2026-10-28 retaining those bases and leaving matrix-only tariffs unpriced. Tier 1 coverage remains partial (verified fares in 2/6 cities; 0 timing records); see `docs/PLAN-PUBLIC-USABILITY.md`.
- M22 UI design brief: owner-approved recommendations Q1–Q10 recorded 2026-10-28; see `docs/DESIGN-BRIEF-M22.md`.
- M23 UI shell implementation
- M24 Route finder v2
- M25 Nearest station and interchange highlighting
- M26 Acceptance pass

Details: `docs/PLAN-PUBLIC-USABILITY.md`
