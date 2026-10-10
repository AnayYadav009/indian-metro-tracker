# Task D diagnosis — planned and proposed data

## Generated status counts

The generated line schema does not currently include a line-level `status`
field, so line counts are reported by city and the status counts below are for
segments and stations.

| City | Lines | Operational segments | Construction segments | Planned segments | Operational stations | Construction stations | Planned stations |
|---|---:|---:|---:|---:|---:|---:|---:|
| Hyderabad | 3 | 3 | 0 | 0 | 57 | 0 | 0 |
| Gurugram | 1 | 2 | 0 | 0 | 11 | 0 | 0 |
| Navi Mumbai | 1 | 1 | 0 | 0 | 11 | 0 | 0 |
| Noida | 1 | 1 | 0 | 0 | 21 | 0 | 0 |
| Chennai | 5 | 2 | 3 | 0 | 41 | 0 | 0 |
| Pune | 3 | 2 | 1 | 0 | 28 | 1 | 0 |
| Bengaluru | 5 | 3 | 2 | 1 | 82 | 2 | 0 |
| Mumbai | 7 | 7 | 2 | 1 | 63 | 11 | 0 |
| Kolkata | 5 | 5 | 2 | 1 | 55 | 1 | 0 |
| Ahmedabad | 4 | 4 | 0 | 0 | 53 | 0 | 0 |
| Delhi | 9 | 11 | 1 | 0 | 219 | 9 | 0 |
| **Total** | **44** | **41** | **11** | **3** | **641** | **24** | **0** |

There are **no generated planned stations** and no generated `proposed`
records. Planned geometry exists in Bengaluru, Mumbai, and Kolkata; Delhi has
no generated Golden Line geometry. Delhi's generated construction geometry is
the OSM-derived Magenta extension (`del-magenta-seg-02`).

## Existing pending corridor

`data/overrides/pending-unverified.json` contains two unverified Golden Line
segments:

1. Aerocity–Tughlakabad main corridor, marked construction.
2. Lajpat Nagar–Saket G Block branch, marked planned.

They have coordinates and dates but **no `references` field**, so they cannot
be promoted under the project data standards. Their `expected_completion`
values are also unsupported by a source in the file and must remain null until
verified.

## Proposed future corridors

Only the following corridor is sufficiently identified for a future
ingestion proposal:

| Corridor | Candidate status | Geometry quality | Source | Promotion state |
|---|---|---|---|---|
| Delhi Golden Line / Line 10, Aerocity–Tughlakabad | construction | `schematic` until official alignment geometry is obtained | [DMRC official website](https://delhimetrorail.com/) for authoritative project material; [Metro Rail Guy report](https://themetrorailguy.com/2024/01/27/delhi-metros-silver-line-renamed-to-golden-line-line-10/) verifies the rename and describes the corridor | Do not promote yet; official alignment document and station geometry still need to be attached |
| Lajpat Nagar–Saket G Block branch | planned | `schematic` only if an official alignment source is obtained | DMRC official project material required; current pending record has no citation | Do not promote yet |

The cited secondary report states that the Golden Line was renamed from Silver
Line and describes the Aerocity–Tughlakabad corridor. It is not sufficient by
itself to establish exact coordinates, opening dates, or branch geometry.

No proposed corridor is recommended for addition without a source containing
an alignment or station list. OSM construction/proposed ingestion should be
extended only after fixtures and source metadata are defined.

## Recommended implementation after approval

- Add `geometry_quality: "schematic" | "exact"` to the segment schema.
- Extend normalization to accept OSM construction and proposed railways.
- Require `references` for every non-operational segment and station.
- Keep unknown dates null and emit an audit warning.

## Implementation result

Approval was granted to proceed. The pipeline now:

- accepts the sourced Golden Line construction corridor and planned branch as
  schematic geometry;
- ingests construction/proposed OSM stations and ways already present in the
  raw response;
- renders schematic future geometry thinner than exact geometry;
- labels schematic routes in the legend and metadata panel;
- validates missing future dates and missing future references through audit
  findings.

The active generated dataset now contains 45 lines, 57 segments, and 665
stations. Delhi contains 10 lines, 14 segments, and 228 stations, including
the two Golden Line schematic segments. Generated validation passes and the
final audit has 0 errors, 1,073 warnings, and 22 info findings; 589 warnings
remain un-baselined.

The current OSM response did not provide a reliable Golden-specific station
relation, so only two proximity-associated existing stations were linked to
the new line. No additional Golden station names were invented. Exact future
station association remains a follow-up requiring an authoritative station
list or route relation.
- Add sourced future station fixtures and render schematic routes with a
  thinner style plus a legend/metadata note.
