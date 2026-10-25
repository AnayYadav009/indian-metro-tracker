import { test, expect } from "@playwright/test";
import {
  gotoHome,
  openStation,
  openSegment,
  metadataPanel,
  mapContainer,
  segmentDetail,
  knownIssueNotice,
  cityChip,
  allCityChips,
  filterToggle,
  filterSearchInput,
} from "./helpers";

async function expectSelectedStationOutsidePanel(page: import("@playwright/test").Page) {
  const panel = metadataPanel(page);
  await expect(panel).toBeVisible();
  await page.waitForFunction(() => {
    const map = (window as any)._mapLibreInstance;
    const feature = map?.querySourceFeatures("metro-stations").find(
      (item: any) => item.properties.station_id === "del-kashmere-gate"
    );
    const panel = document.querySelector('[data-testid="metadata-panel"]');
    const container = document.querySelector('[data-testid="map-container"]');
    if (!map || map.isMoving() || !feature || !panel || !container) return false;
    const point = map.project(feature.geometry.coordinates);
    const mapRect = container.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const x = mapRect.left + point.x;
    const y = mapRect.top + point.y;
    return !(x >= panelRect.left && x <= panelRect.right && y >= panelRect.top && y <= panelRect.bottom);
  }, undefined, { timeout: 15_000 });

  const result = await page.evaluate(() => {
    const map = (window as any)._mapLibreInstance;
    const feature = map
      .querySourceFeatures("metro-stations")
      .find((item: any) => item.properties.station_id === "del-kashmere-gate");
    const panelElement = document.querySelector('[data-testid="metadata-panel"]');
    const mapElement = document.querySelector('[data-testid="map-container"]');
    if (!feature || !panelElement || !mapElement) return null;

    const point = map.project(feature.geometry.coordinates);
    const mapRect = mapElement.getBoundingClientRect();
    const panelRect = panelElement.getBoundingClientRect();
    const x = mapRect.left + point.x;
    const y = mapRect.top + point.y;
    return {
      insidePanel:
        x >= panelRect.left &&
        x <= panelRect.right &&
        y >= panelRect.top &&
        y <= panelRect.bottom,
    };
  });

  expect(result, "selected station should be available in the map source").not.toBeNull();
  expect(result?.insidePanel).toBe(false);
}

test.describe("M13.1 map and panel UX", () => {
  test("keeps a selected station clear of the details panel", async ({ page }) => {
    await openStation(page, "delhi", "del-kashmere-gate");
    await expectSelectedStationOutsidePanel(page);
  });

  test("keeps a selected segment clear of the details panel", async ({ page }) => {
    await openSegment(page, "chennai", "che-blue-seg-01");
    const panel = metadataPanel(page);
    await expect(panel).toBeVisible();
    await page.waitForFunction(() => {
      const map = (window as any)._mapLibreInstance;
      const feature = map?.querySourceFeatures("metro-segments").find(
        (item: any) => item.properties.segment_id === "che-blue-seg-01"
      );
      const panel = document.querySelector('[data-testid="metadata-panel"]');
      const container = document.querySelector('[data-testid="map-container"]');
      if (!map || map.isMoving() || !feature || !panel || !container) return false;
      const coordinates = feature.geometry.coordinates;
      const point = map.project(coordinates[Math.floor(coordinates.length / 2)]);
      const mapRect = container.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const x = mapRect.left + point.x;
      const y = mapRect.top + point.y;
      return !(x >= panelRect.left && x <= panelRect.right && y >= panelRect.top && y <= panelRect.bottom);
    }, undefined, { timeout: 15_000 });

    const insidePanel = await page.evaluate(() => {
      const map = (window as any)._mapLibreInstance;
      const feature = map
        .querySourceFeatures("metro-segments")
        .find((item: any) => item.properties.segment_id === "che-blue-seg-01");
      const panelElement = document.querySelector('[data-testid="metadata-panel"]');
      const mapElement = document.querySelector('[data-testid="map-container"]');
      if (!feature || !panelElement || !mapElement) return null;

      const coordinates = feature.geometry.coordinates;
      const point = map.project(coordinates[Math.floor(coordinates.length / 2)]);
      const mapRect = mapElement.getBoundingClientRect();
      const panelRect = panelElement.getBoundingClientRect();
      const x = mapRect.left + point.x;
      const y = mapRect.top + point.y;
      return x >= panelRect.left && x <= panelRect.right && y >= panelRect.top && y <= panelRect.bottom;
    });

    expect(insidePanel, "selected segment should be in the map source").not.toBeNull();
    expect(insidePanel).toBe(false);
  });

  test("shows a data completeness caveat for a known affected line", async ({ page }) => {
    await openSegment(page, "delhi", "del-pink-seg-01");
    await expect(knownIssueNotice(page)).toContainText(
      "Data incomplete for this line"
    );
  });

  test("wraps long segment names and retains the full title", async ({ page }) => {
    await openSegment(page, "chennai", "che-blue-seg-01");
    const title = segmentDetail(page)
      .getByRole("heading", { name: "Blue Line (Wimco Nagar Depot - Chennai Airport)" });
    await expect(title).toHaveAttribute(
      "title",
      "Blue Line (Wimco Nagar Depot - Chennai Airport)"
    );
    await expect(title).toHaveClass(/break-words/);
  });

  test("mobile filter controls collapse after selecting a city", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoHome(page);
    await cityChip(page, "chennai").click();
    await expect(filterToggle(page)).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    await expect(filterSearchInput(page)).toBeHidden();
  });

  test("switches to every city and renders its network", async ({ page }) => {
    test.setTimeout(120_000);
    await gotoHome(page);
    const cityIds = await allCityChips(page).evaluateAll(
      (buttons) =>
        buttons
          .map((button) => button.getAttribute("data-testid") || "")
          .filter((id) => id !== "city-select-all")
          .map((id) => id.replace("city-select-", ""))
    );

    for (const cityId of cityIds) {
      const cityButton = cityChip(page, cityId);
      const toggle = filterToggle(page);
      if ((await toggle.getAttribute("aria-expanded")) === "false") {
        await toggle.click({ force: true });
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
      }
      await cityButton.click();
      await page.waitForFunction((id) => {
        const map = (window as any)._mapLibreInstance;
        if (!map || map.isMoving()) {
          return false;
        }
        return map
          .queryRenderedFeatures({
            layers: [
              "operational-lines",
              "construction-lines",
              "schematic-lines",
              "planned-lines",
            ],
          })
          .some((feature: any) => feature.properties.city_id === id);
      }, cityId, { timeout: 8_000 });
    }
  });
});
