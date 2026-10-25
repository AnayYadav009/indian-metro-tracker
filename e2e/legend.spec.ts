import { test, expect } from "@playwright/test";
import {
  gotoHome,
  mockDataBanner,
  mapLegend,
  toggleLegendButton,
  legendContent,
  legendStatus,
  legendStation,
} from "./helpers";

test.describe("Map Legend and Data Source Status", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHome(page);
  });

  test("verifies mock banner is hidden when real data pipeline is active", async ({
    page,
  }) => {
    // When real data pipeline is active, mock banner should not be displayed
    const banner = mockDataBanner(page);
    await expect(banner).not.toBeVisible();
  });

  test("verifies map legend renders all 3 statuses and collapses/expands", async ({
    page,
  }) => {
    const legend = mapLegend(page);
    await expect(legend).toBeVisible();

    const toggleBtn = toggleLegendButton(page);

    // On mobile viewports (< 768px), legend collapses by default after mount
    if (page.viewportSize() && page.viewportSize()!.width < 768) {
      await expect(legendContent(page)).not.toBeVisible();
      await toggleBtn.click();
    }

    // Check line statuses
    await expect(legendStatus(page, "operational")).toBeVisible();
    await expect(legendStatus(page, "construction")).toBeVisible();
    await expect(legendStatus(page, "planned")).toBeVisible();

    // Check station symbology
    await expect(legendStation(page, "interchange")).toBeVisible();
    await expect(legendStation(page, "standard")).toBeVisible();

    // Toggle collapse
    await toggleBtn.click();
    await expect(legendContent(page)).not.toBeVisible();

    // Re-expand
    await toggleBtn.click();
    await expect(legendContent(page)).toBeVisible();
  });
});
