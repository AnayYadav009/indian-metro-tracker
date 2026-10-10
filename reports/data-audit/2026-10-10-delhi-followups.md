# Delhi follow-ups

## 1. Yellow endpoint association

The pipeline now uses relation-member stations during terminal-span trimming
and snaps a trimmed endpoint to a nearby assigned station when the relation
geometry ends within 1 km. Delhi was rebuilt through the pipeline.

`Samaypur Badli` remains 656 m from the generated Yellow geometry, so the
audit error remains. The cached OSM route relation endpoint is not colocated
with the station node, and the current normalized station association does not
provide a trustworthy endpoint coordinate to replace it. No generated file was
hand-edited and no station coordinate was invented.

This remains an actionable pipeline/data issue rather than a baseline entry.

## 2. Phase 4 topology findings

The new OSM-backed Phase 4 ways expose expected disjoint/branch gaps:

- Red Phase 4 way is separated from the operational Red relation.
- Golden branch is a branch, not a continuation of the main Golden segment.
- Magenta Phase 4 ways represent disjoint construction stretches.
- Blue and Green have pre-existing branch/disjoint relation gaps.

These findings are retained as warnings. They were not suppressed globally.
The remaining endpoint warnings for Red and Golden require authoritative
terminal station associations before geometry is trimmed further.

## 3. Official Golden Line station list

DMRC pages retrievable during this run exposed only the generic official
homepage. The network-map and route-map pages did not expose a machine-readable
station list or an official Golden Line station document. The repository
reference contains terminal names and station counts, not a complete station
array. No Golden station names or coordinates were added.

## 4. Aerocity–Terminal 1 extension

The cached OSM proposed ways named “Airport Express Line (Orange) Extension”
were inspected. Their coordinates form a separate proposed geometry around
approximately 77.03–77.07 longitude and do not establish the
Aerocity–Terminal 1 alignment. The available way named
“Tughlakabad to Domestic Airport (Phase-4)” is associated with the Golden
Line, not the Airport Express.

No Airport Express Aerocity–Terminal 1 segment was added because a reliable
official or matching geometry source was not found.

## Validation

- Delhi rebuild: passed.
- Typecheck: passed.
- Lint: passed.
- Schema/data validation: passed.
- Focused tests: 24 passed.
- Full audit: still has 30 dataset-wide errors; Delhi retains one
  `station-far-from-all-segments` error for Samaypur Badli.
