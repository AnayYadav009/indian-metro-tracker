import { test, expect } from "@playwright/test";

test.describe("Kolkata Visual & Interaction QA (Step 5)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3001/");
  });

  test("verifies Kolkata in city selector, phases, line legend, and station panel", async ({
    page,
  }) => {
    const filterPanel = page.getByTestId("filter-panel");
    await expect(filterPanel).toBeVisible();

    // 1. Verify Kolkata button is present and click it
    const kolkataBtn = page.getByTestId("city-select-kolkata");
    await expect(kolkataBtn).toBeVisible();
    await kolkataBtn.click();

    // 2. Verify dynamic phases for Kolkata render
    await expect(page.getByTestId("phase-pill-1")).toBeVisible();
    await expect(page.getByTestId("phase-pill-2")).toBeVisible();

    // 3. Verify lines in legend or controls
    const legend = page.getByTestId("map-legend");
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
      const metadataPanel = page.getByTestId("metadata-panel");
      await expect(metadataPanel).toBeVisible();
      await expect(metadataPanel.getByText(/Esplanade/i).first()).toBeVisible();
    }

    // 5. Take screenshot of Kolkata network view
    await page.screenshot({ path: "reports/data-audit/kolkata-qa-screenshot.png", fullPage: true });
  });
});
