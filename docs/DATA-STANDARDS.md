# Data Standards

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
| `geometry_quality` | `"surveyed"` (or `"exact"`) \| `"schematic"`. Construction and planned stretches without sourced geometry get schematic connectors built from ordered stations (`"schematic"`). Operational geometry is never schematic. |
| `source` | `osm`, `manual` or `osm+<operator>`; `mock` only in mock data. |
| `retrieved_at` | Date the raw OSM data was fetched (machine date). |
| `last_verified` | Date a human or agent last checked this record against an official source. Never set automatically by the pipeline. |

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

## 6. Staleness

- A `construction` segment whose `expected_completion` is in the past gets a warning until the date is updated or `completion_unconfirmed` is set with a reference.
- Re-verify each city's `last_verified` at least when its status data changes; the audit reports records older than 12 months.

## 7. Never

- Fill an unknown with a default or a "reasonable" value.
- Edit generated files in `data/` by hand.
- Add a data point without recording where it came from.