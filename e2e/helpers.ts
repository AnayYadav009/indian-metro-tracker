import { Page, Locator } from "@playwright/test";

// ============================================================================
// PART 2: E2E TEST HELPERS
// Centralized abstraction layer decoupling E2E specs from DOM/layout details.
// ============================================================================

export interface GotoHomeOptions {
  city?: string;
  selected?: string;
  from?: string;
  to?: string;
  year?: string;
  stations?: string;
}

/** Navigates to the home map page with optional URL search parameters */
export async function gotoHome(
  page: Page,
  options: GotoHomeOptions = {}
): Promise<void> {
  const params = new URLSearchParams();
  if (options.city) params.set("city", options.city);
  if (options.selected) params.set("selected", options.selected);
  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);
  if (options.year) params.set("year", options.year);
  if (options.stations) params.set("stations", options.stations);

  const query = params.toString();
  const path = query ? `/?${query}` : "/";
  await page.goto(path);
}

/** Navigates directly to a city page */
export async function goToCityPage(page: Page, cityId: string): Promise<void> {
  await page.goto(`/city/${cityId}/`);
}

/** Navigates directly to the compare page */
export async function goToCompare(page: Page): Promise<void> {
  await page.goto("/compare");
}

/** Navigates directly to the map home page */
export async function goToMap(page: Page): Promise<void> {
  await page.goto("/");
}

// ----------------------------------------------------------------------------
// Filter Panel & City Selection
// ----------------------------------------------------------------------------

export function filterPanel(page: Page): Locator {
  return page.getByTestId("filter-panel");
}

export function filterToggle(page: Page): Locator {
  return page.getByTestId("collapse-filter-btn");
}

export async function collapseFilters(page: Page): Promise<void> {
  const toggle = filterToggle(page);
  if ((await toggle.getAttribute("aria-expanded")) === "true") {
    await toggle.click({ force: true });
  }
}

export async function expandFilters(page: Page): Promise<void> {
  const toggle = filterToggle(page);
  if ((await toggle.getAttribute("aria-expanded")) === "false") {
    await toggle.click({ force: true });
  }
}

export function cityChip(page: Page, cityId: string): Locator {
  return page.getByTestId(`city-select-${cityId}`);
}

export function allCityChips(page: Page): Locator {
  return page.locator('[data-testid^="city-select-"]');
}

export async function selectCity(page: Page, cityId: string): Promise<void> {
  const chip = cityChip(page, cityId);
  await chip.click();
}

export function statusToggle(
  page: Page,
  status: "operational" | "construction" | "planned"
): Locator {
  return page.getByTestId(`status-toggle-${status}`);
}

export function resetFiltersBtn(page: Page): Locator {
  return page.getByTestId("reset-filters-btn");
}

export function phasePill(page: Page, phase: string): Locator {
  return page.getByTestId(`phase-pill-${phase}`);
}

export function phaseEmptyHint(page: Page): Locator {
  return page.getByTestId("phase-filter-empty-hint");
}

export function filterSearchInput(page: Page): Locator {
  return page.getByTestId("filter-search-input");
}

// ----------------------------------------------------------------------------
// Station & Segment Selection
// ----------------------------------------------------------------------------

export async function openStation(
  page: Page,
  cityId: string,
  stationId: string
): Promise<void> {
  await page.goto(`/?city=${cityId}&selected=station:${stationId}`);
}

export async function openSegment(
  page: Page,
  cityId: string,
  segmentId: string
): Promise<void> {
  await page.goto(`/?city=${cityId}&selected=segment:${segmentId}`);
}

export async function clickMapFeature(
  page: Page,
  target: { name: string }
): Promise<void> {
  const searchInput = page.getByPlaceholder(/search stations/i);
  if (await searchInput.isVisible()) {
    await searchInput.fill(target.name);
    await page.waitForTimeout(500);
    const searchResult = page.getByText(target.name).first();
    await searchResult.click();
  }
}

// ----------------------------------------------------------------------------
// Metadata Panel
// ----------------------------------------------------------------------------

export function metadataPanel(page: Page): Locator {
  return page.getByTestId("metadata-panel");
}

export function closeMetadataPanelButton(page: Page): Locator {
  return page.getByTestId("close-metadata-panel");
}

export async function closeMetadataPanel(page: Page): Promise<void> {
  await closeMetadataPanelButton(page).click();
}

export function stationDetail(page: Page): Locator {
  return page.getByTestId("station-detail");
}

export function segmentDetail(page: Page): Locator {
  return page.getByTestId("segment-detail");
}

export function interchangeBadge(parent: Page | Locator): Locator {
  return parent.getByTestId("interchange-badge");
}

export function interchangeSection(parent: Page | Locator): Locator {
  return parent.getByTestId("interchange-lines-section");
}

export function interchangeLineChips(page: Page): Locator {
  return page.locator('[data-testid^="interchange-line-chip-"]');
}

export function knownIssueNotice(parent: Page | Locator): Locator {
  return parent.getByTestId("known-issue-notice");
}

// ----------------------------------------------------------------------------
// Route Finder
// ----------------------------------------------------------------------------

export function routeFinderButton(page: Page): Locator {
  return page.locator('[data-testid="find-route-btn"]');
}

export function routeFinderPanel(page: Page): Locator {
  return page.locator('[data-testid="route-finder-panel"]');
}

export function routeCitySelect(page: Page): Locator {
  return page.locator('[data-testid="route-city-select"]');
}

export function routeOriginInput(page: Page): Locator {
  return page.locator('[data-testid="route-origin-input"]');
}

export function routeDestinationInput(page: Page): Locator {
  return page.locator('[data-testid="route-destination-input"]');
}

export function routeResults(page: Page): Locator {
  return page.locator('[data-testid="route-results-container"]');
}

export function routeGuardNotice(page: Page): Locator {
  return page.locator('[data-testid="route-guard-notice"]');
}

export function routeDisclaimer(page: Page): Locator {
  return page.locator('[data-testid="route-disclaimer"]');
}

export function routeOriginMarker(page: Page): Locator {
  return page.locator('[data-testid="route-origin-marker"]');
}

export function routeDestinationMarker(page: Page): Locator {
  return page.locator('[data-testid="route-destination-marker"]');
}

export function routeSwapButton(page: Page): Locator {
  return page.locator('[data-testid="route-swap-btn"]');
}

export function routeSameStationNotice(page: Page): Locator {
  return page.locator('[data-testid="route-same-station-notice"]');
}

export async function openRouteFinder(page: Page): Promise<void> {
  await routeFinderButton(page).click();
}

export async function planRoute(
  page: Page,
  params: { city?: string; origin?: string; destination?: string }
): Promise<void> {
  await openRouteFinder(page);
  if (params.city) {
    await routeCitySelect(page).selectOption(params.city);
  }
  if (params.origin) {
    await routeOriginInput(page).fill(params.origin);
  }
  if (params.destination) {
    await routeDestinationInput(page).fill(params.destination);
  }
}

// ----------------------------------------------------------------------------
// Nearest Station Finder
// ----------------------------------------------------------------------------

export function nearestStationButton(page: Page): Locator {
  return page.locator('[data-testid="find-nearest-btn"]');
}

export function nearestStationPanel(page: Page): Locator {
  return page.locator('[data-testid="nearest-station-panel"]');
}

export function nearestStationItem(page: Page): Locator {
  return page.locator('[data-testid="nearest-station-item"]');
}

export function cityFallbackSelect(page: Page): Locator {
  return page.locator('[data-testid="city-fallback-select"]');
}

export function privacyNote(page: Page): Locator {
  return page.locator('[data-testid="privacy-note"]');
}

export function straightLineDistance(locator: Locator): Locator {
  return locator.locator('[data-testid="straight-line-distance"]');
}

export function stationLineBadge(locator: Locator): Locator {
  return locator.locator('[data-testid="station-line-badge"]');
}

export function pickPointButton(page: Page): Locator {
  return page.locator('[data-testid="pick-point-btn"]');
}

export function geoPermissionDenied(page: Page): Locator {
  return page.locator('[data-testid="geo-permission-denied"]');
}

export function pickingLocationBanner(page: Page): Locator {
  return page.locator('[data-testid="picking-location-banner"]');
}

export function userLocationMarker(page: Page): Locator {
  return page.locator('[data-testid="user-location-marker"]');
}

export function tooFarMessage(page: Page): Locator {
  return page.locator('[data-testid="too-far-message"]');
}

export function noOperationalMessage(page: Page): Locator {
  return page.locator('[data-testid="no-operational-message"]');
}

export function toggleConstruction(page: Page): Locator {
  return page.locator('[data-testid="toggle-construction"]');
}

export function notYetOpenBadge(parent: Page | Locator): Locator {
  return parent.locator('[data-testid="not-yet-open-badge"]');
}

export async function openNearestStation(page: Page): Promise<void> {
  await nearestStationButton(page).click();
}

// ----------------------------------------------------------------------------
// City Directory & Navigation
// ----------------------------------------------------------------------------

export function cityDirectoryButton(page: Page): Locator {
  return page.getByTestId("city-directory-btn");
}

export function cityDirectoryModal(page: Page): Locator {
  return page.getByTestId("city-directory-modal");
}

export function crawlableCityDirectory(page: Page): Locator {
  return page.getByTestId("crawlable-city-directory");
}

export function cityLinesTable(page: Page): Locator {
  return page.getByTestId("city-lines-table");
}

export function zeroOperationalNotice(page: Page): Locator {
  return page.getByTestId("zero-operational-notice");
}

export function completenessCaveatBanner(page: Page): Locator {
  return page.getByTestId("completeness-caveat-banner");
}

export async function openCityDirectory(page: Page): Promise<void> {
  await cityDirectoryButton(page).click();
}

// ----------------------------------------------------------------------------
// Map Legend
// ----------------------------------------------------------------------------

export function mapLegend(page: Page): Locator {
  return page.getByTestId("map-legend");
}

export function toggleLegendButton(page: Page): Locator {
  return page.getByTestId("toggle-legend-btn");
}

export function legendContent(page: Page): Locator {
  return page.getByTestId("legend-content");
}

export function legendStatus(
  page: Page,
  status: "operational" | "construction" | "planned"
): Locator {
  return page.getByTestId(`legend-status-${status}`);
}

export function legendStation(
  page: Page,
  type: "interchange" | "standard"
): Locator {
  return page.getByTestId(`legend-station-${type}`);
}

export async function openLegend(page: Page): Promise<void> {
  const content = legendContent(page);
  if (!(await content.isVisible())) {
    await toggleLegendButton(page).click();
    await page.waitForTimeout(200);
  }
}

// ----------------------------------------------------------------------------
// Timeline Slider
// ----------------------------------------------------------------------------

export function timelineContainer(page: Page): Locator {
  return page.getByTestId("timeline-slider-container");
}

export function timelineSlider(page: Page): Locator {
  return page.getByTestId("timeline-range-slider");
}

export function timelinePlayButton(page: Page): Locator {
  return page.getByTestId("timeline-play-btn");
}

export function timelineResetButton(page: Page): Locator {
  return page.getByTestId("timeline-reset-btn");
}

export function timelineFutureToggle(page: Page): Locator {
  return page.getByTestId("timeline-future-toggle");
}

export function toggleStationsButton(page: Page): Locator {
  return page.getByTestId("toggle-stations-btn");
}

export function timelineCurrentYear(page: Page): Locator {
  return page.getByTestId("timeline-current-year");
}

export function timelineSparkline(page: Page): Locator {
  return page.getByTestId("timeline-sparkline-chart");
}

// ----------------------------------------------------------------------------
// Provenance & Issues
// ----------------------------------------------------------------------------

export function provenanceFooter(parent: Page | Locator): Locator {
  return parent.getByTestId("provenance-footer");
}

export function cityProvenanceFooter(page: Page): Locator {
  return page.getByTestId("city-provenance-footer");
}

export function provenanceDisclaimerNotice(parent: Page | Locator): Locator {
  return parent.getByTestId("provenance-disclaimer-notice");
}

export function reportIssueLink(parent: Page | Locator): Locator {
  return parent.getByTestId("report-issue-button");
}

// ----------------------------------------------------------------------------
// Data Badge, Attribution & Map
// ----------------------------------------------------------------------------

export function dataBadge(page: Page): Locator {
  return page.getByTestId("data-last-updated");
}

export function attribution(page: Page): Locator {
  return page.getByTestId("osm-attribution");
}

export function attributionMobile(page: Page): Locator {
  return page.getByTestId("osm-attribution-mobile");
}

export function mapContainer(page: Page): Locator {
  return page.getByTestId("map-container");
}

export function mockDataBanner(page: Page): Locator {
  return page.getByTestId("mock-data-banner");
}

// ----------------------------------------------------------------------------
// Compare Page
// ----------------------------------------------------------------------------

export function comparePage(page: Page): Locator {
  return page.getByTestId("compare-page");
}

export function nationwideSummary(page: Page): Locator {
  return page.getByTestId("nationwide-summary");
}

export function compareTable(page: Page): Locator {
  return page.getByTestId("compare-table");
}

export function cityRow(page: Page, cityId: string): Locator {
  return page.getByTestId(`city-row-${cityId}`);
}

export function sortCityButton(page: Page): Locator {
  return page.getByTestId("sort-city");
}

export function sortOperationalKmButton(page: Page): Locator {
  return page.getByTestId("sort-operational-km");
}

export function tierFilter(
  page: Page,
  tier: "all" | "tier1" | "tier2"
): Locator {
  return page.getByTestId(`tier-filter-${tier}`);
}

export function searchCitiesInput(page: Page): Locator {
  return page.getByTestId("search-cities-input");
}

export function cityPageLink(page: Page, cityId: string): Locator {
  return page.getByTestId(`city-page-link-${cityId}`);
}

export function navToMap(page: Page): Locator {
  return page.getByTestId("nav-to-map");
}

export function navToCompare(page: Page): Locator {
  return page.getByTestId("nav-to-compare");
}

export function dataQualityFlag(page: Page, cityId: string): Locator {
  return page.getByTestId(`data-quality-flag-${cityId}`);
}

export function completenessCaveatCity(page: Page, cityId: string): Locator {
  return page.getByTestId(`completeness-caveat-${cityId}`);
}
