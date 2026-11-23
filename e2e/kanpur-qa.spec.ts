import { test, expect } from "@playwright/test";

test.describe("Kanpur Visual & Interaction QA (M15)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("verifies Kanpur in city selector, phases, line legend, and station panel", async ({
    page,
  }) => {
    const filterPanel = page.getByTestId("filter-panel");
    await expect(filterPanel).toBeVisible();

    // 1. Verify Kanpur button is present and click it
    const kanpurBtn = page.getByTestId("city-select-kanpur");
    await expect(kanpurBtn).toBeVisible();
    await kanpurBtn.click();

    // 2. Verify dynamic phases for Kanpur render
    await expect(page.getByTestId("phase-pill-1")).toBeVisible();

    // 3. Verify lines in legend
    const legend = page.getByTestId("map-legend");
    await expect(legend).toBeVisible();

    // 4. Test searching or selecting Rawatpur station
    const searchInput = page.getByPlaceholder(/search stations/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("Rawatpur");
      await page.waitForTimeout(500);
      const searchResult = page.getByText("Rawatpur").first();
      await expect(searchResult).toBeVisible();
      await searchResult.click();

      // Check metadata panel
      const metadataPanel = page.getByTestId("metadata-panel");
      await expect(metadataPanel).toBeVisible();
      await expect(metadataPanel.getByText(/Rawatpur/i).first()).toBeVisible();
      await expect(metadataPanel.getByText(/UPMRC/i).first()).toBeVisible();
    }

    // 5. Take screenshot of Kanpur network view
    await page.screenshot({ path: "reports/data-audit/kanpur-qa-screenshot.png", fullPage: true });
  });
});
