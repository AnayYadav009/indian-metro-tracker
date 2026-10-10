# Project Rules: Indian Metro Network Tracker

Always-on rules for every agent session. If you have an older version of this file, replace it with this one and keep any project-specific path lines your setup needs.

## Read first (in this order)
1. `docs/BLUEPRINT.md`
2. `docs/MILESTONES.MD` (M1 to M7, complete) and `docs/MILESTONES-v2.md` (M8 onward, current)
3. `docs/DATA-STANDARDS.md`
4. `docs/DATA_AUDIT.md`
5. `docs/CITY_ONBOARDING.md` (when touching city data)

## Process
- Work on one milestone at a time. Never start the next one.
- Before writing code, post a plan and wait for owner approval.
- Stop at every **STOP** marker in the milestone and wait.
- Before saying a task is done, report results of `lint`, `typecheck`, `test`, `validate:data`, and `audit:data` (when data is involved). Do not claim success without running them.
- Keep PRs small: one milestone step or one city per PR.

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

## Testing
- Every new rule or pipeline fix gets a unit test with a small fixture.
- From M9 onward, e2e tests run against the static export as well as the dev server.
- Include a mobile viewport in e2e checks for any UI change.

## Communication
- Show assumptions in one line instead of guessing silently.
- If a requirement conflicts with these rules or with the data standards, stop and ask.
- Keep final summaries short: what changed, what was verified, what is left.