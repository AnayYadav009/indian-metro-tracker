import { test, expect } from "@playwright/test";

test.describe("Lucknow Visual & Interaction QA (M15)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("verifies Lucknow in city selector, phases, line legend, and station panel", async ({
    page,
  }) => {
    const filterPanel = page.getByTestId("filter-panel");
    await expect(filterPanel).toBeVisible();

    // 1. Verify Lucknow button is present and click it
    const lucknowBtn = page.getByTestId("city-select-lucknow");
    await expect(lucknowBtn).toBeVisible();
    await lucknowBtn.click();
    const filterToggle = page.getByTestId("collapse-filter-btn");
    if ((await filterToggle.getAttribute("aria-expanded")) === "false") {
      await filterToggle.click({ force: true });
    }

    // 2. Verify dynamic phases for Lucknow render
    await expect(page.getByTestId("phase-pill-1")).toBeVisible();

    // 3. Verify lines in legend
    const legend = page.getByTestId("map-legend");
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
      const metadataPanel = page.getByTestId("metadata-panel");
      await expect(metadataPanel).toBeVisible();
      await expect(metadataPanel.getByText(/Charbagh/i).first()).toBeVisible();
      await expect(metadataPanel.getByText(/UPMRC/i).first()).toBeVisible();
    }

    // 5. Take screenshot of Lucknow network view
    await page.screenshot({ path: "reports/data-audit/lucknow-qa-screenshot.png", fullPage: true });
  });
});
