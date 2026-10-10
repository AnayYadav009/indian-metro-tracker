# Milestones v2 (M8 to M18)

M1 to M7 are in `docs/MILESTONES.MD`. This file continues from there.

Read before starting any milestone: `docs/BLUEPRINT.md`, `docs/DATA-STANDARDS.md`, `docs/DATA_AUDIT.md`, `docs/CITY_ONBOARDING.md`, `.agents/rules/project.md`.

## Working rules (apply to every milestone)

1. One milestone at a time. Post a plan first and wait for approval before writing code.
2. Stop at every point marked **STOP** and wait for the owner.
3. Report lint, typecheck, unit tests and e2e results before saying "done".
4. No new dependency without asking. Currently avoided: chart libraries, Turf, image libraries.
5. Never invent real-world facts. Unknown values stay `null` and produce an audit warning.
6. Never hand-edit generated files in `data/`. Fix overrides or pipeline rules, then rebuild.
7. From M9 onward, e2e tests also run against the static export (`out/`), not only the dev server.

## Overview

| # | Milestone | Scope change | Status |
|---|---|---|---|
| M8 | Data audit and repair | Build `audit:data`, audit all existing cities, fix inconsistencies at the source | In progress: one audit error remains |
| M9 | Data foundation v2 | Additive schema changes, geo helpers, size budget, export e2e in CI | In progress: size budget gate remains |
| M10 | Tier 1 completion | Onboard Chennai, Hyderabad, Kolkata (and any Tier 1 city M8 finds still mock or incomplete), one city per PR | In progress: audit gate remains |
| M11 | Report-an-error button | Prefilled GitHub issue from line and station panels | Complete |
| M12 | Interchange highlighting | Derived interchange clusters, distinct map marker, connecting-line chips | Complete |
| M13 | Timeline slider | Year scrubber using existing `inaugurated_on` and `opened_on` | Complete |
| M14 | Stats and comparison | Static `/compare/` page | Not started |
| M15 | Tier 2 onboarding | Batches A to C, same runbook as Tier 1 | In progress: data exists, acceptance gate remains |
| M16 | Nearest station | Client-side geolocation lookup | Not started |
| M17 | City pages and SEO | `/city/[id]/` static pages, sitemap, metadata | Not started |
| M18 | Route finder | Client-side graph search with transfers | Not started |

**Gate:** M11 and later do not start until M10 is complete and every Tier 1 city has zero audit errors.

Tier 1 = Delhi, Bengaluru, Mumbai, Chennai, Kolkata, Hyderabad.

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

**Out of scope:** new cities, new features, UI changes.

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

## M14: Stats and comparison

- Static `/compare/` page. Table per city: operational, construction and planned km, stations, lines, interchanges, first-opened year. Sortable.
- Bars drawn in plain SVG or CSS, no chart library.
- Km values come from `length_km`. If `official_length_km` exists, show a data-quality flag when they differ by more than the audit tolerance.
- Test that totals equal the map's network stats and that parallel per-direction geometry is not double counted.

---

## M15: Tier 2 onboarding

- Batches of 3 to 4 cities, one PR per city, same runbook as Tier 1.
- Candidate list to be researched and confirmed in the batch plan, not assumed: Pune, Ahmedabad, Kochi, Jaipur, Lucknow, Nagpur, Kanpur, Agra, Bhopal, Indore, Patna, Surat. Navi Mumbai and Delhi NCR neighbours need a decision on whether they are separate cities or part of a `network_id`.
- A city qualifies only if a metro is operational, under construction, or an officially sanctioned project; this is verified from official sources in the reference file.
- Re-measure data size before each batch and apply the M9 budget.
- Smaller cities have thin OSM coverage of construction and planned lines, so override coordinates are expected, each with references and `last_verified`.

---

## M16: Nearest station

- MapLibre `GeolocateControl` for the position dot (no new dependency).
- Haversine over operational stations in memory; top 3 to 5 with straight-line distance (labelled as such), lines served, interchange flag.
- Location is never stored or sent anywhere.
- Handle permission denied, unavailable GPS, and nothing within a threshold distance. Fallback: tap the map to choose a point.
- Tests: distance and sorting unit tests, e2e with mocked geolocation.

---

## M17: City pages and SEO

- `/city/[id]/` via `generateStaticParams` from `cities.json`. A new city needs no code change.
- Static text (stats, lines, opening years) plus the map focused on the city. The URL is the single source of truth, no clash with `useUrlSync`.
- `generateMetadata` per city, canonical URLs from `NEXT_PUBLIC_SITE_URL`, `sitemap.ts` and `robots.ts` marked force-static.
- One shared social image. Per-city images need an image dependency and require owner approval.
- Tests: every city page exists in `out/`, links work under the GitHub Pages base path.

---

## M18: Route finder

- Prerequisite data: `ordered_station_ids` per line (from OSM route-relation order, geometry projection as fallback). Additive migration, audited.
- Graph: nodes are stations; edges join adjacent stops (weight = distance divided by an assumed average speed); interchange edges carry a transfer penalty. Both constants are visibly labelled as estimates. Graphs are limited to a `network_id`.
- Dijkstra with a small hand-written heap, "fastest" and "fewest transfers".
- UI: from and to search boxes, swap, step-by-step legs, route highlight on the map using `lib/geo.ts` line slice, `?from=&to=` URL params.
- No fares and no live timings. Always show an "estimated" note.
- Tests: fixture network, symmetry, disconnected networks return "no route", under 200 ms on the largest network.