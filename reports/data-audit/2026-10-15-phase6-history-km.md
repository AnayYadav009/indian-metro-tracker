# Phase 6: Declared stages and length mismatches

Audit date: 2026-10-15. Source review and refreshed-cache availability checked against the current branch.

## Kolkata Yellow staging

PIB's 27 March 2026 release ([PRID 2245960](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2245960&lang=2&reg=48)) reports Noapara–Jai Hind Airport (6.77 km) commissioned in FY 2025–26; Jai Hind Airport–Michael Nagar in progress; and New Barrackpore–Barasat (7.5 km) held up by land acquisition and encroachment. It also says Baranagar–Barrackpore work is held pending utility shifting/NOC. The release does not state the status of Michael Nagar–New Barrackpore.

The refreshed Kolkata raw cache contains a Jai Hind Airport station node (OSM node 13088491840) but no Michael Nagar, New Barrackpore, or Barasat nodes. Accordingly no schematic coordinates or segment geometry were invented. The Yellow Line reference now records Jai Hind–Michael Nagar as under construction and New Barrackpore–Barasat as planned/delayed; those stretches are explicit coverage gaps. **NEEDS-OWNER:** provide/approve an authoritative status and source for Michael Nagar–New Barrackpore. No compiled segment was built for either stretch.

Kolkata Pink `kol-pink-seg-01` remains declared, with construction status and PIB citation, but has no coordinates/compiled feature. The reported Baranagar–Barrackpore balance is tracked as a construction coverage gap. It was not deleted.

## Declaration history and disposition

| Declaration | History evidence | Current state and recommendation |
|---|---|---|
| Kolkata Pink `kol-pink-seg-01` | `git blame` attributes declaration to `45079549` (2026-10-07, “feat: complete M8/M9 data audit and onboard Kolkata and Chennai”); it originally had planned status and generic Metro Railway source. | Kept; reclassified to construction using PIB PRID 2245960 and tracked as a coverage gap. Recommendation: keep gap until sourced alignment/coordinates permit build. |
| Mumbai Line 1 `mum-line-1-schematic-01` | `git blame` attributes it to `53e6164` (2026-10-10, project initialization); it is named “Line 1 construction station connector,” has no OSM ID or geometry, and cites only the MMRDA homepage. | Still declared-not-compiled. **NEEDS-OWNER:** provide the specific connector/stations, authoritative source and endpoint coordinates so it can be built, or authorize removing the unsupported declaration. It was not deleted. |
| Mumbai Line 2B Phase 2, Chembur–DN Nagar | Reference entry introduced by `45079549`; official MMRDA URL and construction notes updated in `3edb031` (2026-10-13). `895ba79` (2026-10-15) updated operational stages from the MMRDA overview. | Remains declared and is not compiled; MMRDA identifies the phase as under construction ([overview](https://www.mmrda.maharashtra.gov.in/en/projects/transport/metro-line-2b/overview)). It is now an explicit coverage gap. Recommendation: keep the gap until sourced alignment/coordinates permit build. No declaration was deleted. |

## Mumbai and Bhopal operational length comparison

Compiled distance was calculated from current compiled segment geometry; reference is the current `data/reference/*.json` operational length. These deltas are observations, not proposed edits. Except where a mismatch has a specific audited finding, its cause is **UNVERIFIED**; the audit does not establish whether reference totals include a different alignment/stage or whether the trace is incomplete.

| City | Line | Operator | Status | Compiled km | Reference km | Delta | Cause |
|---|---|---|---|---:|---:|---:|---|
| Mumbai | Line 1 Blue | MMOPL | Operational | 10.91 | 11.40 | -0.49 (-4.3%) | UNVERIFIED |
| Mumbai | Line 2A Yellow | MMMOCL | Operational | 17.76 | 18.60 | -0.84 (-4.5%) | UNVERIFIED |
| Mumbai | Line 7 Red | MMMOCL | Operational | 15.81 | 16.50 | -0.69 (-4.2%) | UNVERIFIED |
| Mumbai | Line 9 Red Extension | MMMOCL | Operational | 3.52 | 4.70 | -1.18 (-25.0%) | UNVERIFIED; confirm the operational stage/reference total, as reference also describes a later phase. |
| Mumbai | Line 3 Aqua | MMRCL | Operational | 32.69 | 33.50 | -0.81 (-2.4%) | UNVERIFIED |
| Mumbai | Line 4 Green | MMMOCL | Under construction | 0.00 | 0.00 | 0.00 | No operational geometry expected from the current reference status. |
| Mumbai | Line 2B Yellow Extension | MMMOCL | Operational | 5.44 | 5.79 | -0.35 (-6.0%) | UNVERIFIED |
| Bhopal | Orange Line 2 | MPMRCL | Operational | 5.58 | 6.22 | -0.64 (-10.2%) | Audit length discrepancy; precise trace/reference cause UNVERIFIED. |
| Bhopal | Blue Line 5 | MPMRCL | Under construction | 0.00 | 0.00 | 0.00 | No operational geometry expected from current reference status. |

**NEEDS-OWNER:** for each non-zero discrepancy, decide whether the operator's published operational length or a sourced route trace is authoritative for acceptance. For Line 9, also confirm which stage the 4.7 km operational reference is intended to represent. No reference values were changed.

