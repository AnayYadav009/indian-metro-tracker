import { test, expect } from "@playwright/test";

test.describe("Filter UI and Map Interaction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the floating filter panel with city and status options", async ({
    page,
  }) => {
    const filterPanel = page.getByTestId("filter-panel");
    await expect(filterPanel).toBeVisible();

    // Check header
    await expect(
      page.getByText("Filters & Network Controls")
    ).toBeVisible();

    // Check cities
    await expect(page.getByTestId("city-select-all")).toBeVisible();
    await expect(page.getByTestId("city-select-delhi")).toBeVisible();
    await expect(page.getByTestId("city-select-bengaluru")).toBeVisible();
    await expect(page.getByTestId("city-select-mumbai")).toBeVisible();

    // Check status options with visual indicators
    await expect(page.getByTestId("status-toggle-operational")).toBeVisible();
    await expect(page.getByTestId("status-toggle-construction")).toBeVisible();
    await expect(page.getByTestId("status-toggle-planned")).toBeVisible();

    await expect(page.getByTestId("status-toggle-operational").getByText("Solid")).toBeVisible();
    await expect(page.getByTestId("status-toggle-construction").getByText("Dashed")).toBeVisible();
    await expect(page.getByTestId("status-toggle-planned").getByText("Dotted")).toBeVisible();
  });

  test("allows selecting a city and shows dynamic city phases", async ({
    page,
  }) => {
    // When no city is selected, phase pills are hidden and empty hint is visible
    await expect(page.getByTestId("phase-filter-empty-hint")).toBeVisible();
    await expect(page.getByTestId("phase-pill-all")).not.toBeVisible();
    await expect(page.getByTestId("phase-pill-I")).not.toBeVisible();

    // Click Delhi
    await page.getByTestId("city-select-delhi").click();

    // Delhi phases I-IV should appear and empty hint should disappear
    await expect(page.getByTestId("phase-filter-empty-hint")).not.toBeVisible();
    await expect(page.getByTestId("phase-pill-I")).toBeVisible();
    await expect(page.getByTestId("phase-pill-I")).toHaveText("Phase I");
    await expect(page.getByTestId("phase-pill-IV")).toBeVisible();
    await expect(page.getByTestId("phase-pill-IV")).toHaveText("Phase IV");

    // Click Bengaluru
    await page.getByTestId("city-select-bengaluru").click();
    await expect(page.getByTestId("phase-pill-1")).toBeVisible();
    await expect(page.getByTestId("phase-pill-1")).toHaveText("Phase 1");
    await expect(page.getByTestId("phase-pill-2B")).toBeVisible();
    await expect(page.getByTestId("phase-pill-2B")).toHaveText("Phase 2B");
  });

  test("toggles status filters and reset button works", async ({ page }) => {
    // Toggle off operational
    const opBtn = page.getByTestId("status-toggle-operational");
    await opBtn.click();

    // Reset button appears
    const resetBtn = page.getByTestId("reset-filters-btn");
    await expect(resetBtn).toBeVisible();

    // Click reset
    await resetBtn.click();
    await expect(resetBtn).not.toBeVisible();
  });
});
