import { test, expect } from "@playwright/test";

test.describe("Map Legend and Mock Banner (Milestone 6)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("verifies mock banner is hidden when real data pipeline is active", async ({
    page,
  }) => {
    // In Milestone 7 with real data loaded, mock banner should not be displayed
    const mockBanner = page.getByTestId("mock-data-banner");
    await expect(mockBanner).not.toBeVisible();
  });

  test("verifies map legend renders all 3 statuses and collapses/expands", async ({
    page,
  }) => {
    const legend = page.getByTestId("map-legend");
    await expect(legend).toBeVisible();

    // Check line statuses
    await expect(page.getByTestId("legend-status-operational")).toBeVisible();
    await expect(page.getByTestId("legend-status-construction")).toBeVisible();
    await expect(page.getByTestId("legend-status-planned")).toBeVisible();

    // Check station symbology
    await expect(page.getByTestId("legend-station-interchange")).toBeVisible();
    await expect(page.getByTestId("legend-station-standard")).toBeVisible();

    // Toggle collapse
    const toggleBtn = page.getByTestId("toggle-legend-btn");
    await toggleBtn.click();
    await expect(page.getByTestId("legend-content")).not.toBeVisible();

    // Re-expand
    await toggleBtn.click();
    await expect(page.getByTestId("legend-content")).toBeVisible();
  });
});
