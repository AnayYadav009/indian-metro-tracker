import citiesJson from "../data/cities.json";
import { test, expect } from "@playwright/test";
import {
  gotoHome,
  openStation,
  openSegment,
  metadataPanel,
  mapContainer,
  segmentDetail,
  knownIssueNotice,
  cityOption,
  openCityPicker,
  selectCity,
  allCityOptions,
  filterToggle,
  openLayersDrawer,
  filterSearchInput,
  mapLoadingStatus,
  cityPickerTrigger,
} from "./helpers";

async function expectSelectedAnchorOutsidePanel(
  page: import("@playwright/test").Page,
  sourceId: "metro-stations" | "metro-segments",
  property: "station_id" | "segment_id",
  id: string,
) {
  const panel = metadataPanel(page);
  await expect(panel).toBeVisible();
  const args = { sourceId, property, id };
  await page.waitForFunction(({ sourceId, property, id }) => {
    const map = (window as any)._mapLibreInstance;
    const feature = map?.querySourceFeatures(sourceId).find(
      (item: any) => item.properties[property] === id
    );
    const panel = document.querySelector('[data-testid="metadata-panel"]');
    const container = document.querySelector('[data-testid="map-container"]');
    if (!map || map.isMoving() || !feature || !panel || !container) return false;
    const coordinates = sourceId === "metro-stations"
      ? feature.geometry.coordinates
      : feature.geometry.coordinates[Math.floor(feature.geometry.coordinates.length / 2)];
    const point = map.project(coordinates);
    const mapRect = container.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const x = mapRect.left + point.x;
    const y = mapRect.top + point.y;
    return x >= mapRect.left && x <= mapRect.right && y >= mapRect.top && y <= mapRect.bottom &&
      !(x >= panelRect.left && x <= panelRect.right && y >= panelRect.top && y <= panelRect.bottom);
  }, args, { timeout: 15_000 });

  const result = await page.evaluate(({ sourceId, property, id }) => {
    const map = (window as any)._mapLibreInstance;
    const feature = map?.querySourceFeatures(sourceId)
      .find((item: any) => item.properties[property] === id);
    const panelElement = document.querySelector('[data-testid="metadata-panel"]');
    const mapElement = document.querySelector('[data-testid="map-container"]');
    if (!feature || !panelElement || !mapElement) return null;

    const coordinates = sourceId === "metro-stations"
      ? feature.geometry.coordinates
      : feature.geometry.coordinates[Math.floor(feature.geometry.coordinates.length / 2)];
    const point = map.project(coordinates);
    const mapRect = mapElement.getBoundingClientRect();
    const panelRect = panelElement.getBoundingClientRect();
    const x = mapRect.left + point.x;
    const y = mapRect.top + point.y;
    return {
      inMap: x >= mapRect.left && x <= mapRect.right && y >= mapRect.top && y <= mapRect.bottom,
      insidePanel:
        x >= panelRect.left &&
        x <= panelRect.right &&
        y >= panelRect.top &&
        y <= panelRect.bottom,
    };
  }, args);

  expect(result, `selected ${property} should be available in the map source`).not.toBeNull();
  expect(result?.inMap, "selected feature anchor should remain within the visible map").toBe(true);
  expect(result?.insidePanel).toBe(false);
}

test.describe("M13.1 map and panel UX", () => {
  test("keeps a selected station clear of the details panel", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "Desktop map padding requirement (M13.1 step 4)");
    await openStation(page, "delhi", "del-kashmere-gate");
    await expectSelectedAnchorOutsidePanel(page, "metro-stations", "station_id", "del-kashmere-gate");
  });

  test("keeps a selected segment clear of the details panel", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "Desktop map padding requirement (M13.1 step 4)");
    await openSegment(page, "chennai", "che-blue-seg-01");
    await expectSelectedAnchorOutsidePanel(page, "metro-segments", "segment_id", "che-blue-seg-01");
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
    await openLayersDrawer(page);
    await selectCity(page, "chennai");
    await expect(filterToggle(page)).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    await expect(filterSearchInput(page)).toBeHidden();
  });

  test("switches to every city and renders its network", async ({ page }) => {
    test.setTimeout(120_000);
    await gotoHome(page);
    await openCityPicker(page);
    const cities = citiesJson;
    const cityIds = await allCityOptions(page).evaluateAll(
      (buttons) =>
        buttons
          .map((button) => button.getAttribute("data-testid") || "")
          .filter((id) => id !== "city-select-all" && id !== "city-select-ncr")
          .map((id) => id.replace("city-select-", ""))
    );

    for (const cityId of cityIds) {
      const city = cities.find((c) => c.id === cityId);
      await selectCity(page, cityId);

      // Deterministic signal 1: Dropdown closed after selection
      await expect(cityPickerTrigger(page)).toHaveAttribute("aria-expanded", "false");

      // Deterministic signal 2: Trigger displays the selected city name in aria-label
      if (city) {
        await expect(cityPickerTrigger(page)).toHaveAttribute(
          "aria-label",
          `Select city. Current: ${city.name}`
        );
      }

      // Deterministic signal 3: Map camera movement completes and city network renders
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

  test("announces map updates while switching cities", async ({ page }) => {
    await gotoHome(page, { city: "delhi" });
    await page.waitForFunction(() => {
      const map = (window as any)._mapLibreInstance;
      return map && !map.isMoving() && map.queryRenderedFeatures({
        layers: ["operational-lines", "construction-lines", "schematic-lines", "planned-lines"],
      }).some((feature: any) => feature.properties.city_id === "delhi");
    });
    await selectCity(page, "chennai");
    const updateStatus = mapLoadingStatus(page);
    await expect(updateStatus).toBeVisible({ timeout: 5_000 });
    await expect(updateStatus).toContainText("Updating map");
    await expect(updateStatus).toBeHidden({ timeout: 10_000 });
  });
});
