# M8.1 Audit Blind-Spot Status — 2026-10-19

This update supplements the F-01–F-22 root-cause table in
[`blind-spots-2026-10-12.md`](./blind-spots-2026-10-12.md). The 22 walkthrough
findings remain the root-cause inventory; the current audit findings are in
[`2026-10-18.md`](./2026-10-18.md).

## Rule coverage

All eleven M8.1 rules have failing and passing fixture coverage in
`__tests__/data-audit.test.ts`. A regression case now specifically verifies
that a sourced, exact-quality construction segment whose endpoints disagree
with a reference stretch triggers `reference-construction-stretch-missing`.
Audit thresholds remain centralized in `scripts/audit/audit-config.ts`; the
eleven new rule thresholds (including future-station and cross-network
proximity limits)
can be overridden per city through `audit_thresholds` in that city's override
file. The unit suite exercises a city-specific sparse-vertex threshold.

All target rules remain report-only in `data/audit-baseline.json` until their
respective M10 repairs are complete. The shared configuration exposes eleven
threshold values for per-city overrides:

- M10.1: `segment-parallel-duplicate`, `segment-hairpin`,
  `segment-sparse-vertices`, `city-km-vs-reference`.
- M10.2: `line-terminal-missing`, `reference-construction-stretch-missing`,
  `orphan-future-station`.
- M10.3: `future-segment-no-stations`, `cross-network-interchange`,
  `verified-without-official-source`, `operational-station-no-opened-on`.

## Current audit and baseline inventory

`npm run audit:data` ran against the current dataset and exited **1**. It found
6 error-severity findings, 1,234 warnings, and 25 info findings; all 6 errors
are under report-only pending rules. 634 findings belong to pending rules, 14
coverage gaps are separately documented, and 104 warnings remain unbaselined.
There are 1,076 accepted warning entries in the baseline, zero unreviewed
warning entries, and zero known-defect entries. Of those accepted entries,
488 are active accepted findings and 588 match active findings classified as
pending; none are stale. Pending-rule findings count as active when checking
for stale baseline entries.

The six error-severity findings are pending M10 rules, not enforced M8
errors (the Delhi Pink parallel-duplicate finding was repaired and cleared):

| City | Rule | Finding |
|---|---|---|
| Delhi | `orphan-future-station` | Aerocity is 88 m from its Airport Express geometry (75 m threshold). |
| Delhi | `orphan-future-station` | Andrews Ganj is 195 m from its Violet Line geometry (75 m threshold). |
| Delhi | `orphan-future-station` | Domestic Airport is 138 m from its Magenta Line geometry (75 m threshold). |
| Bhopal | `city-km-vs-reference` | 5.58 km geometry vs 6.22 km official reference, 10.2% variance. |
| Gurugram | `line-terminal-missing` | Cyber City is 1,904 m from the nearest Rapid Metro segment end. |
| Mumbai | `orphan-future-station` | EEH is 90 m from Line 4 geometry (75 m threshold). |

M10.1 pending findings include 40 sparse-vertex legs across Ahmedabad,
Bengaluru, Chennai, Delhi, Hyderabad, Indore, Jaipur, Kanpur, Kolkata, Mumbai,
Nagpur, Noida, Pune, and Surat. The current audit reports no hairpin findings.

The warning baseline contains no `known_defects` or `unreviewed_warnings`.
Accepted entries are still reviewed as part of M8; acceptance records do not
substitute for confirming the reason against current evidence. Explicit
geometry exemptions still present in city overrides are:

- Chennai: `che-blue-seg-01`, `che-green-seg-01`, `che-corridor-5-seg-01`.
- Gurugram: `gur-rapid-seg-01` (the documented loop exception).
- Hyderabad: `hyd-red-seg-01`.
- Kolkata: `kol-green-seg-01`.
- Pune: `pun-purple-seg-01`, `pun-aqua-seg-01`.

Intentional segment breaks remain declared for Bengaluru's planned/Purple
connection, Indore Yellow segments 01–04, and Kolkata Purple segments 01–02.
Their current geometry and supporting reasons still require the M10.1/M10.2
review gates; this report does not approve additional exemptions.

## Verification

- `npx vitest run __tests__/data-audit.test.ts`: 53 passed.
- `npx vitest run --exclude __tests__/atomic-write.test.ts`: 35 files, 323 passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `git diff --check`: passed (line-ending conversion notices only).
- `npm run audit:data`: exit 1 because 104 warnings remain unbaselined. The
  findings and per-city/rule counts are in `2026-10-18.md` and `.json`.

M8.1 is not closed: M8 still requires review of the 104 visible warnings and
its source/count comparisons and station spot checks. The next authorized
sequence is to review the M10.1 geometry plan/findings, then carry out the
approved repairs, followed by Delhi's M10.2 reference review gate.
