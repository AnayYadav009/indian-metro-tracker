# Data Audit

## Declaration coverage and geometry evidence

- `declared-not-compiled` is an error when an override-declared segment ID or a reference-declared corridor line has no compiled segment feature. A matching planned or under-construction declaration may instead be reported as a `coverage-gap` warning only when it has a fully sourced entry in `data/audit/coverage-gaps.json`. Operational declarations always remain errors, including when a matching gap entry is present. Unlisted or status-mismatched declarations remain errors.
- `segment-parallel-duplicate` and `segment-overlap` remain active errors. A pair is exempted only when both compiled segments carry the same `shared_corridor` record, both contain the declared station range in order, the stations exist on both lines, and the measured overlap differs from the station-implied length by no more than 15%. Invalid or oversized declarations do not suppress the finding.
- A schematic construction stretch can satisfy `reference-construction-stretch-missing` only if it has `geometry_quality: "schematic"`, a source URL, construction status, and two distinct mapped line stations within 300 m of its geometry endpoints. Otherwise the missing-stretch error remains and `schematic-segment-incomplete` is reported.
- Schematic geometry is omitted from official geometry-length comparisons and operational city totals. It remains visible as a dashed line and its panel labels it “Approximate alignment.”

Specification for `npm run audit:data` (`scripts/audit/consistency-report.ts`) and the repair workflow used in M8, M10 and M15.

The audit is read-only. It never modifies data.

## Output

- `reports/data-audit/<YYYY-MM-DD>.md` (human readable, grouped by city then severity)
- `reports/data-audit/<YYYY-MM-DD>.json` (machine readable)
- The CLI summary prints `Coverage gaps: N` separately; coverage-gap findings remain visible in both report formats.
- Exit code 1 if any `error` exists, or any `warn` not listed in `data/audit-baseline.json`.

Severities: **error** blocks merge. **warn** is tracked and must be fixed or baselined with a one-line reason. **info** is reported only.

Coverage-gap entries require `city_id`, `line_id`, `stretch`, status (`planned` or
`under_construction`), `source_url`, `reason`, and `review_date`. Override
segment gaps may also include `segment_id` to associate the reference stretch
with its source declaration. Coverage gaps are reviewed records, not baselines;
they do not alter `data/audit-baseline.json`.

Thresholds below are defaults and can be tuned per city in the overrides file.

## Checks

### A. Structural
| Check | Severity |
|---|---|
| Zod schema valid, all foreign keys resolve (`city_id`, `line_id`, `line_ids`) | error |
| IDs unique across the whole dataset | error |
| Coordinates inside the India envelope | error |
| Coordinates outside the city bbox margin | warn |
| Line with no segments; segment whose line does not exist | error |

### B. Geometry
| Check | Severity |
|---|---|
| Station farther than 200 m from every segment of its lines (point-to-segment distance) | error |
| Station farther than 75 m from the nearest segment of its lines | warn |
| Station with no nearby segment at all (orphan) | error |
| Segment end more than 150 m from any station of that line (possible gap or missing terminal) | warn |
| Consecutive segments of one line whose ends do not meet within 150 m (unless marked as an intentional break in overrides) | warn |
| Two segments of the same line overlapping for more than a few hundred metres (duplicate geometry) | error |
| Zero-length or self-intersecting segment | error |
| Computed `length_km` differs from `official_length_km` by more than 2% | warn |
| Computed `length_km` differs from `official_length_km` by more than 5% | error |

### C. Semantic consistency
| Check | Severity |
|---|---|
| Station `status` does not match the status of the segments it sits on (a terminal between operational and construction counts as operational) | error |
| Station `phase` not among the phases of its segments | error |
| Station `opened_on` earlier than its segment's `inaugurated_on` | warn |
| Operational segment with null `inaugurated_on`; construction or planned segment with a date | error |
| `stations_count` differs from the number of stations assigned to the segment | error |
| `is_interchange` true but only one line, or several lines but false | warn |
| Phase label not in the city's `phases`, or inconsistent format | error |
| Segment `operator` differs from its line's `operator` | error |
| Same normalized station name more than once in a city (check for missed duplicate merges) | warn |
| Station name contains a line qualifier, a "Metro Station" suffix, double spaces or inconsistent casing | warn |
| Two lines in one city share a colour | warn |
| `expected_completion` in the past without `completion_unconfirmed` | warn |
| `last_verified` older than 12 months, or missing on manual records | warn |
| Operational record with no reference | warn |

### D. Ground truth comparison
Compare each city against `data/reference/<city>.json`.

| Check | Severity |
|---|---|
| Operational station count per line differs from reference | error |
| Terminal station names differ from reference (after alias normalization) | error |
| Opening date of a phase differs from reference | error |
| Line missing from data or from reference | error |
| Total operational length differs from reference by more than 3% | warn |
| Reference file self-check: sum of stations_added across openings equals operational_stations, openings in date order, valid topology (loop has no terminals), and source kind ("official" | "government" | "news") | error |

*Note:* A reference line with `topology: "branched"` must list every branch terminal, and a reference with `confidence: "unverified"` downgrades its errors to warnings. Unverified references must be resolved before a city counts as passing the gate.

### E. Blind-spot rules (added 2026-10-12)

These rules close gaps found in the walkthrough review. Pending-rule findings remain visible and fail the audit gate until repaired or individually reviewed and cleared; no report-only environment override is used. Rule IDs stay in `pending_rules` only while their named repair milestone is open. Thresholds are defaults, tunable per city in overrides.

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

## Reference file format (`data/reference/<city>.json`)

Created from official sources before any build or fix.

```json
{
  "city_id": "<id>",
  "compiled_on": "YYYY-MM-DD",
  "lines": [
    {
      "line_id": "<id>",
      "official_name": "<name as operator writes it>",
      "operator": "<single legal acronym e.g. BMRCL, DMRC, MMOPL, MMMOCL, MMRCL>",
      "topology": "linear | branched | loop",
      "operational_stations": 37,
      "official_length_km": 43.49,
      "terminals": ["<station>", "<station>"],
      "disjoint_stretches": false,
      "openings": [
        {
          "stage": "<description of stage>",
          "phase": "<bare phase label e.g. 1, 2, 3, 4, or null>",
          "opened_on": "YYYY-MM-DD",
          "stations_added": 6,
          "source": {
            "title": "<page or document title>",
            "url": "https://...",
            "retrieved_at": "YYYY-MM-DD",
            "kind": "official | government | news"
          }
        }
      ],
      "construction": [
        {
          "stretch": "<from - to>",
          "phase": "<bare phase label or null>",
          "expected_completion": "YYYY-MM-DD or YYYY-MM",
          "stations": 15,
          "source": {
            "title": "<page or document title>",
            "url": "https://...",
            "retrieved_at": "YYYY-MM-DD",
            "kind": "official | government | news"
          }
        }
      ],
      "pipeline_status_notes": "<notes>"
    }
  ]
}
```

Every number or date must have a source object with deep-link URL, title, and retrieval date. Any value not sourced directly must remain `null` (never assumed or default 0).

## Repair workflow

1. Run the audit, read the baseline report, group findings by cause (one cause often explains many findings).
2. Decide the fix location: pipeline rule (code, with a test) or data (overrides file).
3. Make the change, rebuild with the pipeline, re-run the audit.
4. Record the source URL in `references` for every data value changed.
5. Repeat until there are zero errors and every warning is fixed or baselined.
6. Spot check: 10 random stations per city compared by hand against the operator's map; list them in the report.
7. Run the `docs/VISUAL_QA.md` checklist and attach the evidence to the PR. A clean audit alone does not close a city.

## Baseline file (`data/audit-baseline.json`)

```json
{
  "accepted_warnings": [
    { "city_id": "<id>", "rule": "<rule-name>", "subject": "<id>", "reason": "<one line>" }
  ]
}
```

A new warning not in this file fails CI. Removing entries is always allowed.
