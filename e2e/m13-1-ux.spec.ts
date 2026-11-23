import { test, expect } from "@playwright/test";

async function expectSelectedStationOutsidePanel(page: import("@playwright/test").Page) {
  const panel = page.getByTestId("metadata-panel");
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
    await page.goto("/?city=delhi&selected=station:del-kashmere-gate");
    await expectSelectedStationOutsidePanel(page);
  });

  test("keeps a selected segment clear of the details panel", async ({ page }) => {
    await page.goto("/?city=chennai&selected=segment:che-blue-seg-01");
    const panel = page.getByTestId("metadata-panel");
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
    await page.goto("/?city=delhi&selected=segment:del-pink-seg-01");
    await expect(page.getByTestId("known-issue-notice")).toContainText(
      "Data incomplete for this line"
    );
  });

  test("wraps long segment names and retains the full title", async ({ page }) => {
    await page.goto("/?city=chennai&selected=segment:che-blue-seg-01");
    const title = page
      .getByTestId("segment-detail")
      .getByRole("heading", { name: "Blue Line (Wimco Nagar Depot - Chennai Airport)" });
    await expect(title).toHaveAttribute(
      "title",
      "Blue Line (Wimco Nagar Depot - Chennai Airport)"
    );
    await expect(title).toHaveClass(/break-words/);
  });

  test("mobile filter controls collapse after selecting a city", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.getByTestId("city-select-chennai").click();
    await expect(page.getByTestId("collapse-filter-btn")).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    await expect(page.getByTestId("filter-search-input")).toBeHidden();
  });

  test("switches to every city and renders its network", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    const cityIds = await page.locator('[data-testid^="city-select-"]').evaluateAll(
      (buttons) =>
        buttons
          .map((button) => button.getAttribute("data-testid") || "")
          .filter((id) => id !== "city-select-all")
          .map((id) => id.replace("city-select-", ""))
    );

    for (const cityId of cityIds) {
      const cityButton = page.getByTestId(`city-select-${cityId}`);
      const filterToggle = page.getByTestId("collapse-filter-btn");
      if ((await filterToggle.getAttribute("aria-expanded")) === "false") {
        await filterToggle.click({ force: true });
        await expect(filterToggle).toHaveAttribute("aria-expanded", "true");
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
