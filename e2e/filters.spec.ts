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
    // Click Delhi
    await page.getByTestId("city-select-delhi").click();

    // Delhi phases I-IV should appear
    await expect(page.getByTestId("phase-pill-I")).toBeVisible();
    await expect(page.getByTestId("phase-pill-IV")).toBeVisible();

    // Click Bengaluru
    await page.getByTestId("city-select-bengaluru").click();
    await expect(page.getByTestId("phase-pill-1")).toBeVisible();
    await expect(page.getByTestId("phase-pill-2B")).toBeVisible();
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
