# Data Audit

Specification for `npm run audit:data` (`scripts/audit/consistency-report.ts`) and the repair workflow used in M8, M10 and M15.

The audit is read-only. It never modifies data.

## Output

- `reports/data-audit/<YYYY-MM-DD>.md` (human readable, grouped by city then severity)
- `reports/data-audit/<YYYY-MM-DD>.json` (machine readable)
- Exit code 1 if any `error` exists, or any `warn` not listed in `data/audit-baseline.json`.

Severities: **error** blocks merge. **warn** is tracked and must be fixed or baselined with a one-line reason. **info** is reported only.

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

## Baseline file (`data/audit-baseline.json`)

```json
{
  "accepted_warnings": [
    { "city_id": "<id>", "rule": "<rule-name>", "subject": "<id>", "reason": "<one line>" }
  ]
}
```

A new warning not in this file fails CI. Removing entries is always allowed.