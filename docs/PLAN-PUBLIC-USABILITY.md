# Public Usability Plan

Date: 2026-10-24
Constraint: the project must stay free to run.
Status: planning. Paths below marked TBD are confirmed during M18.9.

## Focus

1. Routes, fares, first/last train, nearest station.
2. Trust in the data (provenance, last-verified dates, report-an-error).
3. A simpler interface.

Prerequisite (not part of this plan): the site is live, fast and mobile-friendly.
Skipped: live tracking and real-time arrivals.
Later: Tier 2 city onboarding, Hindi and regional languages, PWA/offline, WhatsApp link previews.

## Rules

- No unsourced data. Every interchange link needs a specific source.
- Fares unsourced for a city: hide the fare feature for that city entirely.
- Mock data while testing; real data only when usable.
- Agents report real test counts and never claim verification they did not run.
- M8-M10.3 data-quality work continues in parallel.

## Sequencing

Trust first (fares and timings are new claims that need a source and a verified date). UI redesign before route-finder polish, to avoid building the UI twice.

## Milestones

### Phase A: Data trust

**M19 Provenance layer** (Status: Implemented, pending owner review)
- Scope: add `source_url`, `last_verified` and status (verified / schematic / unverified) at line and city level. Show a source and date footer in line, station and city panels plus a short "unofficial, estimates only" notice.
- Files likely touched: data schema and types (`types/schema.ts`, `types/metro.ts`), `validate:data` (`scripts/validate-data.ts`, `lib/data-validator.ts`), info panels (`components/panels/station-detail.tsx`, `components/panels/segment-detail.tsx`, `components/panels/metadata-panel.tsx`, `components/city/city-data-notice.tsx`, `components/city/city-lines-table.tsx`, `app/city/[id]/page.tsx`).
- Done when: `validate:data` fails if any displayed value lacks provenance; unit and e2e tests cover the display.
- Outcome: Provenance schema added; validator enforces status, https, and non-future dates; 21 cities and 58 lines migrated to unverified; ProvenanceFooter component rendered across city, station, and segment views; 13 unit tests and 8 e2e tests added.

**M20 Report-an-error button** (Status: Implemented, pending owner review)
- Scope: no backend. Opens a prefilled GitHub issue with city, line or station, and page URL.
- Files likely touched: info panels (`components/panels/station-detail.tsx`, `components/panels/segment-detail.tsx`, `components/panels/report-issue-button.tsx`, `lib/issue-url.ts`), route view (`components/routing/route-finder-panel.tsx`).
- Done when: the button appears on station, line and route views and the generated link is tested.
- Outcome: Extended ReportIssueButton to route finder results and city pages; expanded issue-url.ts for route and city diagnostics; added distinct network provenance section to station and segment issue templates; enforced 7,400-char URL cap with station list truncation; added unit, component, and desktop/mobile e2e tests.

### Phase B, part 1: Fare and timing data

**M21 Fare and timing data model (Tier 1 only)** (Status: M21a implemented; M21b loaded unverified; M21c Delhi evidence re-captured and verified (1 verified fare rule, 0 timings))
- Scope: fare rules per city (slabs or distance bands) and first/last train times per line terminal, each from the operator's official publication. Fare feature hidden for cities without sourced fares. Build and test with mock data first; load real data only once sourced.
- Files likely touched: schema (`types/schema.ts`, `types/metro.ts`), Tier 1 per-city data files (`data/reference/{delhi,mumbai,bengaluru,chennai,kolkata,hyderabad}.json`, `data/overrides/{delhi,mumbai,bengaluru,chennai,kolkata,hyderabad}.json`), validator (`scripts/validate-data.ts`, `lib/data-validator.ts`), fare calculator (`lib/fare-calculator.ts` or `lib/routing/fare.ts`).
- Done when: schema validates and the fare calculator has unit tests against sourced examples.
- Outcome M21a: Zod schemas and types for FareRule and ServiceHours; official-host allowlist seeded from M19.4; dataset validator for fare bands, service timings, and relational integrity; pure calculator and gating functions in lib/fares.ts; real data files initialized empty; 45 unit tests covering validator, band rules, provenance allowlist, calculator, and route fares with mock fixtures.
- Outcome M21b (Delhi): Sourced real fare table from official page https://delhimetrorail.com/fare. Loaded 1 FareRule (`del-fare-dmrc`) covering 8 lines (`del-red`, `del-yellow`, `del-blue`, `del-green`, `del-violet`, `del-pink`, `del-magenta`, `del-grey`) with 6 distance bands [0-2 km: Rs 11, 2-5 km: Rs 21, 5-12 km: Rs 32, 12-21 km: Rs 43, 21-32 km: Rs 54, >32 km: Rs 64]. Status is `unverified` because official page lacks a published effective date (`effective_from`). ServiceHours: 0 loaded (timings only available via interactive search, no static readable timetables). Airport Express Line excluded (station-to-station matrix). Golden Line excluded (0 operational segments). Sourced evidence documented in `docs/SOURCING-LOG.md`. 48 unit tests pass. Real fare feature remains hidden for Delhi per gating rules.
- Outcome M21c (Delhi Re-capture & Model Updates): Re-captured official fare evidence with language switch to English in a unified session. Recorded rendered English DOM (76,249 bytes, SHA-256 `1dacc1...`), backend API response (1,533 bytes, SHA-256 `8838c5...`), and Airport Express DOM (81,573 bytes, SHA-256 `cc640a...`). Scripted comparison verified all 6 distance bands against `data/fares.json`. Enacted model changes: added required `day_scope` ("mon_sat" | "sun_holiday" | "all"), made `effective_from` optional for verified rules when accompanied by an explanatory note, made test 48 dynamic across real unverified lines, and verified `del-fare-dmrc` as `status: "verified"`. ServiceHours remain 0 (timings only queryable via interactive widget). Delhi fare feature enabled for DMRC standard lines. Fares labeled with `day_scope: "mon_sat"`.

### Phase C: Interface simplification

**M22 Design brief (no code, needs owner sign-off)**
- Scope: landing view is a city picker plus station search, then the map. Timeline, comparison and filters move behind a "Layers / More" menu. Mobile uses a single bottom sheet instead of stacked panels. A searchable city dropdown replaces the 20 chips.
- Done when: the owner signs off on the brief.

**M23 UI shell implementation**
- Scope: new top bar, city selector and panel structure from M22, with existing features reattached unchanged.
- Files likely touched: top bar (`app/page.tsx`, `app/compare/page.tsx`, `app/city/[id]/page.tsx`), city selector (`components/filters/city-select.tsx`), panels (`components/filters/filter-panel.tsx`, `components/panels/station-detail.tsx`, `components/panels/segment-detail.tsx`, `components/panels/nearest-station-panel.tsx`), timeline components (`components/timeline/timeline-slider.tsx`, `lib/timeline-utils.ts`).
- Done when: all current e2e tests pass and new mobile-viewport tests cover landing, search and panel flows.

### Phase B, part 2: Features in the new shell

**M24 Route finder v2**
- Scope: fare estimate (where sourced), first/last train warning, step-by-step stations, clear interchange instructions, "estimated" label throughout.
- Files likely touched: route finder logic and UI (`components/routing/route-finder-panel.tsx`, `lib/routing/graph.ts`, `lib/routing/types.ts`, `lib/routing/city-guard.ts`, `lib/routing/station-ordering.ts`).
- Done when: unit and e2e tests cover fare shown, fare hidden, and first/last train warning cases.

**M25 Nearest station and interchange highlighting**
- Scope: phone geolocation, walking distance, link out to Google Maps for walking directions (avoids paid routing). Interchanges visually distinct on the map and in route steps; each interchange link needs a specific source.
- Done when: geolocation denied and granted paths are tested; every highlighted interchange has a source.

**M26 Acceptance pass**
- Scope: mobile and slow-network checks; review of every displayed fare and timing against its source.
- Done when: real test counts are reported and each fare and timing is checked against its source.

## Parallel track

M8 (gate), M8.1 (rules), M9 (CI static export validation), M10 / M10.3 (Tier 1 visual QA). Needs owner decisions on Bhopal/Gurugram exemptions, Delhi Pink Phase 4 stations and the audit exit-code policy.