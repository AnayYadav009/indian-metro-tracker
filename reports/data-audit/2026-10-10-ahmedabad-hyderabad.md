# Ahmedabad and Hyderabad future corridors

## Hyderabad Old City extension

Added `hyd-green-seg-02` to the Hyderabad overrides:

- Line: Green Line / Corridor II
- Status: construction
- Phase: 2
- OSM way: `770841024`
- Geometry: sourced from the cached OSM construction way
- References: HMRL and the OSM way
- Completion date: null and explicitly unconfirmed

The paired reverse-direction OSM way is part of the same route geometry and is
not duplicated as a second segment. No future station names or coordinates
were added because the available source data did not provide an authoritative
station list.

Hyderabad now has 4 generated segments, including 1 construction segment, and
57 stations. The city build passed schema and relational validation.

## Ahmedabad GIFT City–Shahpur

The repository reference identifies this as a Phase 2B extension, with an
official GMRC source URL recorded in the reference metadata. A forced
Ahmedabad Overpass refresh succeeded, but the response contained no
construction or proposed railway geometry for GIFT City–Shahpur. The current
OSM data only provides the operational GNLU–GIFT City geometry.

Accordingly, no Ahmedabad segment was added. Adding one would require either:

1. a verified OSM construction/proposed geometry relation; or
2. a source-backed schematic alignment with explicitly sourced coordinates.

Neither is currently available in the repository. No coordinates or station
names were invented.

Ahmedabad remains at 4 generated operational segments and 54 stations.

## Validation

- Hyderabad rebuild: passed.
- Ahmedabad rebuild after forced OSM refresh: passed.
- Full schema/data validation: passed (60 segments, 717 stations).
- Lint: passed.
- Typecheck: passed.
- Audit: 30 existing dataset-wide errors and 271 un-baselined warnings remain.
