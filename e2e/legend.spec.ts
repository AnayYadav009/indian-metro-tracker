import { test, expect } from "@playwright/test";
import {
  gotoHome,
  mockDataBanner,
  mapLegend,
  toggleLegendButton,
  legendContent,
  legendStatus,
  legendStation,
  openLayersDrawer,
  closeLayersDrawer,
  attribution,
  bottomSheetSnapButton,
} from "./helpers";

test.describe("Map Legend and Data Source Status", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHome(page);
    await openLayersDrawer(page);
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

test.describe("Mobile BottomSheet Layout Clearance", () => {
  test("legend toggle and attribution are clickable without occlusion across peek, half, and full sheet snaps at 375x812", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoHome(page);

    const snaps = ["peek", "half", "full"] as const;
    for (const snap of snaps) {
      await bottomSheetSnapButton(page, snap).click();
      await page.waitForTimeout(200);

      await openLayersDrawer(page);

      const toggleBtn = toggleLegendButton(page);
      await expect(toggleBtn).toBeVisible();
      await toggleBtn.click();
      await page.waitForTimeout(100);
      await toggleBtn.click();
      await page.waitForTimeout(100);

      const attr = attribution(page).first();
      await expect(attr).toBeVisible();

      await closeLayersDrawer(page);
      await page.waitForTimeout(100);
    }
  });
});
