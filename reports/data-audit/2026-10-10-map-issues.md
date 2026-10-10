# Delhi map issues diagnostic

Date: 2026-10-10

This is a read-only C1 diagnostic. No generated data, pipeline logic, or
overrides were changed for this report.

## Inputs and method

- Delhi override bbox: `[76.84, 28.4, 77.35, 28.88]`.
- Cached OSM pull: `data/raw/delhi.json`, OSM base timestamp
  `2026-10-06T04:53:04Z`.
- Query implementation: `scripts/pipeline/fetch-overpass.ts`.
- Normalization implementation: `scripts/pipeline/normalize.ts`.
- Merge, dedupe, assignment, and timeline metadata:
  `scripts/pipeline/merge-overrides.ts`.
- Active generated data: `data/segments.geojson` and `data/stations.geojson`.

The debug geometries are in
[2026-10-10-map-issues-debug.geojson](./2026-10-10-map-issues-debug.geojson).

## Station stage counts

`raw relation members` counts station-role node references in the route
relation. `normalized named nodes` counts those references for which a named
station node was actually present in the Overpass element set and therefore
entered `stationsMap`. `deduped names` applies the current name cleanup and
case-insensitive name dedupe approximation. `final features` is the generated
station count assigned to the line.

| Line | Raw relation members | Normalized named nodes | Deduped names | Final features |
|---|---:|---:|---:|---:|
| Red | 29 | 10 | 10 | 22 |
| Yellow | 37 | 0 | 0 | 37 |
| Blue | 58 | 0 | 0 | 48 |
| Green | 24 | 0 | 0 | 25 |
| Violet | 34 | 0 | 0 | 20 |
| Airport Express | 7 | 0 | 0 | 8 |
| Pink | 47 | 0 | 0 | 43 |
| Magenta | 33 | 0 | 0 | 32 |
| Grey | 4 | 0 | 0 | 4 |

The generated counts include proximity and manual assignment paths, so they
are not expected to equal the normalized relation-member count.

### Confirmed station-loss cause

The Overpass request is bbox-scoped for both route relations and standalone
station nodes. `normalizeOverpassCity` creates `stationsMap` only from named
station nodes returned by the standalone node clauses. Relation station
members are then attached only when `stationsMap.has(m.ref)` is true.

In this cache, the relation member IDs for Yellow, Blue, Green, Violet, Pink,
and other lines are present as relation references, but their named node
elements are absent from the response. Consequently, relation membership is
lost during normalization before dedupe. This confirms the core hypothesis:
outer-NCR station acquisition is clipped/under-returned by the bbox query and
the normalizer does not retain route-member station references independently.

The current merge then partially recovers stations through proximity to the
override-backed geometry and manual station assignments. This explains why
some final counts exist despite zero normalized named relation nodes.

### Other checks

- No raw named station node with coordinates was outside the Delhi bbox in
  this cache. This does not disprove the bbox cause: the missing relation
  member node bodies are absent rather than returned with out-of-bbox
  coordinates.
- No evidence showed `interchangeStationNames` causing the outer-end losses.
  That list is used for interchange marking, not station removal.
- The timeline filter does not remove stations during the build. `opened_on`
  is assigned as null unless a station override supplies it; null dates are
  intentionally retained as undated records. Timeline visibility can hide
  future-status records at runtime, but it cannot explain the missing raw
  relation members.

## Station gaps over 3 km

Distances below are along the generated segment after projecting station
points onto the polyline:

- Blue: Vaishali → Noida Golf Course, 8.17 km.
- Violet: Harkesh Nagar Okhla → Mohan Estate, 3.52 km.
- Violet: Mohan Estate → Badhkal Mor, 11.09 km.
- Airport Express: Dwarka Sector 21 → IGI Airport, 3.10 km;
  IGI Airport → Delhi Aerocity, 3.44 km; Aerocity → Dhaula Kuan, 6.91 km;
  Dhaula Kuan → Shivaji Stadium, 6.69 km.
- Pink: Shiv Vihar → Jaffrabad, 5.30 km; Mayur Vihar - I → Sarai Kale
  Khan - Nizamuddin, 4.45 km; Sir M. Vishweshwaraiah Moti Bagh → Delhi
  Cantt, 5.14 km; Shalimar Bagh → Majlis Park, 3.97 km.
- Magenta: Sadar Bazar Cantonment → Palam, 3.08 km.
- Grey: Dwarka - Kakrola → Najafgarh, 3.61 km.

## Segment geometry diagnostics

The short-turn metric uses the deflection from the incoming to outgoing
vertex and reports turns sharper than 150 degrees within a 1 km local span.
Repeated coordinates and true non-adjacent segment intersections are counted
separately.

| Segment | Repeated coordinates | Self-intersections | Notable endpoint distance | Notes |
|---|---:|---:|---|---|
| Red | No | 0 | 6.73 km to Raj Bagh | Outer end is not station-terminated |
| Yellow | Yes | 1 | 446 m / 3 m | Repeated coordinates and a north-end hook candidate |
| Blue main | No | 0 | 4.21 km to Vaishali | Outer NCR endpoint gap |
| Blue branch | No | 0 | 6 m / 12 m | No hook evidence |
| Green main/branch | No | 0 / 0 | within 150 m | No self-intersection evidence |
| Violet | No | 0 | 9.22 km to Badhkal Mor | Faridabad endpoint gap |
| Pink | Yes | 2 | 106 m / 234 m | Repeated coordinates and loop/hook candidates |
| Magenta 1/2 | Yes / No | 0 / 0 | not material | Repeated coordinate only on first segment |
| Grey | Yes | 0 | not material | Repeated coordinate |

The Yellow and Pink findings are consistent with route relation geometry
containing a turn-back/depot-like loop or stitched branch, but this diagnostic
does not yet modify or trim the geometry. The debug GeoJSON contains the 12
offending Delhi segment features selected by repeated coordinates, detected
self-intersections, >3 km vertex gaps, or endpoint distances over 150 m.

## Visual evidence

The attached browser screenshot shows the Delhi network with station markers
visible. Yellow's northern run and Pink's northern/eastern loop area are
visible in the map view. The map was not edited; basemap tile requests were
partially unavailable during capture, so the screenshot is evidence of the
current application rendering rather than a source map.

## C1 conclusion and proposed C2 direction

1. **Confirmed:** bbox-scoped station retrieval plus the normalizer's
   `stationsMap` dependency drops route-member station bodies before dedupe.
2. **Confirmed:** missing outer stations are not caused by interchange-name
   dedupe or by the timeline visibility predicate.
3. **Confirmed:** Yellow and Pink contain repeated coordinates; Yellow has one
   and Pink has two detected non-adjacent self-intersections.
4. **Confirmed:** several lines have >3 km station gaps and Red/Violet/Blue
   have terminal-end distances that require station/geometry reconciliation.

No C2 fix was applied. Owner approval is required before changing station
acquisition, trimming segments between projected terminal stations, or adding
the requested audit rules and regression fixtures.
