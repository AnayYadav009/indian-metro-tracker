# Doc patches (apply to the repo, then this file can be deleted)

These are small insertions for files that were not rewritten in full, so nothing in them is overwritten. Each section says which file and where. They are written to be applied by an agent or by hand. They go with `docs/MILESTONES-v2.md` (updated 2026-10-12), `docs/FINDINGS-2026-10-12.md` and `docs/VISUAL_QA.md`.

---

## 1. `.agents/rules/project.md`

**In "Read first", replace the numbered list with:**

1. `docs/BLUEPRINT.md`
2. `docs/MILESTONES.MD` (M1 to M7, complete) and `docs/MILESTONES-v2.md` (M8 onward, current)
3. `docs/DATA-STANDARDS.md`
4. `docs/DATA_AUDIT.md`
5. `docs/CITY_ONBOARDING.md` (when touching city data)
6. `docs/FINDINGS-2026-10-12.md` (open findings from the walkthrough review)
7. `docs/VISUAL_QA.md` (before asking for merge on any city or geometry change)

**Under "Process", add:**

- Findings in `docs/FINDINGS-2026-10-12.md` are leads from a video. Confirm each in the data or code before fixing, and close it with a reason if it is correct as is.
- When a milestone fixes a finding, update its row in the findings doc in the same PR.

**Under "Data rules", add:**

- A warning must not be baselined if it hides a missing line end, a missing terminal, a line with no stations, or doubled geometry. Fix it or leave it failing.
- One line is one centreline. Twin-track (per-direction) geometry is merged in the pipeline and each line's length is counted once in every total.
- A branched line must list every branch terminal in its reference file.
- Stations that belong to an operator's line stay with that line's network even where they lie outside the city boundary (for example DMRC Blue Line stations in Noida). City bounding boxes must cover the whole network, not only the city.
- Cross-network interchanges (for example Delhi and Gurugram at Sikanderpur) are linked, never duplicated without a link.
- Do not set `last_verified` for OSM-only records.

**Under "Testing", add:**

- Every new audit rule gets a failing fixture shaped like the real defect and a passing fixture.
- No city or geometry PR is ready for merge without the `docs/VISUAL_QA.md` checklist and screenshots attached.

---

## 2. `docs/DATA_AUDIT.md`

**Append after section D ("Ground truth comparison") and before "Reference file format":**

### E. Blind-spot rules (added 2026-10-12)

These rules close gaps found in the walkthrough review. They are introduced in report-only mode: each rule id is listed under `pendingRules` in `data/audit-baseline.json`, appears in the report with its severity, and does not fail CI until the milestone named below switches it to enforcing and removes it from `pendingRules`. Thresholds are defaults, tunable per city in overrides.

| Rule id | Check | Severity | Enforced in |
|---|---|---|---|
| `segment-parallel-duplicate` | Two traces of the same line within about 60 m of each other for more than about 300 m (twin tracks). Complements the overlap-based duplicate rule in section B. | error | M10.1 |
| `segment-hairpin` | Turn sharper than about 150 degrees within about 300 m, including spikes that double back without self-intersecting. | error | M10.1 |
| `segment-sparse-vertices` | Leg longer than about 1 km in a segment not marked `schematic`. | warn | M10.1 |
| `city-km-vs-reference` | City operational km differs from the reference by more than 10 percent. Each line counted once. (The 3 percent warning in section D stays.) | error | M10.1 |
| `line-terminal-missing` | Every reference terminal, including each branch terminal, needs a station within about 300 m of a segment end of that line. | error | M10.2 |
| `reference-construction-stretch-missing` | Every `construction[]` stretch in the reference needs a data segment with matching status whose ends are within about 300 m of the stretch ends. | error | M10.2 |
| `orphan-future-station` | Construction and planned stations also pass the orphan and 75 m checks. | error | M10.2 |
| `future-segment-no-stations` | Construction or planned segment with no stations, unless `stations_not_published` is set in overrides with a reference. | warn | M10.3 |
| `cross-network-interchange` | Stations of different cities or networks within about 250 m, or with the same normalized name, share an `interchange_id` or appear in `data/overrides/interchanges.json`. | error | M10.3 |
| `verified-without-official-source` | `last_verified` present while the only references are OSM or none. | error | M10.3 |
| `operational-station-no-opened-on` | Operational station with null `opened_on`. | warn | M10.3 |

**Also add to section D, as a note under the table:** a reference line with `topology: "branched"` must list every branch terminal, and a reference with `confidence: "unverified"` downgrades its errors to warnings. Unverified references must be resolved before a city counts as passing the gate.

**Add to "Repair workflow", as step 7:** run the `docs/VISUAL_QA.md` checklist and attach the evidence to the PR. A clean audit alone does not close a city.

---

## 3. `docs/CITY_ONBOARDING.md`

**In the step that covers visual QA (or add it as the last step before merge):**

> Run `docs/VISUAL_QA.md` on desktop and mobile and attach the screenshots and the ticked checklist to the PR. Also confirm the city bounding box (and any Overpass query area) covers the operator's whole network, including sections that run into neighbouring cities. If it does not, widen it before fetching, otherwise line ends are silently clipped.

---

## 4. `docs/DATA-STANDARDS.md`

**Add a short section "Geometry conventions":**

- One centreline per line. Where OSM has one way per direction, the pipeline merges them (method decided in M10.1 and recorded here).
- `geometry_quality: exact` is only for surveyed or construction-stage geometry. Anything drawn from station positions or by hand is `schematic`, and the legend note that future routes are schematic stays visible.
- Spikes that double back are removed in the pipeline unless listed as intentional in overrides.

**Add a short section "Cross-network interchanges and ownership":**

- Stations belong to the network of the line that serves them, wherever they are located.
- Cross-network interchanges are linked with a shared `interchange_id` (final model decided in M10.3 and recorded here).

**Add to the `last_verified` rules:** `last_verified` requires an official or government reference. OSM-only records carry `retrieved_at` only.

**Add "Future segments":** a construction or planned segment may have no published stations. Mark it `stations_not_published` in overrides with a reference and show "Stations not yet published" in the UI; never display an invented count.