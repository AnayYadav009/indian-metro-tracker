# Audit Error Triage — 2026-10-15

## Source and scope

`npm run audit:data` completed on branch `fix/m10-audit-errors` at preservation commit `29f7695` (based on current repo state). Source of truth for this table is the freshly generated `reports/data-audit/2026-10-15.json`, filtered to `severity === "error"`. That JSON contains 25 errors. The audit command exits 0 because baseline handling tracks findings; it does not mean the error count is zero. No metro data was changed in this step.

“Cause” below is limited to what the current audit message establishes. Proposed fixes are hypotheses for investigation, not a claim that the geometry is wrong. No coordinates or station facts should be added absent a verifiable source.

## All 25 errors

| # | City | Line / segment / subject | Rule ID | Current audit cause | Proposed fix to investigate | Fix type | Size |
|---:|---|---|---|---|---|---|:---:|
| 1 | Ahmedabad | `ahm-violet` / GIFT City–Shahpur Phase 2B | `reference-construction-stretch-missing` | Reference declares a construction stretch but no matching construction segment exists. | Compare current official corridor status and endpoints; add/update override + rebuild only if a source confirms it; otherwise NEEDS-OWNER. | data override | M |
| 2 | Bengaluru | `blr-green-seg-01` | `segment-parallel-duplicate` | Polyline folds back within 60 m for about 719 m. | Inspect source OSM ways and official alignment; determine whether genuine loop/track or duplicate trace before geometry change. | geometry edit | M |
| 3 | Bhopal | city `bhopal` | `city-km-vs-reference` | Computed operational length 5.58 km vs reference 6.22 km (10.2% difference). | Reconcile line geometry and reference methodology/source; do not scale/edit coordinates to force match. | false positive | M |
| 4 | Chennai | `che-corridor-5-seg-01` | `segment-parallel-duplicate` | Polyline folds back within 60 m for about 381 m. | Compare source relation and official Corridor 5 alignment; preserve a genuine branch/reversing loop. | geometry edit | M |
| 5 | Delhi NCR | `del-grey` / `del-grey-seg-01`, terminal Dwarka | `line-terminal-missing` | Reference terminal Dwarka is 1,233 m from nearest segment end (300 m threshold). | Verify Grey Line’s reference terminal, station assignment, segment end, and bounding extent; correct source override/reference only with evidence. | data override | M |
| 6 | Delhi NCR | `del-pink` / `del-pink-seg-01`, terminal Shiv Vihar | `line-terminal-missing` | Reference terminal Shiv Vihar is 3,399 m from nearest segment end. | Check branch topology and station/line assignment against official map and source relation; correct only the supported side of the mismatch. | data override | M |
| 7 | Delhi NCR | `del-pink`, Phase 4 Maujpur–Majlis Park | `reference-construction-stretch-missing` | Reference declares a construction stretch with no matching data segment. | Verify whether corridor is still in construction and map endpoints from official or OSM source; then override/rebuild or correct stale reference. | data override | M |
| 8 | Delhi NCR | `del-blue-seg-01` + `del-blue-seg-02` | `segment-parallel-duplicate` | Two segments run within 60 m for about 525 m. | Inspect segment overlap, OSM relation membership and connectivity; merge/remove only if the duplicate is confirmed. | pipeline rule | M |
| 9 | Delhi NCR | `del-green-seg-01` + `del-green-seg-02` | `segment-parallel-duplicate` | Two segments run within 60 m for about 424 m. | Inspect source traces and topology; preserve legitimate paired branches/loops if present. | pipeline rule | M |
| 10 | Delhi NCR | `del-grey-seg-01` | `segment-parallel-duplicate` | A single polyline folds back within 60 m for about 327 m. | Check whether this is a true alignment loop or duplicated/backtracking geometry against official map/source relation. | geometry edit | M |
| 11 | Delhi NCR | `del-pink-seg-01` | `segment-parallel-duplicate` | A single polyline folds back within 60 m for about 660 m. | Inspect line shape and source relation; correct only a verified artifact, retaining real bends and branches. | geometry edit | M |
| 12 | Gurugram | `gur-rapid` / terminal Cyber City | `line-terminal-missing` | Reference terminal Cyber City is 1,226 m from nearest segment end. | Verify line terminal/reference and segment/station relationship; make the smallest source-supported correction. | data override | M |
| 13 | Gurugram | `gur-rapid-seg-01` | `segment-parallel-duplicate` | Polyline folds back within 60 m for about 563 m. | Check route against official/operator alignment; do not remove a real loop without confirmation. | geometry edit | M |
| 14 | Kolkata | `kol-green`, terminal Howrah Maidan | `line-terminal-missing` | Reference terminal is 2,136 m from nearest segment end. | Check segment extent, terminal station assignment and reference topology against official map/source relation. | data override | M |
| 15 | Kolkata | `kol-yellow`, Jai Hind Airport–Barasat | `reference-construction-stretch-missing` | Reference declares construction stretch but no matching segment exists. | Verify current sanctioned/in-construction status and endpoints; then add sourced override and rebuild, or correct stale reference. | data override | M |
| 16 | Mumbai | city `mumbai` | `city-km-vs-reference` | Computed operational length 80.70 km vs reference 90.47 km (10.8% difference). | Reconcile included lines/status, surveyed geometry and reference measurement basis. Avoid adding invented geometry. | false positive | M |
| 17 | Nagpur | `nag-aqua`, Lokmanya Nagar–Hingna Reach 3A | `reference-construction-stretch-missing` | Reference stretch has no matching construction segment. | Verify official construction status/endpoints, then add a sourced override/rebuild or revise stale reference. | data override | M |
| 18 | Nagpur | `nag-aqua`, Prajapati Nagar–Transport Nagar Reach 4A | `reference-construction-stretch-missing` | Reference stretch has no matching construction segment. | Same: validate source/status/endpoints before modifying data or reference. | data override | M |
| 19 | Nagpur | `nag-orange`, Automotive Square–Kanhan River Reach 2B | `reference-construction-stretch-missing` | Reference stretch has no matching construction segment. | Validate official corridor stage and endpoints before adding/correcting source override. | data override | M |
| 20 | Nagpur | `nag-orange`, Khapri–Butibori MIDC ESR Reach 1A | `reference-construction-stretch-missing` | Reference stretch has no matching construction segment. | Validate official corridor stage and endpoints before adding/correcting source override. | data override | M |
| 21 | Noida | `noi-aqua-seg-01` + `noi-aqua-seg-02` | `segment-parallel-duplicate` | Two segments run within 60 m for about 624 m. | Inspect source relation overlap/connectivity; confirm duplicate geometry vs valid alignment before changing. | pipeline rule | M |
| 22 | Pune | `pun-purple`, PCMC–Nigdi (Bhakti Shakti) | `reference-construction-stretch-missing` | Reference construction stretch has no matching segment. | Verify current phase/status and endpoints; add sourced override/rebuild or correct stale reference. | data override | M |
| 23 | Pune | `pun-purple`, Range Hill infill | `reference-construction-stretch-missing` | Reference construction stretch has no matching segment. | Verify whether this infill is represented in current source and whether it meets reference definition. | data override | S |
| 24 | Pune | `pun-purple`, Swargate–Katraj | `reference-construction-stretch-missing` | Reference construction stretch has no matching segment. | Verify official status/endpoints; add sourced data only if confirmed, otherwise correct reference with evidence. | data override | M |
| 25 | Pune | `pun-line-3-seg-01` | `segment-parallel-duplicate` | Single polyline folds back within 60 m for about 18,455 m. | Inspect relation/override provenance and authoritative Line 3 alignment; likely requires source-supported geometry correction or demonstrating rule false positive. | geometry edit | L |

## Seven pending rules

| Rule ID | Recommendation | Reason |
|---|---|---|
| `segment-parallel-duplicate` | **Enforce after geometry review/repair** | Intended M10.1 blocker; currently identifies several apparent folded/parallel traces, but each finding must be checked for legitimate loops and duplicate segments before enforcement. |
| `segment-hairpin` | **Enforce after fixture and geometry review** | Intended M10.1 error check for backtracking spikes. Keep report-only until fixtures prove genuine bends/loops are not rejected and current data is reviewed. |
| `segment-sparse-vertices` | **Enforce as a warning after geometry review** | Intended M10.1 warning for unsurveyed long legs; should remain non-blocking warning severity, while schematic exceptions are honored. |
| `city-km-vs-reference` | **Enforce after reference-method review** | Intended M10.1 error threshold >10%; current Bhopal/Mumbai errors show either data/reference mismatch or measurement-method ambiguity, so do not silence by baselining. |
| `line-terminal-missing` | **Enforce after terminal/reference repair** | Required M10.2 check; current Delhi, Gurugram and Kolkata results may expose real extent issues or incomplete topology. |
| `reference-construction-stretch-missing` | **Enforce after construction coverage review** | Required M10.2 check; current results cover multiple declared corridors, and either missing data or stale/incorrect references need source-based resolution. |
| `orphan-future-station` | **Enforce after fixtures and future-station review** | Required M10.2 check; future stations should not evade orphan/proximity checks. Keep pending until fixture behavior and `stations_not_published` exceptions are validated. |

No pending rule is recommended for deletion based on current evidence. None should be promoted immediately merely to change audit behavior; validate fixtures and source data first. The requested owner-decision areas are untouched: cross-network model (already recorded in docs), optional ordered station sequence, and separate Noida/Gurugram/Navi Mumbai network identities.

## Verification boundary

This is Step 1 only. Proposed causes and repairs are not verified root causes. No geometry edit, override edit, rebuild, or compiled data change was made. All 25 exact messages are preserved in the source JSON cited above. Next requested action is owner review of the triage and pending-rule recommendations before proceeding to city-by-city changes.
