# Known data issues

Snapshot source: generated `reports/data-audit/2026-10-15.json` and `data/audit/coverage-gaps.json`, checked against the repository state on 2026-10-16. The open audit issues are parked for feature work. Features must avoid presenting incomplete coverage or unreliable totals as complete.

## Active audit errors (21)

| City | Line / finding | What is wrong | User-visible impact |
|---|---|---|---|
| Bengaluru | Green Line (`blr-green-seg-01`) | Geometry folds back/parallel for about 719 m. | Route shape and mapped extent may be misleading around the fold. |
| Bhopal | Orange Line / city total | Compiled operational length 5.58 km differs from reference 6.22 km (10.2%). | Displayed city/line length may understate the cited network length. |
| Chennai | Corridor 5 | Geometry folds back/parallel for about 381 m. | The mapped route may show a false doubled stretch. |
| Delhi NCR | Pink Line | 38 operational stations compiled vs 45 in reference. | Seven stations are absent; station search, coverage and totals are incomplete. |
| Delhi NCR | Grey Line terminal, Dwarka | Terminal is 1,233 m from the nearest geometry endpoint. | The displayed line end may not reach its named terminal. |
| Delhi NCR | Pink Line terminal, Shiv Vihar | Terminal is 3,399 m from the nearest geometry endpoint. | The mapped operational Pink route may appear truncated. |
| Delhi NCR | Blue Line overlap | Parallel geometry for about 525 m. | A stretch may be double-counted or falsely duplicated. |
| Delhi NCR | Green Line overlap | Parallel geometry for about 424 m. | A stretch may be double-counted or falsely duplicated. |
| Delhi NCR | Grey Line geometry | Fold/parallel run for about 327 m. | The map may show a doubled or backtracking section. |
| Delhi NCR | Pink Line geometry | Fold/parallel run for about 660 m. | The route shape and measured length may be misleading. |
| Gurugram | Rapid Metro terminal, Cyber City | Terminal is 1,226 m from nearest geometry endpoint. | The mapped line may not appear to reach Cyber City. |
| Gurugram | Rapid Metro geometry | Fold/parallel run for about 563 m. | The map may show a doubled or backtracking section. |
| Mumbai | Line 1 construction connector | Declared `mum-line-1-schematic-01` has no compiled segment. | A declared connector is absent from the map; intended stations/extent are unclear. |
| Nagpur | Aqua Reach 3A | Lokmanya Nagar–Hingna declared but no compiled construction feature. | Planned/construction coverage is absent from the map. |
| Nagpur | Aqua Reach 4A | Prajapati Nagar–Transport Nagar declared but not compiled. | Planned/construction coverage is absent from the map. |
| Nagpur | Orange Reach 2B | Automotive Square–Kanhan River declared but not compiled. | Planned/construction coverage is absent from the map. |
| Nagpur | Orange Reach 1A | Khapri–Butibori MIDC ESR declared but not compiled. | Planned/construction coverage is absent from the map. |
| Pune | Purple Line, PCMC–Nigdi | Declared corridor has no compiled construction feature. | Extension is not shown, and its station coverage is unavailable. |
| Pune | Purple Line, Range Hill infill | Declared corridor has no compiled construction feature; scope/status unclear. | The declared infill is absent and cannot be interpreted reliably. |
| Pune | Purple Line, Swargate–Katraj | Declared corridor has no compiled construction feature. | Extension is not shown, and its station coverage is unavailable. |
| Pune | Line 3 | Geometry folds back/parallel for about 1,946 m. | Route shape and derived distance may be substantially misleading. |

## Tracked coverage gaps (7)

| City | Line / stretch | Status | What is missing | User-visible impact |
|---|---|---|---|---|
| Ahmedabad | Violet — GIFT City–Shahpur Phase 2B | Planned / procurement | Sourced alignment and station positions are unavailable. | The extension is intentionally not drawn; future coverage is incomplete. |
| Chennai | Corridor 3 — Madhavaram–SIPCOT | Under construction | Refreshed source lacks a verified SIPCOT 2 endpoint coordinate/alignment. | The active construction corridor is not drawn. |
| Kolkata | Yellow — Jai Hind Airport–Michael Nagar | Under construction | Michael Nagar node/terminal coordinate is missing from refreshed cache. | Construction progress is represented as a gap, not as a route. |
| Kolkata | Yellow — New Barrackpore–Barasat | Planned / delayed | Verified terminal coordinates and alignment are missing. | Delayed future route is not drawn. |
| Kolkata | Pink — Baranagar–Barrackpore | Under construction | Declared stretch has no matching compiled geometry. | The balance corridor is not drawn. |
| Mumbai | Line 2B — Phase 2, Chembur–DN Nagar | Under construction | Matching route geometry is unavailable. | The remaining phase is not drawn. |
| Noida | Aqua — Sector 142–Botanical Garden | Planned | Corridor is listed as upcoming; partial proposed geometry is not compiled. | The branch extension is not drawn as operational service. |

For the two Kolkata Yellow stretches above, the status of Michael Nagar–New Barrackpore is not established by the cited PIB release and remains an owner/source question. Open owner decisions and the current error inventory are detailed in [`progress/2026-10-15-error-fix-3.md`](progress/2026-10-15-error-fix-3.md) and [`data-audit/2026-10-15.md`](data-audit/2026-10-15.md).
