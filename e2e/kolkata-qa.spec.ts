import { test, expect } from "@playwright/test";
import {
  gotoHome,
  filterPanel,
  cityChip,
  filterToggle,
  phasePill,
  mapLegend,
  metadataPanel,
} from "./helpers";

test.describe("Kolkata Visual & Interaction QA (Step 5)", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHome(page);
  });

  test("verifies Kolkata in city selector, phases, line legend, and station panel", async ({
    page,
  }) => {
    const panel = filterPanel(page);
    await expect(panel).toBeVisible();

    // 1. Verify Kolkata button is present and click it
    const kolkataBtn = cityChip(page, "kolkata");
    await expect(kolkataBtn).toBeVisible();
    await kolkataBtn.click();
    const toggle = filterToggle(page);
    if ((await toggle.getAttribute("aria-expanded")) === "false") {
      await toggle.click({ force: true });
    }

    // 2. Verify dynamic phases for Kolkata render
    await expect(phasePill(page, "1")).toBeVisible();
    await expect(phasePill(page, "2")).toBeVisible();

    // 3. Verify lines in legend or controls
    const legend = mapLegend(page);
    await expect(legend).toBeVisible();

    // 4. Test searching or selecting Kolkata station
    const searchInput = page.getByPlaceholder(/search stations/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("Esplanade");
      await page.waitForTimeout(500);
      const searchResult = page.getByText("Esplanade").first();
      await expect(searchResult).toBeVisible();
      await searchResult.click();

      // Check metadata panel
      const metaPanel = metadataPanel(page);
      await expect(metaPanel).toBeVisible();
      await expect(metaPanel.getByText(/Esplanade/i).first()).toBeVisible();
    }

    // 5. Take screenshot of Kolkata network view
    await page.screenshot({ path: "reports/data-audit/kolkata-qa-screenshot.png", fullPage: true });
  });
});
