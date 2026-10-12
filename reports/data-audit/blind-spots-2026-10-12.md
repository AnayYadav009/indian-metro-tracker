# Root-Cause Analysis: Audit Blind Spots (2026-10-12)

**Milestone:** M8.1 (Audit blind-spot closure), Steps 1 to 3  
**Date:** 2026-10-12  
**Scope:** Read-only analysis of findings F-01 to F-22 from `docs/FINDINGS-2026-10-12.md` and hypothesis testing H-1 to H-5 against the pipeline code and data files. No rules or data files modified.

---

## 1. Findings Analysis (F-01 through F-22)

For each finding from `docs/FINDINGS-2026-10-12.md`:
1. Which existing audit rule should have caught it
2. Why it did not
3. Whether the finding is confirmed in data or correct as is

| Finding ID | City | Summary & Observation | Existing Rule That Should Have Caught It | Why Existing Audit Did Not Catch It | Confirmed in Data or Correct as Is |
|---|---|---|---|---|---|
| **F-01** | Delhi | Blue Line truncated at Botanical Garden; Noida stretch to Electronic City (~8 stations) missing | `reference-station-missing`, `ground-truth-length`, `ground-truth-station-count` | The existing audit checks ground truth only at the line level. While it caught missing terminal `Noida Electronic City` and length discrepancy, all three warnings were **baselined** into `known_defects` (targeting M10.2). Furthermore, `segment-end-far-from-station` only checked distance from any station of the line (which passed Botanical Garden), not that reference terminals must sit near segment endpoints. | **Confirmed defect in data**: `del-blue` segments stop at lon 77.346 (Golf Course/Botanical Garden); the 8 Noida stations to Electronic City are missing from segment geometry and stations. |
| **F-02** | Delhi | Golden Line (Line 10 / Aerocity–Tughlakabad) not drawn as a contiguous corridor | `reference-station-missing` / Ground truth construction checks | Ground truth checks in `audit-engine.ts` only checked operational lengths and operational stations against the reference file; the audit completely lacked any check comparing `construction[]` stretches in reference files against data segments. | **Confirmed defect in data**: Golden Line exists only as two isolated stubs (`del-golden-seg-01` 2.3 km and `del-golden-branch-01` 3.6 km), missing the central ~18 km priority section. |
| **F-03** | Delhi | Pink Line north-east end hairpin spike toward Shiv Vihar/Loni | `segment-self-intersecting` | `segment-self-intersecting` only checks whether polyline edges cross each other (2D segment intersection). Spikes where the track doubles back on itself along the exact same path or makes a >150° switchback without crossing do not trigger polygon self-intersection. | **Confirmed defect in data**: `del-pink-seg-01` contains switchback vertices near Shiv Vihar that double back within <300 m. |
| **F-04** | Delhi | Magenta Line U-hook near Kalindi Kunj | `segment-self-intersecting` / `polyline-hook` | Not caught because it is not an audit violation. | **Correct as is**: Physical track alignment approaching Kalindi Kunj depot and crossing the Yamuna River genuinely forms an expansive curve (~800 m turning radius), not a sharp spike. |
| **F-05** | Delhi & Gurugram | Sikanderpur exists as two unlinked records (`del-sikanderpur` and `gur-sikanderpur`) with conflicting interchange metadata | `duplicate-station-name`, `interchange-cluster-consistency` | Station deduplication and interchange consistency are strictly partitioned per `city_id`. Cross-city / cross-network proximity was never checked. | **Confirmed defect in data**: `del-sikanderpur` (Yellow Line, `is_interchange: false`, `opened_on: null`, `last_verified: null`) and `gur-sikanderpur` (Rapid Metro, `is_interchange: true`, `opened_on: 2013-11-14`, `last_verified: 2026-10-08`) sit 70 m apart with no linking `interchange_id`. |
| **F-06** | Pune | Line 3 hook near Mhalunge, ends abruptly, 0 stations | `segment-self-intersecting`, `stations-count-mismatch` | Sharp hook doubles back without crossing (bypassing `segment-self-intersecting`). Audit had no rule requiring construction segments to have stations. | **Confirmed defect in data**: `pun-line-3-seg-01` has only 1 station in active data and contains a sharp terminal hook. |
| **F-07** | Pune | Line 1 drawn as two parallel traces between PCMC and Civil Court (twin tracks) | `segment-overlap` | `segment-overlap` checks for overlapping coordinate polylines between two separate segment features within 15 m. In Pune Line 1, both tracks were ingested as a single continuous 26.5 km polyline in `pun-purple-seg-01` that runs north to PCMC and doubles back south to Swargate (~15–30 m apart), avoiding cross-segment overlap. | **Confirmed defect in data**: `pun-purple-seg-01` contains 181 vertices, doubling back from peak vertex 56 (PCMC, lat 18.629) down to Swargate (lat 18.499), creating side-by-side twin tracks. |
| **F-08** | Pune | Line 2 straight line cutting across curved station-following path near western end | `station-far-from-nearest-segment` | `station-far-from-nearest-segment` has a 75 m tolerance, and `pun-aqua-seg-01` was not marked `schematic`. The audit lacked a vertex-spacing rule for long straight chords. | **Confirmed defect in data**: Western section has long chord legs skipping track curvature between Vanaz and Anand Nagar. |
| **F-09** | Pune | Header shows 48.1 km operational vs ~34 km expected | `ground-truth-length` | Reference file comparison only emitted a `warn` when length differed by >3%, and was baselined in `audit-baseline.json`. | **Confirmed defect in data**: `pun-purple-seg-01` (26.5 km) + `pun-aqua-seg-01` (21.6 km) = 48.1 km due to twin-track double counting of Line 1 (actual route is ~17.5 km). |
| **F-10** | Mumbai | Line 4 drawn as two out-of-phase dashed traces (zig-zag) Wadala to Thane with missing stations | `segment-overlap`, `stations-count-mismatch` | Separate segments (`mum-line-4-seg-01`, `mum-line-4-schematic-01`, etc.) run parallel but offset by >20 m, bypassing `segment-overlap`. Station checks skipped construction segments. | **Confirmed defect in data**: Line 4 has 4 disjoint/parallel construction segments forming an out-of-phase ladder with only 15 stations along a 32 km corridor. |
| **F-11** | Mumbai | ~10 hollow orange stations around Worli/Mahim sit with thin connectors and no line geometry | `station-far-from-nearest-segment`, `station-orphan` | `station-orphan` only triggers if all of a station's lines have 0 segments. For Line 3, segments existed (`mum-line-3-schematic-01`), and stations were snapped to schematic connectors, bypassing orphan checks. | **Confirmed defect in data**: Hand-drawn schematic connector segments (`mum-line-3-schematic-01` and `mum-line-3-schematic-02`) connect stations across Bandra/Worli without true surveyed alignment. |
| **F-12** | Mumbai | Dashed light-blue straight chords between Andheri and Dadar | `segment-sparse-vertices` | The segments (`mum-line-3-schematic-01`) were marked `geometry_quality: schematic`, which explicitly exempted them from vertex density and overlap checks. | **Confirmed defect in data**: Line 3 construction schematic segments span straight chords between disconnected station clusters. |
| **F-13** | Bengaluru | Pink Line segment named Kalena Agrahara to Nagawara (7.7 km, 2 stns) drawn only as short stub | `ground-truth-length`, `ground-truth-station-count` | Existing ground truth rule only compared whole-line operational totals, not construction stretches. The segment name promised 21 km corridor, but geometry was only 7.7 km. | **Confirmed defect in data**: `blr-pink-seg-01` covers only 7.7 km and 2 stations of the 21.3 km Pink Line corridor. |
| **F-14** | Bengaluru | Blue Line (ORR & Airport, 41.3 km) straight-line schematic with 0 stations | `future-segment-no-stations`, `segment-sparse-vertices` | Audit did not have rules prohibiting 0-station construction segments or mandating `stations_not_published` overrides. | **Confirmed defect in data**: `blr-blue-seg-01` has length 41.3 km and `stations_count: 0`. |
| **F-15** | Bengaluru | Purple Line zig-zag near Whitefield | `segment-self-intersecting` | Polyline makes tight switchbacks approaching Kadugodi depot without intersecting itself. | **Confirmed defect in data**: `blr-purple-seg-01` has sharp switchback vertices near Whitefield terminal. |
| **F-16** | Hyderabad | Blue Line small western hook at Raidurg | `polyline-hook` / `segment-self-intersecting` | Hook is sub-threshold (<150 m terminal tail) and does not cross itself. | **Confirmed defect in data**: Minor terminal spur overshoot at Raidurg station end. |
| **F-17** | Several | Future segments with 0 stations: Chennai Corridor 4, Purple Line, Bengaluru Blue, Kolkata Purple ext, Delhi Red ext, Hyderabad Green ext | `stations-count-mismatch`, `future-segment-no-stations` | `stations-count-mismatch` only checked if `stations_count === nearbyCount`; when both were 0, it passed. Audit had no minimum station rule for future segments. | **Confirmed defect in data**: 7 future segments currently have 0 stations in data (`che-corridor-4-seg-01`, `che-corridor-3-seg-01`, `blr-blue-seg-01`, `mum-planned-seg-01`, `kol-purple-seg-02`, `del-red-seg-02`, `hyd-green-seg-02`). |
| **F-18** | Delhi, Kolkata, Chennai | Operational stations with Opened On N/A (undated) | `operational-station-no-opened-on` | Schema allowed `opened_on: null` for operational stations; audit engine had no check requiring opening dates on operational stations. | **Confirmed defect in data**: 588 operational stations across the dataset have `opened_on: null`. |
| **F-19** | Gurugram, Chennai | OSM-sourced stations show "Verified 2026-10-08" despite project rules | `verified-without-official-source` | Audit engine had no check verifying provenance of `last_verified` against references or source tags. | **Confirmed defect in data**: 266 OSM-sourced stations have `last_verified` populated with `2026-10-08` without official operator reference URLs. |
| **F-20** | Several | Possible coverage gaps (Hyderabad 0 planned, Ahmedabad 0 under construction, Navi Mumbai 0) | Reference self-check | Reference files accurately reflect approved construction/planned status as of compilation date; audit lacked a cross-check confirming absence of extensions. | **Partially correct as is**: Hyderabad Phase 2 and Navi Mumbai Line 1 extensions were not yet sanctioned at reference compilation date. Ahmedabad Phase 2 GIFT City spur was partially operationalized in Sept 2024. |
| **F-21** | Chennai | Blue Line single inauguration date (2016-09-21) loses 5 stages of opening history | `segment-date-consistency` | Data has 1 monolithic segment for 31.5 km Blue Line (`che-blue-seg-01`); audit allows 1 segment per line. | **Confirmed defect in data**: Reference file lists 5 distinct opening stages (2016 to 2022) with 32 stations, but data collapses them into a single 2016 segment. |
| **F-22** | Ahmedabad | Purple/Violet stub at Gandhinagar end has 0 stations | `future-segment-no-stations` | Walkthrough video perceived the GIFT City spur as 0 stations; in actual data `ahm-violet-seg-01` has 3 stations (`GNLU`, `PDEU`, `GIFT City`). | **Correct as is in data**: `ahm-violet-seg-01` is operational with 3 stations. The 3.33 km Phase 2B extension to Shahpur is sanctioned in reference but not yet drawn as a segment. |

---

## 2. Hypothesis Testing (H-1 to H-5)

### Hypothesis H-1
> *"The pipeline clips segments or stations to the city bounding box or to a Delhi-only Overpass area, which would explain F-01 at the NCR edge."*

- **Pipeline Investigation:**
  Inspected `scripts/pipeline/fetch-overpass.ts` (lines 26–65) and `data/overrides/delhi.json`.
  `fetch-overpass.ts` queries Overpass using `bbox: [76.84, 28.40, 77.35, 28.88]`.
  The eastern bounding box limit of Delhi is `77.35`.
  Noida Electronic City is located at longitude `77.372` (latitude `28.628`), which is **outside** `77.35`!
  Furthermore, `merge-overrides.ts` filters stations with `isPointInBbox(st.coordinates, city.bbox)`.
- **Verdict:** **TRUE**. The Delhi bounding box (`maxLng: 77.35`) clipped out the Noida extension of the DMRC Blue Line (which extends to `77.372`), directly causing defect F-01.

---

### Hypothesis H-2
> *"The audit did not catch F-01 because the Delhi reference file is missing, marked `confidence: unverified` (errors downgraded to warnings), lists only two terminals for the branched Blue Line, or the warning is baselined."*

- **Audit Investigation:**
  Checked `data/reference/delhi.json` and `data/audit-baseline.json`.
  1. `data/reference/delhi.json` **does** exist and lists 3 terminals: `["Dwarka Sector 21", "Noida Electronic City", "Vaishali"]`.
  2. The ground-truth rule `reference-station-missing` and `ground-truth-length` **did** trigger during the audit.
  3. However, all of these warnings were **baselined** into `known_defects` in `data/audit-baseline.json` under finding `F-01`:
     - `rule: "ground-truth-length"`, `subject: "del-blue"`, `note: "Computed length 55.68 km differs from 65.35 km reference"`
     - `rule: "reference-station-missing"`, `subject: "del-blue"`, `note: "Reference terminal Noida Electronic City missing in data"`
- **Verdict:** **TRUE**. The defect was detected as warnings by the audit engine, but was masked and prevented from failing CI because it was placed in `known_defects` in `data/audit-baseline.json`. Additionally, the audit lacked a hard `line-terminal-missing` error requiring terminals to be within 300 m of segment ends.

---

### Hypothesis H-3
> *"The existing duplicate-geometry rule requires overlap and misses offset twin tracks (F-07, F-10). The self-intersection rule misses spikes that double back without crossing (F-03)."*

- **Audit Investigation:**
  Checked `scripts/audit/audit-engine.ts` lines 916–968 (`segment-overlap`) and 987–1007 (`segment-self-intersecting`):
  1. `segment-overlap` samples points every 50 m and checks if point-to-polyline distance is `< cfg.overlapProximityM` (15 m). Twin tracks in Pune (Line 1) and Mumbai (Line 4) run 20 m to 40 m apart, and in Pune Line 1 both directions were collapsed into a single continuous 26.5 km polyline, which `segment-overlap` does not inspect (it only compares pairs of separate segments `segA` and `segB`).
  2. `segment-self-intersecting` uses 2D line segment intersection tests. If a polyline reaches a terminus and doubles back along a parallel path without intersecting any segment edge, the intersection test returns 0 intersections.
- **Verdict:** **TRUE**. The overlap heuristic missed offset twin tracks (>15 m separation and single-polyline twin tracks), and the self-intersection heuristic missed non-intersecting spikes and hairpin turns.

---

### Hypothesis H-4
> *"Orphan and proximity rules may skip construction and planned stations, which would explain F-11."*

- **Audit Investigation:**
  Checked `scripts/audit/audit-engine.ts` lines 755–805:
  1. The proximity checks (`station-far-from-nearest-segment` and `station-far-from-all-segments`) do run on all stations regardless of status.
  2. However, for Mumbai Line 3, placeholder connector segments (`mum-line-3-schematic-01` and `mum-line-3-schematic-02`) were added to the dataset with `geometry_quality: schematic`. Because segments existed for `mum-line-3`, `station-orphan` did not trigger.
  3. Furthermore, 11 station proximity warnings in Mumbai were placed in `unreviewed_warnings` in `data/audit-baseline.json`.
  4. The audit engine lacked a strict rule requiring construction/planned stations to lie within 75 m of actual physical (non-schematic) alignments.
- **Verdict:** **TRUE**. Construction stations bypassed orphan status via artificial schematic connector segments, and proximity warnings were baselined.

---

### Hypothesis H-5
> *"Golden Line was removed from lines.json on 2026-10-08 because it had no segments; it needs onboarding as a construction corridor, not a bug fix."*

- **Audit & Code Investigation:**
  Checked `data/lines.json` and git commit history:
  1. In `data/lines.json`, `del-golden` is currently present (`name: "Golden Line"`, `operator: "DMRC"`).
  2. In `data/segments.geojson`, there are only two short fragments: `del-golden-seg-01` (2.3 km near Aerocity) and `del-golden-branch-01` (3.6 km link). The remaining ~18 km priority corridor between Aerocity and Tughlakabad is missing.
  3. `data/reference/delhi.json` lists the full under-construction stretches for Phase 4 Golden Line.
- **Verdict:** **TRUE**. Golden Line was not fully onboarded with its complete surveyed corridor geometry; it needs onboarding as a complete under-construction corridor in M10.2.

---

## 3. Audit Baseline & Exemption List Masking

The following entries in `data/audit-baseline.json` currently mask real data defects from failing the build:

1. **`delhi` Blue Line (`del-blue`)**:
   - `ground-truth-length`: Masked by `known_defects` (F-01).
   - `ground-truth-station-count`: Masked by `known_defects` (F-01).
   - `reference-station-missing` (`Noida Electronic City`): Masked by `known_defects` (F-01).
   - `consecutive-segment-gap` (`del-blue-seg-01|del-blue-seg-02`): Masked by `unreviewed_warnings`.

2. **`pune` Purple Line (`pun-purple`)**:
   - `ground-truth-length`: Masked by `known_defects` (F-09) due to twin-track double counting (48.1 km vs ~34 km).

3. **`mumbai` Line 4 & Future Stations**:
   - 11 entries of `station-far-from-nearest-segment` in Mumbai: Masked by `unreviewed_warnings`.
   - `ground-truth-station-count` on `mum-line-4`: Masked by `known_defects` (F-10).

4. **`bengaluru` Pink Line (`blr-pink`)**:
   - `ground-truth-length` and `ground-truth-station-count`: Masked by `known_defects` (F-13).

---

## 4. Summary & Verification Status

- **Rules to be introduced in M8.1 Step 4 (report-only mode):**
  1. `segment-parallel-duplicate` (catches twin tracks within 60 m for >300 m)
  2. `segment-hairpin` (catches turns >150° within 300 m)
  3. `segment-sparse-vertices` (catches straight chords >1 km on non-schematic segments)
  4. `city-km-vs-reference` (catches >10% discrepancy against reference km)
  5. `line-terminal-missing` (enforces reference terminals within 300 m of segment ends)
  6. `reference-construction-stretch-missing` (ensures reference construction corridors exist in data)
  7. `orphan-future-station` (catches floating future stations >75 m from line segments)
  8. `future-segment-no-stations` (catches 0-station future segments unless exempted)
  9. `cross-network-interchange` (catches cross-city/network stations <250 m without interchange link)
  10. `verified-without-official-source` (catches OSM-only records marked with `last_verified`)
  11. `operational-station-no-opened-on` (catches operational stations with null `opened_on`)

**STOP.** Ready for owner review of this root-cause report before proceeding to M8.1 Step 4.
