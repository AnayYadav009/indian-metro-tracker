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
| `source` | For station and segment features, geometry origin: `osm`, `manual` or `osm+<operator>`; `mock` only in mock data. For lines, records the contributing source tags. |
| `retrieved_at` | Date the raw OSM data was fetched (machine date); it does not indicate attribute verification. |
| `last_verified` | Date a human or agent last checked the record's sourced attributes against an official source. Never set automatically by the pipeline. It requires an official or government reference and does not change the geometry `source`. OSM-derived geometry may therefore retain `source: "osm"` while sourced attributes have `references` and `last_verified`. |

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

## 13. Fares and Timings (Milestone M21a)

### 13.1 Scope and Base Fare Model
- Only standard adult single-journey base fares (`ticket_type: "single_journey"`, `currency: "INR"`) are modeled. Smart-card discounts, return tokens, passes, tourist cards, off-peak rates, and concession fares are out of scope.
- Fares are distance-based (`distance_basis: "computed_route_km"`). The distance basis is derived from our vector geometry, NOT the operator's official tariff distance table. Because geometric route distance may differ slightly from revenue-metered track chains, fares are estimates and include boundary tolerance indicators.
- **Day Scope (`day_scope`)**: Every `FareRule` has a required descriptive field `day_scope: "mon_sat" | "sun_holiday" | "all"`. This is descriptive metadata only: the one-rule-per-line constraint stays, and Sunday/holiday discounted fares are NOT modeled. Because Sunday and holiday discount fares are not modeled, any UI that displays an estimated fare must explicitly label the fare with its day scope (e.g. "Monday–Saturday").

### 13.2 Band Rules
- Each `FareRule` contains ordered distance bands `[{ min_km, max_km, fare_inr }]`.
- First band `min_km` must be exactly 0.
- Bands must be sorted, strictly contiguous, and non-overlapping: each band's `min_km` must equal the preceding band's `max_km`.
- For every intermediate band, `max_km > min_km`.
- Only the final band has `max_km: null` representing the open-ended distance cap.
- `fare_inr` must be a non-negative integer and non-decreasing with distance.

### 13.3 Official-Host and Provenance Rules
- Verified `FareRule` and `ServiceHours` require `provenance.status === "verified"`.
- A verified record MUST cite a specific page `source_url` whose path is not empty or `/`. Bare domain homepages are rejected.
- The `source_url` hostname for verified records must be on the official-host allowlist (`lib/official-source-hosts.ts`), restricted strictly to transit operator domains and official government transport portals. News, blogs, forums, and unofficial trackers (e.g. `themetrorailguy.com`) are never permitted.
- `effective_from` is optional for a verified `FareRule` when the official publication states none. If absent, a non-empty `provenance.note` stating that the official page states no effective date is mandatory. If present, it must be a valid calendar date format (YYYY-MM-DD) read directly from the page.
- Unverified records (`status: "unverified"`) may omit source URLs or use non-allowlisted references during staging, but are never treated as sourced data.

### 13.4 Hidden-When-Unsourced Rule
- Fares and timings are strictly gated on provenance. If a city does not have at least one verified `FareRule`, the fare feature is hidden entirely for that city. No placeholders, default tariffs, or synthetic estimates may ever be displayed.
- Multi-leg routes: if any leg on a journey lacks a verified fare rule, the fare calculation for the entire route returns `null` (hidden).

### 13.5 Service Hours (First and Last Train)
- Service hours model first and last train departures at terminal stations on a line.
- First and last train times are formatted in 24-hour time `HH:MM`.
- `last_train_crosses_midnight` is boolean and strictly validated: if `last_train` is chronologically earlier than `first_train`, `last_train_crosses_midnight` must be `true`; otherwise it must be `false`.

