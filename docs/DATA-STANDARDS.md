# Data Standards

## Shared trunks and schematic construction geometry

For two compiled segments that intentionally share a consecutive route section, add the same `shared_corridor` object to both segment records:

```json
{
  "segment_ids": ["line-a-seg-01", "line-a-seg-02"],
  "shared_station_ids": ["station-a", "station-b"],
  "reason": "The operator route map shows these branches sharing this trunk.",
  "source": "https://operator.example/route-map"
}
```

The station IDs must exist on both segments' line and follow the same route order (forward or reverse). Audit suppression is limited to measured overlap within 15% of the consecutive station range's geographic length. The declaration is paired metadata, not a free-form overlap allowlist.

Use `geometry_quality: "schematic"` only for sourced construction/planned corridor alignments when exact surveyed geometry is unavailable. The line must terminate within 300 m of two distinct mapped stations on its line and include a corridor source URL. Schematic geometry is rendered dashed and labeled “Approximate alignment”; it is excluded from geometry-vs-reference length checks and operational totals. Do not fabricate intermediate stations or coordinates.

The single reference for what every data field means and where values may come from. If code and this file disagree, raise it; do not silently pick one.

## 1. Scope

Included: urban metro systems that run as metro (underground, elevated or at-grade, grade-separated mass rapid transit).

Excluded for now: regional rapid rail (RRTS/Namo Bharat), monorail, Metro Neo and similar, suburban and commuter rail. Changing this needs an owner decision.

## 2. Source hierarchy

1. Operator official website, maps and press releases.
2. Government sources (state government, ministry, PIB, gazette notifications).
3. Reputable news outlets, for dates and timelines only, with the URL recorded.
4. OpenStreetMap, for geometry and station names.
5. Wikipedia: a pointer to find primary sources, never a cited source on its own.

Rules
- Every `construction` or `planned` segment needs at least one URL in `references` (the validator already errors on this).
- Operational segments should have a reference. A missing one is a warning.
- If sources conflict, prefer the higher-ranked source and note the conflict in the PR.
- If a value cannot be found, it stays `null`. A plausible-looking guess is never acceptable.

## 3. Field semantics

| Field | Meaning |
|---|---|
| `status` | `operational`: public passenger service runs on this segment today. `construction`: works officially under way. `planned`: sanctioned or officially proposed, works not started. |
| `inaugurated_on` | Date public passenger service began on this segment (not the ceremony date if they differ). `YYYY-MM-DD`. Required for operational, `null` otherwise. |
| `opened_on` (station) | Date the station opened to passengers. Same format. May be later than its segment's date for infill stations. |
| `expected_completion` | `YYYY-MM` or `YYYY`, from an official source. `null` when status is operational. `completion_unconfirmed: true` when the official date has passed or is vague. |
| `phase` | Bare label exactly as the operator writes it (`I`, `II`, `IV` for Delhi; `1`, `2A`, `2B` for Bengaluru). No `Phase ` prefix in data; the UI adds the word. Every value must exist in the city's `phases` list. |
| `length_km` | Computed from segment geometry. Not an official figure. |
| `official_length_km` | Optional. Operator's published length, for cross-checking only. |
| `stations_count` | Number of distinct stations (after deduplication) assigned to this segment. Never a default or estimate. |
| `layout` | `underground`, `elevated` or `at-grade`, as stated by the operator. |
| `is_interchange` | `true` only for transfers between two or more metro lines in this dataset. Connections to suburban rail, Indian Railways or monorail are not metro interchanges and go in an optional `other_connections` list with a reference. Must match `line_ids.length > 1`. |
| `other_connections` | Optional array of non-metro connections (suburban rail, monorail, regional rail) with reference details. |
| `effective opening date` | Derived rule: a station's effective opening date is `opened_on ?? inaugurated_on` (from its segment). This is derived at runtime and never stored as a separate duplicate field. |
| `geometry_quality` | `"exact"` \| `"schematic"` in the current schema. Exact is reserved for surveyed or construction-stage geometry; construction and planned stretches without sourced geometry use schematic connectors built from ordered stations. A future `"approximate"` value would require an additive schema and renderer change before use. Operational geometry is never schematic. |
| `source` | `osm`, `manual` or `osm+<operator>`; `mock` only in mock data. |
| `retrieved_at` | Date the raw OSM data was fetched (machine date). |
| `last_verified` | Date a human or agent last checked this record against an official source. Never set automatically by the pipeline. `last_verified` requires an official or government reference. OSM-only records carry `retrieved_at` only. |

## 4. Operators and Lines

- Operator belongs to the line, not the city. A segment inherits its line's operator. A city may have several operators; city-level `operator` is only a primary or display value.
- Operating lines must have their actual operator assigned (e.g. MMMOCL vs MMRDA vs DMRC vs BMRCL).
- Line terminals: must match the first and last operational stations in topological order along the line. For loop lines or branching lines, terminals are defined according to official network topology.

## 5. IDs and names

- City id: lowercase slug (`delhi`, `bengaluru`).
- Line id: `<city-prefix>-<slug>` (`del-yellow`).
- Segment id: `<line-id>-seg-<nn>`.
- Station id: `<city-prefix>-<slug-of-name>`; add a line slug only when two distinct stations in one city would collide.
- IDs are unique across the whole dataset, not just within a city.
- Station name: the official English name as on the operator's map, in title case, without a "Metro Station" suffix and without line qualifiers like "(Blue Line)". Alternative names and spellings go in `stationAliases` in the overrides file.

## 6. Geometry Conventions

- One centreline per line. Where OSM supplies aligned track traces for the same corridor, use their sampled midpoint as the centreline; where the traces diverge, keep the single cited source trace for each route. A documented shared section is emitted once so segment lengths do not double-count it. The source override must name both segment IDs, the aligned endpoints, source URLs and reason; the pipeline rejects missing segments, mismatched lines, distant anchors or materially different shared lengths.
- `geometry_quality: exact` is only for surveyed or construction-stage geometry. Anything drawn from station positions or by hand is `schematic`, and the legend note that future routes are schematic stays visible.
- Spikes that double back are removed in the pipeline unless listed as intentional in overrides.

## 7. Staleness

- A `construction` segment whose `expected_completion` is in the past gets a warning until the date is updated or `completion_unconfirmed` is set with a reference.
- Re-verify each city's `last_verified` at least when its status data changes; the audit reports records older than 12 months.

## 8. Never

- Fill an unknown with a default or a "reasonable" value.
- Edit generated files in `data/` by hand.
- Add a data point without recording where it came from.

## 9. Cross-network interchanges and ownership

- Stations belong to the network of the line that serves them, wherever they are located.
- Cross-network interchanges are modeled using a shared `interchange_id` across city records (decided in M10.3: Option A). Each network retains its own station record (e.g., `del-sikanderpur` in Delhi and `gur-sikanderpur` in Gurugram, or `del-noida-sector-52` and `noi-noida-sector-51`), maintaining exact operator and city boundary integrity, while mapping to a common cluster ID in `data/overrides/interchanges.json`. UI components resolve connected lines from all stations sharing that cluster ID.

## 10. Future Segments

- A construction or planned segment may have no published stations. Mark it `stations_not_published: true` in overrides with an official reference and show "Stations not yet published" in the UI; never display an invented count.

## 11. Line Ordering and Topological Sequence

- `ordered_station_ids` in `LineSchema`: pulled forward into M10.3 (decided in M10.3: Option A) as an additive optional field. It defines the authoritative sequence of station IDs along a line from start terminal to end terminal. Used for route calculation, topology integrity, and unambiguous stage mapping.

## 12. Owner Decisions for M8 and M10 (2026-10-19)

- **Bhopal Orange Line length:** retain the official 6.22 km figure as the reference basis. The 5.58 km geometry measurement remains an explicit variance for sourced reconciliation; do not replace the official figure with the measured geometry solely to silence the audit.
- **Gurugram Rapid Metro loop:** retain current geometry while treating the loop terminal convention as a documented topology exception. Do not move or extend the endpoint without authoritative terminal evidence.
- **Chennai Corridor 3:** retain the declared construction coverage gap until sourced alignment and terminal coordinates are available. Do not draw a schematic connector from unsupported coordinates.
- **Delhi Pink Phase 4:** treat Maujpur as the existing/shared station. Add only stations confirmed as new by the official project source; do not count Maujpur as a new station.
- **Operational station opening dates:** backfill only when an official opening date maps unambiguously to the station. Otherwise keep `opened_on: null` and record the reason where the record is reviewed.
- **Geometry exceptions:** retain only individually documented, evidence-based shared-corridor or loop exceptions. Each exception must name the affected geometry, reason, and authoritative evidence.
- **Audit baseline:** do not baseline unreviewed warnings. Keep them visible until repaired or individually reviewed and accepted with a reason. Never baseline findings that conceal missing line ends, missing terminals, lines without stations, or doubled geometry.
- **Stale baseline entries:** prune an entry only after confirming that its finding is no longer active.
- **New coverage findings from the Tier 2 and Chennai source review:** add proposed or construction stretches to references only after the applicable milestone's owner review. A DPR/feasibility study alone is not evidence that construction has started; use `planned` only where an official proposal or sanction meets the status definition in section 3. Unknown alignments, station coordinates, and completion dates remain unknown.
