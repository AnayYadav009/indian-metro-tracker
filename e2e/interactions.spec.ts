import { test, expect } from "@playwright/test";
import {
  gotoHome,
  mapContainer,
  dataBadge,
  metadataPanel,
  closeMetadataPanel,
  openStation,
  selectCity,
  openLayersDrawer,
} from "./helpers";

test.describe("Interactions & Metadata Panels", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHome(page);
  });

  test("verifies app header, map container, and data-last-updated", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "Indian Metro Network Tracker" })).toBeVisible();
    await openLayersDrawer(page);

    const map = mapContainer(page);
    await expect(map).toBeVisible();

    // Data last updated indicator
    const lastUpdated = dataBadge(page);
    await expect(lastUpdated).toBeVisible();

    // Initially metadata panel is not open
    const metaPanel = metadataPanel(page);
    await expect(metaPanel).not.toBeVisible();
  });

  test("restores selected feature and opens metadata panel on deep link URL", async ({
    page,
  }) => {
    // Navigate with deep link parameter for station
    await openStation(page, "delhi", "del-ramesh-nagar");

    // Metadata panel should automatically open with station details
    const metaPanel = metadataPanel(page);
    await expect(metaPanel).toBeVisible();
    await expect(metaPanel).toContainText("Ramesh Nagar");
    await expect(metaPanel).toContainText("Delhi");

    // Close button should dismiss the panel and update URL
    await closeMetadataPanel(page);
    await expect(metaPanel).not.toBeVisible();

    // Verify URL no longer contains selected=station:del-ramesh-nagar
    expect(page.url()).not.toContain("selected=station%3Adel-ramesh-nagar");
  });

  test("updates URL when filtering cities", async ({ page }) => {
    // Click Mumbai city filter
    await selectCity(page, "mumbai");

    // Verify URL reflects city=mumbai
    await expect.poll(() => page.url()).toContain("city=mumbai");
  });
});
