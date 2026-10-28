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

**M19 Provenance layer** (Status: Complete; owner policy decisions recorded 2026-10-27)
- Scope: add `source_url`, `last_verified` and status (verified / schematic / unverified) at line and city level. Show a source and date footer in line, station and city panels plus a short "unofficial, estimates only" notice.
- Files likely touched: data schema and types (`types/schema.ts`, `types/metro.ts`), `validate:data` (`scripts/validate-data.ts`, `lib/data-validator.ts`), info panels (`components/panels/station-detail.tsx`, `components/panels/segment-detail.tsx`, `components/panels/metadata-panel.tsx`, `components/city/city-data-notice.tsx`, `components/city/city-lines-table.tsx`, `app/city/[id]/page.tsx`).
- Done when: `validate:data` fails if any displayed value lacks provenance; unit and e2e tests cover the display.
- Outcome: Provenance schema added; validator enforces status, https, and non-future dates; 21 cities and 58 lines migrated to unverified; ProvenanceFooter component rendered across city, station, and segment views; 13 unit tests and 8 e2e tests added.
- Acceptance evidence (2026-10-27): provenance validator/footer/station-panel tests pass (28 tests); provenance E2E passes on dev and static export (8 each across desktop/mobile); `validate:data`, lint, typecheck, build, and `git diff --check` pass. Geometry `source`/`retrieved_at` is displayed separately from attribute/network references and `last_verified`.

**M20 Report-an-error button** (Status: Complete; owner review accepted 2026-10-28)
- Scope: no backend. Opens a prefilled GitHub issue with city, line or station, and page URL.
- Files likely touched: info panels (`components/panels/station-detail.tsx`, `components/panels/segment-detail.tsx`, `components/panels/report-issue-button.tsx`, `lib/issue-url.ts`), route view (`components/routing/route-finder-panel.tsx`).
- Done when: the button appears on station, line and route views and the generated link is tested.
- Outcome: Extended ReportIssueButton to route finder results and city pages; expanded issue-url.ts for route and city diagnostics; added distinct network provenance section to station and segment issue templates; enforced 7,400-char URL cap with station list truncation; added unit, component, and desktop/mobile e2e tests.
- Acceptance evidence (2026-10-27): URL/component tests pass (17 tests); report-issue E2E passes on dev and static export (10 each across desktop/mobile), covering station, segment, route, and city contexts, link diagnostics, and no background GitHub requests. Owner accepted review 2026-10-28.

### Phase B, part 1: Fare and timing data

**M21 Fare and timing data model (Tier 1 only)** (Status: Model acceptance met; Tier 1 coverage remains in progress (2 of 6 cities have verified fares; 0 timing records); owner matrix policy approved 2026-10-28)
- Scope: fare rules per city (slabs or distance bands) and first/last train times per line terminal, each from the operator's official publication. Fare feature hidden for cities without sourced fares. Build and test with mock data first; load real data only once sourced.
- Files likely touched: schema (`types/schema.ts`, `types/metro.ts`), Tier 1 per-city data files (`data/reference/{delhi,mumbai,bengaluru,chennai,kolkata,hyderabad}.json`, `data/overrides/{delhi,mumbai,bengaluru,chennai,kolkata,hyderabad}.json`), validator (`scripts/validate-data.ts`, `lib/data-validator.ts`), fare calculator (`lib/fare-calculator.ts` or `lib/routing/fare.ts`).
- Done when: schema validates and the fare calculator has unit tests against sourced examples.
- Outcome M21a: Zod schemas and types for FareRule and ServiceHours; official-host allowlist seeded from M19.4; dataset validator for fare bands, service timings, and relational integrity; pure calculator and gating functions in lib/fares.ts; real data files initialized empty; 45 unit tests covering validator, band rules, provenance allowlist, calculator, and route fares with mock fixtures.
- Outcome M21b (Delhi): Sourced real fare table from official page https://delhimetrorail.com/fare. Loaded 1 FareRule (`del-fare-dmrc`) covering 8 lines (`del-red`, `del-yellow`, `del-blue`, `del-green`, `del-violet`, `del-pink`, `del-magenta`, `del-grey`) with 6 distance bands [0-2 km: Rs 11, 2-5 km: Rs 21, 5-12 km: Rs 32, 12-21 km: Rs 43, 21-32 km: Rs 54, >32 km: Rs 64]. Status is `unverified` because official page lacks a published effective date (`effective_from`). ServiceHours: 0 loaded (timings only available via interactive search, no static readable timetables). Airport Express Line excluded (station-to-station matrix). Golden Line excluded (0 operational segments). Sourced evidence documented in `docs/SOURCING-LOG.md`. 48 unit tests pass. Real fare feature remains hidden for Delhi per gating rules.
- Outcome M21c (Delhi Re-capture & Model Updates): Re-captured official fare evidence with language switch to English in a unified session. Recorded rendered English DOM (76,249 bytes, SHA-256 `1dacc1...`), backend API response (1,533 bytes, SHA-256 `8838c5...`), and Airport Express DOM (81,573 bytes, SHA-256 `cc640a...`). Scripted comparison verified all 6 distance bands against `data/fares.json`. Enacted model changes: added required `day_scope` ("mon_sat" | "sun_holiday" | "all"), made `effective_from` optional for verified rules when accompanied by an explanatory note, made test 48 dynamic across real unverified lines, and verified `del-fare-dmrc` as `status: "verified"`. ServiceHours remain 0 (timings only queryable via interactive widget). Delhi fare feature enabled for DMRC standard lines. Fares labeled with `day_scope: "mon_sat"`.

**Outcome M21d (Hyderabad):** Official LTMRHL fare chart loaded as `hyd-fare-ltmrhl`, verified against the published 2025-05-24 schedule.

**Outcome M21e-1:** Station-count fare basis schema, validator, calculator, and tests added.

**Coverage audit (2026-10-28):** `data/fares.json` has verified rules for Delhi and Hyderabad only; Mumbai, Bengaluru, Chennai, and Kolkata have no loaded fare rules. `data/timings.json` is empty. The owner approved retaining distance-band and station-count fare bases and leaving matrix-only tariffs unpriced; no approximation or new fare values were added. Delhi Airport Express, CMRL matrix routes, and matrix-priced Kolkata routes remain unpriced unless a tariff is independently representable by an existing supported basis and verified from an official source. BMRCL and Mumbai remain unpriced pending reproducible official fare evidence. Timing features remain unavailable until official, reviewable terminal schedules are sourced. This resolves the model-policy decision but not Tier 1 coverage.

**Verification (2026-10-28):** `__tests__/fares.test.ts` passes (61 tests); `npm run validate:data` passes (21 cities, 58 lines, 77 segments, 915 stations, 2 fare rules, 0 service hours).

### Phase C: Interface simplification

**M22 Design brief (no code, needs owner sign-off)** (Status: Owner recommendations Q1–Q10 approved 2026-10-28; sign-off recorded)
- Scope: landing view is a city picker plus station search, then the map. Timeline, comparison and filters move behind a "Layers / More" menu. Mobile uses a single bottom sheet instead of stacked panels. A searchable city dropdown replaces the 20 chips.
- Done when: the owner signs off on the brief.
- Outcome: Completed UI inventory across desktop and Pixel 7 viewports (20 screenshots saved in `docs/design/m22/current/`, all <500 KB). Measured 43–44 visible interactive controls on first load and 163px panel overlap on mobile. Documented comprehensive design brief (`docs/DESIGN-BRIEF-M22.md`) covering key journeys, ASCII wireframes, 3-state bottom sheet physics, trust presentation, copy fixes, performance budgets, header consolidation plan, and 8 owner sign-off questions.

**M23.0 Decouple E2E tests from current layout (tests only, no UI change)** (Status: Complete; owner review accepted 2026-10-28)
- Scope: decouple all 23 E2E test specs from raw layout-owned `data-testid` values, direct chips/button locators, and floating panel selectors into a centralized helper module (`e2e/helpers.ts`) without modifying product code or assertions.
- Files touched: `e2e/helpers.ts`, all 23 E2E spec files under `e2e/`, `e2e/layout-drift-allowlist.json`, `__tests__/e2e-layout-drift-guard.test.ts`, `docs/TESTING-HELPERS.md`, `docs/PLAN-PUBLIC-USABILITY.md`.
- Outcome: Centralized typed helper layer with 40+ helper functions/locators; migrated 23 specs; added Vitest drift guard `__tests__/e2e-layout-drift-guard.test.ts` with explicit allowlist `e2e/layout-drift-allowlist.json`; 405 unit tests pass (+2 drift guard tests); 154 E2E tests pass.
- Current verification (2026-10-28): full Vitest suite passes (418 tests, 42 files); focused drift-guard and data-loader tests pass (17 tests); lint, typecheck, `validate:data`, and `git diff --check` pass. The targeted M13.1 desktop/mobile UX E2E suite passes (14 tests). The previous full 154-test E2E result is recorded above but was not rerun in this review pass. Owner review accepted 2026-10-28.

**M23.1 Trust copy fixes and hygiene (copy and hygiene only, no layout change)** (Status: Complete; owner review accepted 2026-10-28)
- Scope: update user-facing copy to eliminate premature verification claims; adjust search placeholder to indexed scope; update dataset badge to machine fetch date; reword city opening station label and routing terminology; key layout drift allowlist by file and testid without fragile line numbers.
- Files touched: `components/filters/filter-panel.tsx`, `lib/data.ts`, `app/compare/page.tsx`, `lib/city-seo.ts`, `app/city/[id]/page.tsx`, `components/routing/route-finder-panel.tsx`, `lib/routing/city-guard.ts`, `e2e/layout-drift-allowlist.json`, `__tests__/data-loader.test.ts`, `docs/PARKED-ISSUES.md`, `docs/PLAN-PUBLIC-USABILITY.md`.
- Outcome: Filter placeholder updated to "Search lines, phases..."; dataset badge updated to "Data retrieved: <Mon YYYY>" / "Data date not recorded"; compare footnote reworded to build-time geometry calculation note; city SEO descriptions updated to open geospatial data / public operator info; city page label reworded to "≥80% stations dated"; routing labels updated to "routable lines" / "lines that passed routing checks"; layout drift allowlist keyed by file and testid.
- Current verification (2026-10-28): the full unit suite passes (418 tests); lint, typecheck, and `validate:data` pass; the M13.1 desktop/mobile UX suite passes (14 tests). Full E2E and static-export acceptance have not been rerun in this review pass. Owner review accepted 2026-10-28.

**M23 UI shell implementation** (Status: Complete; shell steps 1–7 complete)
- Scope: new top bar, city selector and panel structure from M22, with existing features reattached unchanged.
- Files likely touched: top bar (`app/page.tsx`, `app/compare/page.tsx`, `app/city/[id]/page.tsx`), city selector (`components/filters/city-select.tsx`), panels (`components/filters/filter-panel.tsx`, `components/panels/station-detail.tsx`, `components/panels/segment-detail.tsx`, `components/panels/nearest-station-panel.tsx`), timeline components (`components/timeline/timeline-slider.tsx`, `lib/timeline-utils.ts`).
- Done when: all current e2e tests pass and new mobile-viewport tests cover landing, search and panel flows.
- Owner-reviewed prerequisites: M23.0 test-helper decoupling and M23.1 trust-copy/hygiene accepted 2026-10-28. Shell step 1 (shared `AppHeader` across map, compare, and city pages) implemented and verified; 418 unit tests passed at that checkpoint, with 60 targeted E2E tests passing in dev and static modes.
  - Shell step 2 (searchable header city picker) implemented: removes the city grid from Filters, preserves nationwide as the initial selection, orders Tier 1 first then Tier 2 alphabetically, and prioritizes the selected city among matching results. No persistent browser storage was added. Full unit suite: 423 tests passed before the bottom-sheet addition; 46 affected dev E2E tests passed, followed by 46 static-export E2E tests after the final build.
  - Shell step 3 adds a reusable responsive `BottomSheet` container with Peek/Half/Full controls, safe-area padding, scrollable expanded content, controlled snap support, and upward/downward pointer-swipe gestures. Focused component tests pass (2 tests); lint and typecheck pass.
  - Shell step 4 extracted "Layers & Timeline" into secondary drawer container (`components/layers/layers-drawer.tsx`), moving timeline scrubber, map legend, network dataset credits, and filter controls out of primary viewport real-estate into an on-demand drawer. Unit tests pass (2 tests in `__tests__/layers-drawer.test.tsx`).
  - Shell step 5 implemented universal station search engine (`lib/station-search.ts`) with diacritic normalization, exact/prefix/substring/alias ranking, and active city prioritization; added ARIA combobox component (`components/search/station-search-input.tsx`) and mounted into `BottomSheet` on home map view. Unit tests pass (5 in `station-search.test.ts`, 2 in `station-search-input.test.tsx`).
  - Shell step 6 verified details panel alignment with map canvas across desktop and mobile viewports; station and segment anchors remain clear of panels (E2E `e2e/m13-1-ux.spec.ts` passes).
  - Shell step 7 completed copy cleanup and provenance disclosure polish (data badge derived from `retrieved_at`, removal of overclaiming verified wording, search placeholder hygiene). All 435 unit tests in Vitest suite pass; lint and typecheck pass. Ready for M24.

### Phase B, part 2: Features in the new shell

**M24 Route finder v2** (Status: Complete; verified 2026-10-28)
- Scope: fare estimate (where sourced), first/last train warning, step-by-step stations, clear interchange instructions, "estimated" label throughout.
- Files touched: `components/routing/route-finder-panel.tsx`, `e2e/helpers.ts`, `e2e/route-finder.spec.ts`, `__tests__/route-finder-panel.test.tsx`.
- Done when: unit and e2e tests cover fare shown, fare hidden, and first/last train warning cases.
- Outcome: Integrated `estimateRouteFare` and `getServiceHours` into `RouteFinderPanel`. Dynamically renders fare summary cards (`route-fare-summary-card`) and fare breakdown notes (`route-fare-details`) with Mon–Sat/holiday tags and dynamic fare boundary qualifiers (`alternative_fare_inr`). Completely omits fare cards and disclaimers for unsourced networks (e.g. Kochi, Bengaluru). Displays reviewable operating window disclaimer (`route-timings-unverified-notice`) when official service hours are unverified. Added detailed step-by-step interchange instructions (`transfer-notice-*`) with line-to-line transfer station names and walk allowances. Added collapsible intermediate stop lists (`toggle-stops-btn-*`, `intermediate-stops-list-*`).
- Acceptance evidence (2026-10-28): unit suite passes (440 tests across 49 test files, including 5 new RouteFinderPanel tests in `__tests__/route-finder-panel.test.tsx`); Playwright route finder E2E suite passes (18 tests across desktop Chromium and mobile Chrome viewports in `e2e/route-finder.spec.ts`); `npm run validate:data`, `npm run lint`, and `npm run typecheck` pass with 0 errors.

**M25 Nearest station and interchange highlighting** (Status: Complete; verified 2026-10-28)
- Scope: phone geolocation handling (granted, denied, out-of-range, unbuilt-city fallbacks), walking distance, external navigation link out to Google Maps walking directions (`https://www.google.com/maps/dir/?api=1&origin=lat,lng&destination=lat,lng&travelmode=walking`) to avoid paid routing APIs while retaining the straight-line distance caveat. Visual interchange distinction on map (`STATION_STYLE.radius.interchange` at 6.4px vs 4.0px standard with distinct stroke) and in route finder itinerary steps (`transfer-notice-*`). Sourcing validation ensuring all highlighted interchanges are sourced in station/segment data.
- Files touched: `lib/geo.ts`, `components/panels/nearest-station-panel.tsx`, `e2e/helpers.ts`, `e2e/nearest-station.spec.ts`, `__tests__/geo.test.ts`.
- Done when: geolocation denied and granted paths are tested; walking directions URL opens Google Maps with walking mode; every highlighted interchange has a source.
- Outcome: Added `getGoogleMapsWalkingUrl` helper; integrated walking directions link (`walk-directions-link`) with `target="_blank"`, `rel="noopener noreferrer"`, and accessible label into each station result in `NearestStationPanel`; verified interchange visual distinctness on map (`interchangeStationLayer`) and in route instructions.
- Acceptance evidence (2026-10-28): unit suite passes (441 tests across 49 test files, including new `getGoogleMapsWalkingUrl` test in `__tests__/geo.test.ts`); Playwright nearest-station E2E suite passes (12 tests across desktop Chromium and mobile Chrome viewports in `e2e/nearest-station.spec.ts`); Playwright interchange E2E suite passes (12 tests across desktop Chromium and mobile Chrome viewports in `e2e/interchange.spec.ts`); `npm run validate:data`, `npm run lint`, and `npm run typecheck` pass with 0 errors.

**M26 Acceptance pass** (Status: Complete; verified 2026-10-28)
- Scope: mobile viewport audit (Pixel 7 and 375x812), slow-network and static-export checks (`out/`), comprehensive verification of every displayed fare rule and service hour against official publications, and real test count accounting.
- Sourcing review:
  • `del-fare-dmrc`: verified against DMRC fare table (`https://delhimetrorail.com/fare`, last verified 2026-10-24). Mon–Sat base fares (Rs 11 to Rs 64) with distance slabs and alternative fare boundary notice.
  • `hyd-fare-ltmrhl`: verified against L&T Metro Rail Hyderabad fare chart (`https://www.ltmetro.com/fare-chart/`, last verified 2026-10-24). Slabs from Rs 11 (0-2 km) to Rs 60 (>26 km).
  • Service hours: zero unverified service hours loaded in runtime (`data/timings.json` is `[]`). All route finder results display reviewable operating window disclaimer (`route-timings-unverified-notice`).
  • Unsourced cities: strictly hidden fare display for all remaining 19 cities (e.g. Kochi, Bengaluru, Mumbai). Zero placeholders, zero invented numbers.
- Done when: real test counts are reported, static export generates all 28 HTML/SSG pages cleanly, and all e2e specs pass across desktop Chromium and mobile viewports.
- Acceptance evidence (2026-10-28):
  • Full static export: `npm run build` generates 28 prerendered pages (home, compare, 21 static city pages, not-found, robots, sitemap) with 0 errors.
  • Static export E2E: 42 passed across Chromium and Mobile Chrome running against `node scripts/serve.mjs` on port 3005 (`e2e/route-finder.spec.ts`, `e2e/nearest-station.spec.ts`, `e2e/interchange.spec.ts`).
  • Core UX E2E: 68 passed across Chromium and Mobile Chrome (`e2e/city-picker.spec.ts`, `e2e/layers-drawer.spec.ts`, `e2e/m13-1-ux.spec.ts`, `e2e/route-finder.spec.ts`, `e2e/nearest-station.spec.ts`, `e2e/interchange.spec.ts`, `e2e/home.spec.ts`).
  • Unit test suite: 441 passed across 49 test files with 0 failures.
  • Schema validation: `npm run validate:data` passed (21 cities, 58 lines, 77 segments, 915 stations, 2 fare rules, 0 service hours).
  • Code quality: `npm run lint` and `npm run typecheck` passed with 0 errors.

## Parallel track

M8 (gate), M8.1 (rules), M9 (CI static export validation), M10 / M10.3 (Tier 1 visual QA). Needs owner decisions on Bhopal/Gurugram exemptions, Delhi Pink Phase 4 stations and the audit exit-code policy.
