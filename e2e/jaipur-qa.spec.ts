import { test, expect } from "@playwright/test";

test.describe("Jaipur Visual & Interaction QA (M15)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("verifies Jaipur in city selector, phases, line legend, and station panel", async ({
    page,
  }) => {
    const filterPanel = page.getByTestId("filter-panel");
    await expect(filterPanel).toBeVisible();

    // 1. Verify Jaipur button is present and click it
    const jaipurBtn = page.getByTestId("city-select-jaipur");
    await expect(jaipurBtn).toBeVisible();
    await jaipurBtn.click();
    const filterToggle = page.getByTestId("collapse-filter-btn");
    if ((await filterToggle.getAttribute("aria-expanded")) === "false") {
      await filterToggle.click({ force: true });
    }

    // 2. Verify dynamic phases for Jaipur render
    await expect(page.getByTestId("phase-pill-1")).toBeVisible();

    // 3. Verify lines in legend
    const legend = page.getByTestId("map-legend");
    await expect(legend).toBeVisible();

    // 4. Test searching or selecting Badi Chaupar station
    const searchInput = page.getByPlaceholder(/search stations/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("Badi Chaupar");
      await page.waitForTimeout(500);
      const searchResult = page.getByText("Badi Chaupar").first();
      await expect(searchResult).toBeVisible();
      await searchResult.click();

      // Check metadata panel
      const metadataPanel = page.getByTestId("metadata-panel");
      await expect(metadataPanel).toBeVisible();
      await expect(metadataPanel.getByText(/Badi Chaupar/i).first()).toBeVisible();
      await expect(metadataPanel.getByText(/JMRC/i).first()).toBeVisible();
    }

    // 5. Take screenshot of Jaipur network view
    await page.screenshot({ path: "reports/data-audit/jaipur-qa-screenshot.png", fullPage: true });
  });
});
