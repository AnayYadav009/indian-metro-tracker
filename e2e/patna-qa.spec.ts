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

test.describe("Patna Visual & Interaction QA (M15)", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHome(page);
  });

  test("verifies Patna in city selector, phases, line legend, and station panel", async ({
    page,
  }) => {
    const panel = filterPanel(page);
    await expect(panel).toBeVisible();

    // 1. Verify Patna button is present and click it
    const patnaBtn = cityChip(page, "patna");
    await expect(patnaBtn).toBeVisible();
    await patnaBtn.click();
    const toggle = filterToggle(page);
    if ((await toggle.getAttribute("aria-expanded")) === "false") {
      await toggle.click({ force: true });
    }

    // 2. Verify dynamic phases for Patna render
    await expect(phasePill(page, "1")).toBeVisible();

    // 3. Verify lines in legend
    const legend = mapLegend(page);
    await expect(legend).toBeVisible();

    // 4. Test searching or selecting New ISBT station
    const searchInput = page.getByPlaceholder(/search stations/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("New ISBT");
      await page.waitForTimeout(500);
      const searchResult = page.getByText("New ISBT").first();
      await expect(searchResult).toBeVisible();
      await searchResult.click();

      // Check metadata panel
      const metaPanel = metadataPanel(page);
      await expect(metaPanel).toBeVisible();
      await expect(metaPanel.getByText(/New ISBT/i).first()).toBeVisible();
      await expect(metaPanel.getByText(/PMRC/i).first()).toBeVisible();
    }

    // 5. Take screenshot of Patna network view
    await page.screenshot({ path: "reports/data-audit/patna-qa-screenshot.png", fullPage: true });
  });
});
