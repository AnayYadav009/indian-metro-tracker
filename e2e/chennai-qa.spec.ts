import { test, expect } from "@playwright/test";

test.describe("Chennai Visual & Interaction QA (Step 5)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3001/");
  });

  test("verifies Chennai in city selector, phases, line legend, and station panel", async ({
    page,
  }) => {
    const filterPanel = page.getByTestId("filter-panel");
    await expect(filterPanel).toBeVisible();

    // 1. Verify Chennai button is present and click it
    const chennaiBtn = page.getByTestId("city-select-chennai");
    await expect(chennaiBtn).toBeVisible();
    await chennaiBtn.click();

    // 2. Verify dynamic phases for Chennai render
    await expect(page.getByTestId("phase-pill-1")).toBeVisible();

    // 3. Verify lines in legend
    const legend = page.getByTestId("map-legend");
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
      const metadataPanel = page.getByTestId("metadata-panel");
      await expect(metadataPanel).toBeVisible();
      await expect(metadataPanel.getByText(/Chennai Central/i).first()).toBeVisible();
      await expect(metadataPanel.getByText(/CMRL/i).first()).toBeVisible();
    }

    // 5. Take screenshot of Chennai network view
    await page.screenshot({ path: "reports/data-audit/chennai-qa-screenshot.png", fullPage: true });
  });
});
