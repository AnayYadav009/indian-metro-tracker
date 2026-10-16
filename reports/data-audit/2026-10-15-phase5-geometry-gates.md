# Phase 5 — geometry rerun under the 300 m / 5% gates

Date: 2026-10-15  
Branch: `fix/m10-audit-errors`

## Noida Aqua branch decision

NMRC's official Upcoming Projects page lists Sector 142–Botanical Garden as an
11.56 km, eight-station extension. In the refreshed `data/raw/noida.json`, way
538930428 is tagged `railway=proposed` and `usage=branch`; it is not an
operational Aqua Line way. The project remains a planned branch within the
existing Noida Aqua line and city/network. The partial proposed way was removed
from the source override and the full declared stretch was added to
`data/audit/coverage-gaps.json`. No separate network was created.

Source: <https://nmrcnoida.com/Projects/Upcoming-projects>.

| Noida metric | Before | After |
|---|---:|---:|
| Audit errors | 1 | 0 |
| Audit warnings | 8 | 5 |
| Stations | 21 | 21 |
| Operational Aqua geometry | 28.0 km | 28.0 km |
| Proposed branch geometry compiled | 2.1 km | 0 km |

The three warnings that disappeared were the old adjacent-segment gap and two
station-gap findings caused by compiling the partial proposed branch. Three
accepted baseline entries are now stale; the baseline was left unchanged.

## Remaining geometry findings

No additional geometry was accepted. None of the remaining edits was backed by
both a verified traversal/alignment and the required endpoint and length gates.
No length change was made for these findings; the 2% figure remains a stretch
target, while the acceptance limit is 5%.

| Finding | Current evidence / disposition |
|---|---|
| Delhi Pink count, Shiv Vihar terminal, ~660 m fold | NEEDS-OWNER topology decision documented in [Phase 2](2026-10-15-phase2-delhi-pink.md). Relation swap trial emitted 45 stations but 68.8 km with a Yamuna Vihar endpoint; not accepted. |
| Delhi Blue overlap ~525 m; Delhi Green overlap ~424 m | UNVERIFIED whether these are shared trunks or duplicate OSM traversal. Required station-within-100-m spatial check and operator station IDs along the overlap were not established; no `shared_corridor` was added. |
| Delhi Grey terminal 1,233 m and fold ~327 m | NEEDS-OWNER: provide/approve a sourced route traversal that ends at Dwarka and satisfies the 5% length gate. |
| Gurugram Cyber City terminal 1,226 m; Rapid fold ~563 m | NEEDS-OWNER: provide/approve a sourced Rapid loop traversal and Cyber City terminal geometry; current route remains outside the 300 m gate. |
| Chennai Corridor 5 fold ~381 m | NEEDS-OWNER: provide/approve the CMRL alignment or OSM way ordering for this loop corridor. |
| Bengaluru Green fold ~719 m | NEEDS-OWNER: provide/approve ordered route-way traversal or official alignment evidence. |
| Pune Line 3 fold ~1,946 m | NEEDS-OWNER: no Line 3 route relation exists in refreshed Pune cache; provide/approve a traceable source relation/alignment. |

The audit after the Noida rebuild reports 24 errors, 1,220 warnings, and 3
coverage gaps. The per-city audit counts and full finding list are in
`reports/data-audit/2026-10-15.json`.
