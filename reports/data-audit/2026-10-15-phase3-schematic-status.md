# Phase 3 — schematic and sourced-coordinate review

Date: 2026-10-15  
Branch: `fix/m10-audit-errors`

No schematic segment was added in this phase. The required evidence did not
support both endpoints and an acceptable alignment for any of the listed
targets. No coordinates were inferred from map images or nearby place labels.

| City / stretch | Status evidence | Current-cache coordinate check | Result |
|---|---|---|---|
| Nagpur Aqua 3A, Aqua 4A, Orange 2B, Orange 1A | Current reference identifies Phase 2 reaches, but cited construction award evidence is secondary and no current operator record confirming each physical start was established in this pass. | Refreshed `data/raw/nagpur.json` has no named endpoint station nodes for Hingna, Transport Nagar, Kanhan River, or Butibori MIDC ESR. | NEEDS-OWNER: provide or approve an official per-reach status source and endpoint coordinates/alignment. |
| Pune PCMC–Nigdi | Official Maha-Metro project update reports PCMC–Nigdi civil-work progress as of 31 Aug 2026: <https://punemetrorail.org/project-update>. | `data/raw/pune.json` has no Nigdi endpoint station node. | Status verified as construction; no schematic because terminal coordinates are unavailable. NEEDS-OWNER: provide/approve a sourced Nigdi coordinate or alignment. |
| Pune Swargate–Katraj | Maha-Metro tender page identifies the Phase 1 extension, but this pass did not establish a current official physical-start status: <https://www.punemetrorail.org/Tenders.aspx?lang=en-US>. | `data/raw/pune.json` has no Katraj endpoint station node. | NEEDS-OWNER: confirm planned/procurement vs construction and provide/approve terminal coordinates or alignment. |
| Pune Range Hill infill | Maha-Metro's Range Hill station page identifies the station on Corridor 1 and lists past construction-progress updates: <https://www.punemetrorail.org/station/range-hill/?lang=en-US>. | OSM station node 7944584969 (`Range Hills`, 73.8458072, 18.5502871) exists in the refreshed cache. | The source does not verify a distinct infill stretch or its current status. NEEDS-OWNER: confirm whether this declaration means the Range Hill station itself, a station infill between other stations, or another scope. |
| Pune Line 3 | Refreshed `data/raw/pune.json` contains no relation named Line 3/Pink Line, and the override has no OSM source set for the segment. PMRDA's project page confirms the Hinjawadi–Shivajinagar project: <https://www.pmrda.gov.in/en/pune-metro-line-3/>. | No source relation to rebuild. | NEEDS-OWNER: provide/approve a traceable OSM relation or official alignment source. |
| Chennai Corridor 3 | CMRL's current project-status page lists Corridor 3 Madhavaram–SIPCOT at 45.8 km; its 2025 tender page describes active works at Sholinganallur Lake–SIPCOT 2: <https://wcag.chennaimetrorail.org/project-status/>; <https://chennaimetrorail.org/latest-updates/>. | Refreshed `data/raw/chennai.json` contains an OSM node for Madhavaram Milk Colony (14018223514; 80.2414206, 13.1496674) but no SIPCOT 2 / Siruseri SIPCOT endpoint station node. The declared OSM relation 12824257 still has only inactive member ways and remains excluded. | Status verified as construction; no schematic without a sourced second terminal coordinate. NEEDS-OWNER: provide/approve SIPCOT 2 terminal coordinates or a traceable CMRL alignment. |
| Delhi Pink Phase 4 / completed extension | DMRC present-network page records the Majlis Park–Maujpur-Babarpur extension as opened 8 Mar 2026: <https://delhimetrorail.com/pages/about-us/present-network>. | Seven new operational station nodes exist in `data/raw/delhi.json`; see [Phase 2 topology review](2026-10-15-phase2-delhi-pink.md). | Not a schematic extension. NEEDS-OWNER topology decision remains open; no coordinates or geometry changed. |

These are explicit coordinate/status blockers rather than accepted audit
findings. No compiled files or source data were changed in this phase.
