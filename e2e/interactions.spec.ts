import { test, expect } from "@playwright/test";

test.describe("Interactions & Metadata Panels", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("verifies app header, map container, and data-last-updated", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "Indian Metro Network Tracker" })).toBeVisible();

    const mapContainer = page.getByTestId("map-container");
    await expect(mapContainer).toBeVisible();

    // Data last updated indicator
    const lastUpdated = page.getByTestId("data-last-updated");
    await expect(lastUpdated).toBeVisible();

    // Initially metadata panel is not open
    const metadataPanel = page.getByTestId("metadata-panel");
    await expect(metadataPanel).not.toBeVisible();
  });

  test("restores selected feature and opens metadata panel on deep link URL", async ({
    page,
  }) => {
    // Navigate with deep link parameter for station
    await page.goto("/?city=delhi&selected=station:del-ramesh-nagar");

    // Metadata panel should automatically open with station details
    const metadataPanel = page.getByTestId("metadata-panel");
    await expect(metadataPanel).toBeVisible();
    await expect(metadataPanel).toContainText("Ramesh Nagar");
    await expect(metadataPanel).toContainText("Delhi");

    // Close button should dismiss the panel and update URL
    const closeBtn = page.getByTestId("close-metadata-panel");
    await closeBtn.click();
    await expect(metadataPanel).not.toBeVisible();

    // Verify URL no longer contains selected=station:del-ramesh-nagar
    expect(page.url()).not.toContain("selected=station%3Adel-ramesh-nagar");
  });

  test("updates URL when filtering cities", async ({ page }) => {
    // Click Mumbai city filter
    const mumbaiBtn = page.getByTestId("city-select-mumbai");
    await mumbaiBtn.click();

    // Verify URL reflects city=mumbai
    await expect.poll(() => page.url()).toContain("city=mumbai");
  });
});
