# Phase 1 — Raw OSM cache refresh and rebuild diff

Date: 2026-10-15  
Branch: `fix/m10-audit-errors`  
Baseline: `2ced508` (Phase 0 test fix committed first)

## Phase 0 test fix

The two additional map layers are intentional and were introduced in commit `4f25618` for schematic rendering: `schematic-lines` draws schematic segments with a dashed stroke, and `selected-schematic-segment-glow` draws the dashed selection glow for a selected schematic segment. `shared_corridor` does not create map layers; it is audit metadata. The test now names/asserts both intended layer IDs and expects 10 total layers.

Full unit suite on the normal local filesystem (outside the sandbox):

```text
Test Files  30 passed (30)
Tests       250 passed (250)
Exit code: 0
```

## Fetches

Used the existing `npm run pipeline:fetch -- --city=<id> --force` command, backed by `scripts/pipeline/fetch-overpass.ts` and the Overpass API. No ad-hoc scraper was used.

| City | Fetch/cache snapshot UTC | Fetch result | Final cache |
|---|---|---:|---|
| Delhi | 2026-10-15 10:23:06Z | Saved 894 elements | Kept |
| Pune | 2026-10-15 10:24:06Z | Saved 210 elements | Kept |
| Chennai | fetched at 2026-10-15 15:56 IST; 207 elements saved | Reverted after corridor regression | Prior cache restored (`timestamp_osm_base` 2026-10-10 08:58:25Z) |
| Kolkata | 2026-10-15 10:26:02Z | Saved 193 elements | Kept |

The final Delhi, Pune and Kolkata raw caches have the same element counts and IDs as the committed pre-refresh caches; their only committed raw-file change is `osm3s.timestamp_osm_base`. The fetched Chennai cache also reported 207 elements, but its way geometry changed enough to cause a material build regression, so it was not retained.

## Baseline and final city results

| City | Stations before | Stations after | Added / removed station IDs | Errors before | Errors after | Warnings before | Warnings after |
|---|---:|---:|---:|---:|---:|---:|---:|
| Delhi | 240 | 240 | 0 / 0 | 7 | 7 | 538 | 538 |
| Pune | 29 | 29 | 0 / 0 | 4 | 4 | 35 | 35 |
| Chennai | 41 | 41 | 0 / 0 | 2 | 2 | 46 | 46 |
| Kolkata | 57 | 57 | 0 / 0 | 2 | 2 | 100 | 100 |

Audit findings compared by `(city_id, rule, subject)`: **0 added, 0 cleared**. Overall audit remains **27 errors, 1,221 warnings, 20 info** (46 pending report-only findings). The refreshed data did not close or create an audit finding after Chennai's cache was restored.

## Compiled operational line-length snapshot

Lengths are the summed haversine lengths of current operational segment geometries, in km. The before/after values are identical for every listed line; the pipeline did not change any segment geometry or station coordinates in the final build.

| City | Line ID | Before km | After km | Delta |
|---|---|---:|---:|---:|
| Delhi | `del-red` | 33.38 | 33.38 | 0.00 |
| Delhi | `del-yellow` | 47.39 | 47.39 | 0.00 |
| Delhi | `del-blue` | 63.85 | 63.85 | 0.00 |
| Delhi | `del-green` | 28.00 | 28.00 | 0.00 |
| Delhi | `del-violet` | 44.74 | 44.74 | 0.00 |
| Delhi | `del-airport` | 23.80 | 23.80 | 0.00 |
| Delhi | `del-pink` | 61.43 | 61.43 | 0.00 |
| Delhi | `del-magenta` | 35.75 | 35.75 | 0.00 |
| Delhi | `del-grey` | 6.04 | 6.04 | 0.00 |
| Delhi | `del-golden` | 0.00 | 0.00 | 0.00 |
| Pune | `pun-purple` | 16.59 | 16.59 | 0.00 |
| Pune | `pun-aqua` | 14.57 | 14.57 | 0.00 |
| Pune | `pun-line-3` | 0.00 | 0.00 | 0.00 |
| Chennai | `che-blue` | 31.39 | 31.39 | 0.00 |
| Chennai | `che-green` | 21.12 | 21.12 | 0.00 |
| Chennai | `che-corridor-3` | 0.00 | 0.00 | 0.00 |
| Chennai | `che-corridor-4` | 0.00 | 0.00 | 0.00 |
| Chennai | `che-corridor-5` | 0.00 | 0.00 | 0.00 |
| Kolkata | `kol-blue` | 31.43 | 31.43 | 0.00 |
| Kolkata | `kol-green` | 15.06 | 15.06 | 0.00 |
| Kolkata | `kol-purple` | 7.84 | 7.84 | 0.00 |
| Kolkata | `kol-yellow` | 6.41 | 6.41 | 0.00 |
| Kolkata | `kol-orange` | 9.84 | 9.84 | 0.00 |

No final line changed by more than 2%. The generated compiled-file diff is retrieval metadata only (`retrieved_at` advanced to 2026-10-15 on segments/stations for Delhi, Pune and Kolkata); geometry arrays and station coordinates compare unchanged.

## Chennai refresh regression and rollback

The fetched Chennai cache rebuilt to 43 stations (two more than baseline 41) but reduced Corridor 4's total segment geometry from 15.01 km to 4.62 km: −10.39 km / −69.2%. This exceeded the task's regression condition, so only `data/raw/chennai.json` was restored to its pre-refresh content and Chennai was rebuilt again. Final Chennai output returned to 41 stations and 15.01 km Corridor 4 total geometry. The Corridor 3 ways remained role `inactive` and were not enabled; the build logged the two filtered members of relation 12824257 (952378463 and 1188056520).

## Rebuild and final audit output

All four city builds passed isolated and merged dataset validation. Relevant output:

```text
Delhi: Generated 16 validated segments and 240 stations. City DELHI passed validation successfully.
Pune: Generated 3 validated segments and 29 stations. City PUNE passed validation successfully.
Chennai (final restored-cache build): Generated 4 validated segments and 41 stations. City CHENNAI passed validation successfully.
Kolkata: Generated 8 validated segments and 57 stations. City KOLKATA passed validation successfully.
```

Final `npm run audit:data`:

```text
Delhi: 7 errors, 538 warnings
Pune: 4 errors, 35 warnings
Chennai: 2 errors, 46 warnings
Kolkata: 2 errors, 100 warnings
Errors: 27
Warnings: 1221
Info: 20
Accepted warnings (reviewed): 1083
Unreviewed warnings: 94
Pending rules (report-only): 46
Exit code: 1 (active errors remain)
```

## Files committed in Phase 1

Kept refreshed raw caches: `data/raw/delhi.json`, `data/raw/pune.json`, `data/raw/kolkata.json`. Rebuilt `data/segments.geojson` and `data/stations.geojson` so their retrieval metadata matches those caches. Chennai's raw file is restored. No geometry, station coordinates, overrides, or line/city metadata were edited.

The e2e-regenerated `reports/data-audit/chennai-qa-screenshot.png` and `kolkata-qa-screenshot.png` remain unstaged. `data/cities.json` and `data/lines.json` have empty content diffs and remain unstaged as line-ending noise.

**Phase 1 stop point:** no Phase 2 geometry work has started. Review this refresh diff before continuing.
