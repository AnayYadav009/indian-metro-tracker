---
trigger: always_on
---

# Project Rules: Indian Metro Network Tracker

Always-on rules for every agent session. If you have an older version of this file, replace it with this one and keep any project-specific path lines your setup needs.

## Read first (in this order)
1. docs/BLUEPRINT.md
2 .docs/MILESTONES.MD (M1 to M7, complete) and docs/MILESTONES-v2.md (M8 onward, current)
3. docs/DATA-STANDARDS.md
4. docs/DATA_AUDIT.md
5. docs/CITY_ONBOARDING.md (when touching city data)
6. docs/FINDINGS-2026-10-12.md (open findings from the walkthrough review)
7. docs/VISUAL_QA.md (before asking for merge on any city or geometry change)

## Process
- Work on one milestone at a time. Never start the next one.
- Before writing code, post a plan and wait for owner approval.
- Stop at every **STOP** marker in the milestone and wait.
- Before saying a task is done, report results of `lint`, `typecheck`, `test`, `validate:data`, and `audit:data` (when data is involved). Do not claim success without running them.
- Keep PRs small: one milestone step or one city per PR.
- Findings in docs/FINDINGS-2026-10-12.md are leads from a video. Confirm each in the data or code before fixing, and close it with a reason if it is correct as is.
- When a milestone fixes a finding, update its row in the findings doc in the same PR.

## Hard constraints (unchanged)
- Static export only. No backend, no database, no paid services.
- Free basemap through the single config constant. Keep OSM attribution visible.
- MapLibre for the map. Three line layers by status (solid, dashed, dotted). Never rely on colour alone.
- Filter updates stay under 100 ms; use layer filters, do not recreate sources.
- Do not add a dependency without asking. Currently avoided: chart libraries, Turf, image libraries.
- Adding a city must need data files only, no code changes.
- No `localStorage` or `sessionStorage` use unless the owner approves it for a specific feature.
- Station marker geometry and colours belong in `lib/station-style.ts`; shared station/segment visibility rules belong in `lib/filter-utils.ts`.

## Data rules
- Never invent real-world facts. Unknown values stay `null` and produce an audit warning.
- Never hand-edit generated files in `data/` (`cities.json`, `lines.json`, `segments.geojson`, `stations.geojson`). Fix overrides or pipeline rules, rebuild, re-audit.
- Every value that comes from outside OSM needs a URL in `references` and a `last_verified` date.
- `last_verified` means checked against an official source. The pipeline must not set it automatically. `retrieved_at` is the machine fetch date.
- Operator belongs to the line; segments inherit it.
- `geometry_quality` is evidence-based: use `exact` for surveyed/construction-stage geometry and `schematic` for hand-drawn or station-derived alignments.
- Keep backward-compatible `del-silver` URL/search aliases for the Golden Line.
- A city must pass `validate:data` and `audit:data` with zero errors before merging.
- Follow the source hierarchy in `docs/DATA-STANDARDS.md`. Wikipedia is never a sole source.
- A warning must not be baselined if it hides a missing line end, a missing terminal, a line with no stations, or doubled geometry. Fix it or leave it failing.
- One line is one centreline. Twin-track (per-direction) geometry is merged in the pipeline and each line's length is counted once in every total.
- A branched line must list every branch terminal in its reference file.
- Stations that belong to an operator's line stay with that line's network even where they lie outside the city boundary (for example DMRC Blue Line stations in Noida). City bounding boxes must cover the whole network, not only the city.
- Cross-network interchanges (for example Delhi and Gurugram at Sikanderpur) are linked, never duplicated without a link.
- Do not set last_verified for OSM-only records.

## Testing
- Every new rule or pipeline fix gets a unit test with a small fixture.
- From M9 onward, e2e tests run against the static export as well as the dev server.
- Include a mobile viewport in e2e checks for any UI change.
- Every new audit rule gets a failing fixture shaped like the real defect and a passing fixture.
- No city or geometry PR is ready for merge without the docs/VISUAL_QA.md checklist and screenshots attached.

## Communication
- Show assumptions in one line instead of guessing silently.
- If a requirement conflicts with these rules or with the data standards, stop and ask.
- Keep final summaries short: what changed, what was verified, what is left.

## Public-usability plan rules

- Never add fares, timings or interchange links without a specific official source.
- If a city's fares are unsourced, hide the fare feature for that city entirely. No placeholder and no estimates.
- Use mock data while testing; load real data only when it is usable and sourced.
- Do not claim verification you did not run. Paste real command output or counts.
- Report real unit and e2e counts, build page count, `validate:data` result and `audit:data` summary after every milestone.
- If a path or definition is ambiguous (for example, what counts as Tier 1), report it instead of guessing.