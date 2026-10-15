# Phase 2 — Delhi Pink route topology review

Date: 2026-10-15  
Branch: `fix/m10-audit-errors`

## Result

No geometry was committed. The current Pink Line segment remains at 38 stations
and 61.4 km; the generated audit remains at 27 errors citywide, including the
Pink station-count, terminal, and fold findings. A source-level trial with the
refreshed OSM cache did not satisfy both endpoint and length gates, so changing
the compiled output or treating that trial as a fix would be misleading.

## Evidence

- DMRC's present-network page records the Majlis Park–Maujpur-Babarpur stretch
  as opened on 08 March 2026: <https://delhimetrorail.com/pages/about-us/present-network>.
- DMRC's March 2026 network map is indexed at
  <https://delhimetrorail.com/static/media/DMRC-Network-Map_Jan2026_Hindi-English-13.03.2026.147097c4.pdf>.
- The refreshed `data/raw/delhi.json` contains route relations 8241298 and
  8242437. The latter normalizes to 71.349 km with endpoints near Maujpur and
  Shiv Vihar. The source geometry therefore has a plausible length (0.28% below
  the 71.548 km reference), but this is not the merged output.
- An in-memory source/override build trial selecting relation 8242437 and
  unexcluding the seven OSM station nodes (Burari, Jharoda Majra,
  Jagatpur-Wazirabad, Nanaksar-Sonia Vihar, Khajuri Khas, Bhajanpura, Yamuna
  Vihar) produced 45 Pink Line stations, but the existing trimming logic emitted
  only 68.8 km and endpoints at Yamuna Vihar and Shiv Vihar. The output misses
  the reference terminal Majlis Park and loses 2.55 km relative to the raw
  relation traversal. It fails the endpoint gate even though its length is
  within 5% of reference.
- Existing override exclusions for those seven station IDs explain why the
  current compiled station count is still 38. They were intentionally left in
  place pending a valid complete geometry; the simulation did not write files.

## NEEDS-OWNER

Confirm the intended representation of the now-completed Pink Line in the
single-segment data model: (a) a closed ring with a duplicated coordinate at
the chosen cut point, or (b) a linear segment with the legacy Majlis Park and
Shiv Vihar endpoints. DMRC's current network source establishes the new
extension and ring connectivity but does not resolve which topology this
project's endpoint audit should require. Once decided, the seven OSM station
nodes can be included with their OSM node IDs as coordinate provenance, and the
route can be ordered against the official station list before rebuilding.

No data or generated output was modified in this review.
