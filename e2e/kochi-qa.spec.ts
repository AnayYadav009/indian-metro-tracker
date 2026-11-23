import { test, expect } from "@playwright/test";

test.describe("Kochi Visual & Interaction QA (M15)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("verifies Kochi in city selector, phases, line legend, and station panel", async ({
    page,
  }) => {
    const filterPanel = page.getByTestId("filter-panel");
    await expect(filterPanel).toBeVisible();

    // 1. Verify Kochi button is present and click it
    const kochiBtn = page.getByTestId("city-select-kochi");
    await expect(kochiBtn).toBeVisible();
    await kochiBtn.click();

    // 2. Verify dynamic phases for Kochi render
    await expect(page.getByTestId("phase-pill-1")).toBeVisible();

    // 3. Verify lines in legend
    const legend = page.getByTestId("map-legend");
    await expect(legend).toBeVisible();

    // 4. Test searching or selecting Aluva station
    const searchInput = page.getByPlaceholder(/search stations/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("Aluva");
      await page.waitForTimeout(500);
      const searchResult = page.getByText("Aluva").first();
      await expect(searchResult).toBeVisible();
      await searchResult.click();

      // Check metadata panel
      const metadataPanel = page.getByTestId("metadata-panel");
      await expect(metadataPanel).toBeVisible();
      await expect(metadataPanel.getByText(/Aluva/i).first()).toBeVisible();
      await expect(metadataPanel.getByText(/KMRL/i).first()).toBeVisible();
    }

    // 5. Take screenshot of Kochi network view
    await page.screenshot({ path: "reports/data-audit/kochi-qa-screenshot.png", fullPage: true });
  });
});
