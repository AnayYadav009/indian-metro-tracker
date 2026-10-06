import { test, expect } from "@playwright/test";

test.describe("OSM and Basemap Attribution Visibility (Phase 1.2)", () => {
  test("attribution is visible on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");

    const attribution = page.getByTestId("osm-attribution");
    await expect(attribution).toBeVisible();
    await expect(attribution).toContainText("OpenStreetMap");
    await expect(attribution).toContainText("OpenFreeMap");
  });

  test("attribution is visible on mobile viewport even with deep link selection", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/?city=delhi&selected=station:del-ramesh-nagar");

    // Metadata panel opens on mobile
    const panel = page.getByTestId("metadata-panel");
    await expect(panel).toBeVisible();

    // Attribution must remain rendered and visible
    const attribution = page.getByTestId("osm-attribution");
    await expect(attribution).toBeVisible();
    await expect(attribution).toContainText("OpenStreetMap");
  });
});
