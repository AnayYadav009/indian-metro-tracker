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

test.describe("Agra Visual & Interaction QA (M15)", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHome(page);
    await openLayersDrawer(page);
  });

  test("verifies Agra in city selector, phases, line legend, and station panel", async ({
    page,
  }) => {
    const panel = filterPanel(page);
    await expect(panel).toBeVisible();

    // 1. Verify Agra button is present and click it
    await openCityPicker(page);
    const agraBtn = cityOption(page, "agra");
    await expect(agraBtn).toBeVisible();
    await agraBtn.click();
    const toggle = filterToggle(page);
    if ((await toggle.getAttribute("aria-expanded")) === "false") {
      await toggle.click({ force: true });
    }

    // 2. Verify dynamic phases for Agra render
    await expect(phasePill(page, "1")).toBeVisible();

    // 3. Verify lines in legend
    const legend = mapLegend(page);
    await expect(legend).toBeVisible();

    // 4. Test searching or selecting Taj Mahal station
    const searchInput = page.getByPlaceholder(/search stations/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("Taj Mahal");
      await page.waitForTimeout(500);
      const searchResult = page.getByText("Taj Mahal").first();
      await expect(searchResult).toBeVisible();
      await searchResult.click();

      // Check metadata panel
      const metaPanel = metadataPanel(page);
      await expect(metaPanel).toBeVisible();
      await expect(metaPanel.getByText(/Taj Mahal/i).first()).toBeVisible();
      await expect(metaPanel.getByText(/UPMRC/i).first()).toBeVisible();
    }

    // 5. Take screenshot of Agra network view
    await page.screenshot({ path: "reports/data-audit/agra-qa-screenshot.png", fullPage: true });
  });
});
