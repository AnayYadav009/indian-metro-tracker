import { test, expect } from "@playwright/test";
import {
  gotoHome,
  filterPanel,
  cityOption,
  openCityPicker,
  filterToggle,
  phasePill,
  mapLegend,
  metadataPanel,
  openLayersDrawer,
} from "./helpers";

test.describe("Lucknow Visual & Interaction QA (M15)", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHome(page);
    await openLayersDrawer(page);
  });

  test("verifies Lucknow in city selector, phases, line legend, and station panel", async ({
    page,
  }) => {
    const panel = filterPanel(page);
    await expect(panel).toBeVisible();

    // 1. Verify Lucknow button is present and click it
    await openCityPicker(page);
    const lucknowBtn = cityOption(page, "lucknow");
    await expect(lucknowBtn).toBeVisible();
    await lucknowBtn.click();
    const toggle = filterToggle(page);
    if ((await toggle.getAttribute("aria-expanded")) === "false") {
      await toggle.click({ force: true });
    }

    // 2. Verify dynamic phases for Lucknow render
    await expect(phasePill(page, "1")).toBeVisible();

    // 3. Verify lines in legend
    const legend = mapLegend(page);
    await expect(legend).toBeVisible();

    // 4. Test searching or selecting Charbagh station
    const searchInput = page.getByPlaceholder(/search stations/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("Charbagh");
      await page.waitForTimeout(500);
      const searchResult = page.getByText("Charbagh").first();
      await expect(searchResult).toBeVisible();
      await searchResult.click();

      // Check metadata panel
      const metaPanel = metadataPanel(page);
      await expect(metaPanel).toBeVisible();
      await expect(metaPanel.getByText(/Charbagh/i).first()).toBeVisible();
      await expect(metaPanel.getByText(/UPMRC/i).first()).toBeVisible();
    }

    // 5. Take screenshot of Lucknow network view
    await page.screenshot({ path: "reports/data-audit/lucknow-qa-screenshot.png", fullPage: true });
  });
});
