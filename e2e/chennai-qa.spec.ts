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

test.describe("Chennai Visual & Interaction QA (Step 5)", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHome(page);
  });

  test("verifies Chennai in city selector, phases, line legend, and station panel", async ({
    page,
  }) => {
    const panel = filterPanel(page);
    await expect(panel).toBeVisible();

    // 1. Verify Chennai button is present and click it
    const chennaiBtn = cityChip(page, "chennai");
    await expect(chennaiBtn).toBeVisible();
    await chennaiBtn.click();
    const toggle = filterToggle(page);
    if ((await toggle.getAttribute("aria-expanded")) === "false") {
      await toggle.click({ force: true });
    }

    // 2. Verify dynamic phases for Chennai render
    await expect(phasePill(page, "1")).toBeVisible();

    // 3. Verify lines in legend
    const legend = mapLegend(page);
    await expect(legend).toBeVisible();

    // 4. Test searching or selecting Chennai Central station
    const searchInput = page.getByPlaceholder(/search stations/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("Chennai Central");
      await page.waitForTimeout(500);
      const searchResult = page.getByText("Chennai Central").first();
      await expect(searchResult).toBeVisible();
      await searchResult.click();

      // Check metadata panel
      const metaPanel = metadataPanel(page);
      await expect(metaPanel).toBeVisible();
      await expect(metaPanel.getByText(/Chennai Central/i).first()).toBeVisible();
      await expect(metaPanel.getByText(/CMRL/i).first()).toBeVisible();
    }

    // 5. Take screenshot of Chennai network view
    await page.screenshot({ path: "reports/data-audit/chennai-qa-screenshot.png", fullPage: true });
  });
});
