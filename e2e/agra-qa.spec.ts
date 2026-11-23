import { test, expect } from "@playwright/test";

test.describe("Agra Visual & Interaction QA (M15)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("verifies Agra in city selector, phases, line legend, and station panel", async ({
    page,
  }) => {
    const filterPanel = page.getByTestId("filter-panel");
    await expect(filterPanel).toBeVisible();

    // 1. Verify Agra button is present and click it
    const agraBtn = page.getByTestId("city-select-agra");
    await expect(agraBtn).toBeVisible();
    await agraBtn.click();

    // 2. Verify dynamic phases for Agra render
    await expect(page.getByTestId("phase-pill-1")).toBeVisible();

    // 3. Verify lines in legend
    const legend = page.getByTestId("map-legend");
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
      const metadataPanel = page.getByTestId("metadata-panel");
      await expect(metadataPanel).toBeVisible();
      await expect(metadataPanel.getByText(/Taj Mahal/i).first()).toBeVisible();
      await expect(metadataPanel.getByText(/UPMRC/i).first()).toBeVisible();
    }

    // 5. Take screenshot of Agra network view
    await page.screenshot({ path: "reports/data-audit/agra-qa-screenshot.png", fullPage: true });
  });
});
