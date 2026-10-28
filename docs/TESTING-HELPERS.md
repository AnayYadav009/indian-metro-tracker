# Testing Helpers & E2E Decoupling (M23.0)

## Overview
This document describes the test helper abstraction layer created in Milestone M23.0 to decouple Playwright End-to-End (E2E) specs from the concrete DOM layout, element IDs, and `data-testid` values.

When Milestone M23 restructures the user interface, only `e2e/helpers.ts` will need adjustment. Individual test specifications and assertions will remain intact.

---

## Architecture & Rule
1. **Rule for New E2E Specs**:
   - New E2E tests **must** import and use helpers from `e2e/helpers.ts`.
   - Direct DOM queries, hardcoded `data-testid` selectors, or layout-specific button paths are forbidden outside the helper module.
2. **Maintenance Policy (M23 & Future)**:
   - When the UI layout changes, update the locator implementations inside `e2e/helpers.ts`.
   - Do **not** rewrite spec files or change what tests assert.
3. **Drift Guard**:
   - Monitored by Vitest in `__tests__/e2e-layout-drift-guard.test.ts`.
   - Any raw testid reference in `e2e/*.spec.ts` triggers a build/test failure unless explicitly registered with a justification in `e2e/layout-drift-allowlist.json`.

---

## Helper Module Path
- [`e2e/helpers.ts`](file:///c:/Anay/Programming/Projects/indian-metro-tracker/e2e/helpers.ts)

---

## Exported Signatures & Functions

### Navigation
- `gotoHome(page: Page, options?: GotoHomeOptions): Promise<void>`
  - Navigates to `/` or with query parameters: `city`, `selected`, `from`, `to`, `year`, `stations`.
- `goToCityPage(page: Page, cityId: string): Promise<void>`
  - Navigates directly to `/city/[cityId]/`.
- `goToCompare(page: Page): Promise<void>`
  - Navigates directly to `/compare`.
- `goToMap(page: Page): Promise<void>`
  - Navigates directly to `/`.

### Filter Panel & City Selection
- `filterPanel(page: Page): Locator`
- `filterToggle(page: Page): Locator`
- `collapseFilters(page: Page): Promise<void>`
- `expandFilters(page: Page): Promise<void>`
- `cityPickerTrigger(page: Page): Locator`
- `cityPickerSearch(page: Page): Locator`
- `openCityPicker(page: Page): Promise<void>`
- `cityOption(page: Page, cityId: string): Locator`
- `allCityOptions(page: Page): Locator`
- `selectCity(page: Page, cityId: string): Promise<void>`
- `statusToggle(page: Page, status: "operational" | "construction" | "planned"): Locator`
- `resetFiltersBtn(page: Page): Locator`
- `phasePill(page: Page, phase: string): Locator`
- `phaseEmptyHint(page: Page): Locator`
- `filterSearchInput(page: Page): Locator`

### Station & Segment Selection
- `openStation(page: Page, cityId: string, stationId: string): Promise<void>`
- `openSegment(page: Page, cityId: string, segmentId: string): Promise<void>`
- `clickMapFeature(page: Page, target: { name: string }): Promise<void>`

### Metadata Panel
- `metadataPanel(page: Page): Locator`
- `closeMetadataPanelButton(page: Page): Locator`
- `closeMetadataPanel(page: Page): Promise<void>`
- `stationDetail(page: Page): Locator`
- `segmentDetail(page: Page): Locator`
- `interchangeBadge(parent: Page | Locator): Locator`
- `interchangeSection(parent: Page | Locator): Locator`
- `interchangeLineChips(page: Page): Locator`
- `knownIssueNotice(parent: Page | Locator): Locator`

### Route Finder
- `routeFinderButton(page: Page): Locator`
- `routeFinderPanel(page: Page): Locator`
- `routeCitySelect(page: Page): Locator`
- `routeOriginInput(page: Page): Locator`
- `routeDestinationInput(page: Page): Locator`
- `routeResults(page: Page): Locator`
- `routeGuardNotice(page: Page): Locator`
- `routeDisclaimer(page: Page): Locator`
- `routeOriginMarker(page: Page): Locator`
- `routeDestinationMarker(page: Page): Locator`
- `routeSwapButton(page: Page): Locator`
- `routeSameStationNotice(page: Page): Locator`
- `openRouteFinder(page: Page): Promise<void>`
- `planRoute(page: Page, params: { city?: string; origin?: string; destination?: string }): Promise<void>`

### Nearest Station Finder
- `nearestStationButton(page: Page): Locator`
- `nearestStationPanel(page: Page): Locator`
- `nearestStationItem(page: Page): Locator`
- `cityFallbackSelect(page: Page): Locator`
- `privacyNote(page: Page): Locator`
- `straightLineDistance(locator: Locator): Locator`
- `stationLineBadge(locator: Locator): Locator`
- `pickPointButton(page: Page): Locator`
- `geoPermissionDenied(page: Page): Locator`
- `pickingLocationBanner(page: Page): Locator`
- `userLocationMarker(page: Page): Locator`
- `tooFarMessage(page: Page): Locator`
- `noOperationalMessage(page: Page): Locator`
- `toggleConstruction(page: Page): Locator`
- `notYetOpenBadge(parent: Page | Locator): Locator`
- `openNearestStation(page: Page): Promise<void>`

### City Directory & Navigation
- `cityDirectoryButton(page: Page): Locator`
- `cityDirectoryModal(page: Page): Locator`
- `crawlableCityDirectory(page: Page): Locator`
- `cityLinesTable(page: Page): Locator`
- `zeroOperationalNotice(page: Page): Locator`
- `completenessCaveatBanner(page: Page): Locator`
- `openCityDirectory(page: Page): Promise<void>`

### Map Legend
- `mapLegend(page: Page): Locator`
- `toggleLegendButton(page: Page): Locator`
- `legendContent(page: Page): Locator`
- `legendStatus(page: Page, status: "operational" | "construction" | "planned"): Locator`
- `legendStation(page: Page, type: "interchange" | "standard"): Locator`
- `openLegend(page: Page): Promise<void>`

### Timeline Slider
- `timelineContainer(page: Page): Locator`
- `timelineSlider(page: Page): Locator`
- `timelinePlayButton(page: Page): Locator`
- `timelineResetButton(page: Page): Locator`
- `timelineFutureToggle(page: Page): Locator`
- `toggleStationsButton(page: Page): Locator`
- `timelineCurrentYear(page: Page): Locator`
- `timelineSparkline(page: Page): Locator`

### Provenance & Issues
- `provenanceFooter(parent: Page | Locator): Locator`
- `cityProvenanceFooter(page: Page): Locator`
- `provenanceDisclaimerNotice(parent: Page | Locator): Locator`
- `reportIssueLink(parent: Page | Locator): Locator`

### Data Badge, Attribution & Map
- `dataBadge(page: Page): Locator`
- `attribution(page: Page): Locator`
- `attributionMobile(page: Page): Locator`
- `mapContainer(page: Page): Locator`
- `mockDataBanner(page: Page): Locator`

### Compare Page
- `comparePage(page: Page): Locator`
- `nationwideSummary(page: Page): Locator`
- `compareTable(page: Page): Locator`
- `cityRow(page: Page, cityId: string): Locator`
- `sortCityButton(page: Page): Locator`
- `sortOperationalKmButton(page: Page): Locator`
- `tierFilter(page: Page, tier: "all" | "tier1" | "tier2"): Locator`
- `searchCitiesInput(page: Page): Locator`
- `cityPageLink(page: Page, cityId: string): Locator`
- `navToMap(page: Page): Locator`
- `navToCompare(page: Page): Locator`
- `dataQualityFlag(page: Page, cityId: string): Locator`
- `completenessCaveatCity(page: Page, cityId: string): Locator`
