# Delhi map issues — C2 remediation

## Confirmed changes

- The Delhi Overpass query now fetches station nodes through the selected route
  relations (`node(r)`), so terminal stations outside the Delhi bbox are retained.
- Generated route geometry is projected to the first and last nearby assigned
  stations and sliced between those projections. This removes route-relation
  turn-back/depot geometry outside the station span without hand-editing
  generated GeoJSON.
- The audit includes `reference-station-missing`, `station-gap`,
  `polyline-hook`, and `station-outside-bbox-on-segment` findings.

## Station counts

| Line | Before C2 | After C2 |
|---|---:|---:|
| Red | 22 | 23 |
| Yellow | 37 | 37 |
| Blue | 48 | 50 |
| Green | 25 | 26 |
| Violet | 20 | 27 |
| Airport Express | 8 | 8 |
| Pink | 43 | 45 |
| Magenta | 32 | 34 |
| Grey | 4 | 4 |

Delhi increased from 215 to 228 stations. The additional stations are supplied
by relation-member nodes in the forced Overpass response, not by invented
coordinates.

## Audit

The generated data validates successfully: 0 schema or relational errors.
The full audit reports 0 errors after the station-distance and station-count
proximity tolerance was aligned at 250 m, 433 Delhi warnings, and 1 Delhi info
finding.
The repository-wide audit has 0 errors, 1,015 warnings, and 22 info findings;
532 warnings are not in the existing baseline. Warnings include known
reference-count differences and the newly enabled geometry checks.

## Verification

- `npm run validate:data` — passed (665 stations, 55 segments, 44 lines).
- C2 targeted tests — passed (57 tests).
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- Full unit suite — passed.
- Forced Delhi pipeline rebuild — passed.

The requested visual before/after screenshots for Red, Violet, Blue, Yellow,
and Pink were not captured in this non-browser validation pass; the generated
debug GeoJSON and audit reports are the reproducible geometry evidence.
