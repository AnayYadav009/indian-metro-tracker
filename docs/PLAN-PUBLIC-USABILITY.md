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

**M19 Provenance layer**
- Scope: add `source_url`, `last_verified` and status (verified / schematic / unverified) at line and city level. Show a source and date footer in line, station and city panels plus a short "unofficial, estimates only" notice.
- Files likely touched: data schema and types (`types/schema.ts`, `types/metro.ts`), `validate:data` (`scripts/validate-data.ts`, `lib/data-validator.ts`), info panels (`components/panels/station-detail.tsx`, `components/panels/segment-detail.tsx`, `components/panels/metadata-panel.tsx`, `components/city/city-data-notice.tsx`, `components/city/city-lines-table.tsx`, `app/city/[id]/page.tsx`).
- Done when: `validate:data` fails if any displayed value lacks provenance; unit and e2e tests cover the display.

**M20 Report-an-error button**
- Scope: no backend. Opens a prefilled GitHub issue with city, line or station, and page URL.
- Files likely touched: info panels (`components/panels/station-detail.tsx`, `components/panels/segment-detail.tsx`, `components/panels/report-issue-button.tsx`, `lib/issue-url.ts`), route view (`components/routing/route-finder-panel.tsx`).
- Done when: the button appears on station, line and route views and the generated link is tested.

### Phase B, part 1: Fare and timing data

**M21 Fare and timing data model (Tier 1 only)**
- Scope: fare rules per city (slabs or distance bands) and first/last train times per line terminal, each from the operator's official publication. Fare feature hidden for cities without sourced fares. Build and test with mock data first; load real data only once sourced.
- Files likely touched: schema (`types/schema.ts`, `types/metro.ts`), Tier 1 per-city data files (`data/reference/{delhi,mumbai,bengaluru,chennai,kolkata,hyderabad}.json`, `data/overrides/{delhi,mumbai,bengaluru,chennai,kolkata,hyderabad}.json`), validator (`scripts/validate-data.ts`, `lib/data-validator.ts`), fare calculator (`lib/fare-calculator.ts` or `lib/routing/fare.ts`).
- Done when: schema validates and the fare calculator has unit tests against sourced examples.

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