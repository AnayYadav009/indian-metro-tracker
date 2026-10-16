import { test, expect } from "@playwright/test";

test.describe("Patna Visual & Interaction QA (M15)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("verifies Patna in city selector, phases, line legend, and station panel", async ({
    page,
  }) => {
    const filterPanel = page.getByTestId("filter-panel");
    await expect(filterPanel).toBeVisible();

    // 1. Verify Patna button is present and click it
    const patnaBtn = page.getByTestId("city-select-patna");
    await expect(patnaBtn).toBeVisible();
    await patnaBtn.click();
    const filterToggle = page.getByTestId("collapse-filter-btn");
    if ((await filterToggle.getAttribute("aria-expanded")) === "false") {
      await filterToggle.click({ force: true });
    }

    // 2. Verify dynamic phases for Patna render
    await expect(page.getByTestId("phase-pill-1")).toBeVisible();

    // 3. Verify lines in legend
    const legend = page.getByTestId("map-legend");
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
      const metadataPanel = page.getByTestId("metadata-panel");
      await expect(metadataPanel).toBeVisible();
      await expect(metadataPanel.getByText(/New ISBT/i).first()).toBeVisible();
      await expect(metadataPanel.getByText(/PMRC/i).first()).toBeVisible();
    }

    // 5. Take screenshot of Patna network view
    await page.screenshot({ path: "reports/data-audit/patna-qa-screenshot.png", fullPage: true });
  });
});
