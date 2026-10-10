# Noida, Pune, and Kolkata future corridors

## Noida Sector 142–Botanical Garden

Added `noi-aqua-seg-02` to the Noida overrides:

- Status: construction
- Phase: 2
- Expected completion: `2030` from the existing reference metadata
- OSM way: `538930428`
- Geometry quality: exact
- References: DD News source metadata and the OSM way

The segment was rebuilt from the cached proposed OSM geometry. No future
station names or coordinates were added.

## Pune PCMC–Nigdi and Swargate–Katraj

The Pune reference metadata identifies both extensions as construction
corridors. The cached Overpass response contains no matching proposed or
construction geometry for either corridor. It contains construction geometry
for Line 3 (Hinjawadi–District Court), which is already represented, but no
geometry that can safely be associated with PCMC–Nigdi or Swargate–Katraj.

Neither corridor was added. Adding a schematic alignment would require
source-backed coordinates that are not present in the repository.

## Kolkata Baranagar–Barrackpore

The Kolkata reference metadata identifies the Pink corridor as sanctioned/
planned. The cached Overpass response contains construction ways for the
Yellow, Orange, Purple, and Green corridors, but no proposed or construction
way for Baranagar–Barrackpore. The existing `kol-pink-seg-01` remains a
metadata-only planned record without invented coordinates.

No geometry or station names were added.

## Validation

- Noida rebuild: passed.
- Full generated-data validation: passed (61 segments, 717 stations).
- Lint: passed.
- Typecheck: passed.
- Audit: 30 existing dataset-wide errors and 276 un-baselined warnings remain.

The two Pune corridors and Kolkata Pink corridor require either verified OSM
geometry or source-backed schematic coordinates before implementation.
