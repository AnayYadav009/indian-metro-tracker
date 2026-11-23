import { test, expect } from "@playwright/test";

test.describe("M14 Stats & Comparison Dashboard (/compare/)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/compare");
  });

  test("renders comparison dashboard header and nationwide summary metrics", async ({
    page,
  }) => {
    await expect(page.getByTestId("compare-page")).toBeVisible();

    // Verify main title
    await expect(
      page.getByRole("heading", { name: /metro stats & city comparison/i })
    ).toBeVisible();

    // Verify nationwide summary section
    const summary = page.getByTestId("nationwide-summary");
    await expect(summary).toBeVisible();

    // Check key aggregate values
    await expect(summary).toContainText("21");
    await expect(summary).toContainText("Operational");
    await expect(summary).toContainText("Under Construction");
    await expect(summary).toContainText("Planned Corridor");
  });

  test("renders all 21 cities in the comparison table with totals row", async ({
    page,
  }) => {
    const table = page.getByTestId("compare-table");
    await expect(table).toBeVisible();

    // Check key cities are present
    await expect(page.getByTestId("city-row-delhi")).toBeVisible();
    await expect(page.getByTestId("city-row-mumbai")).toBeVisible();
    await expect(page.getByTestId("city-row-bengaluru")).toBeVisible();
    await expect(page.getByTestId("city-row-kolkata")).toBeVisible();
    await expect(page.getByTestId("city-row-surat")).toBeVisible();
    await expect(page.getByTestId("city-row-patna")).toBeVisible();
    await expect(page.getByTestId("city-row-agra")).toBeVisible();

    // Verify total row at bottom
    await expect(table).toContainText("Total (21 Cities)");
  });

  test("supports sorting table by city name and operational km", async ({
    page,
  }) => {
    // Sort by city name ascending
    const sortCityBtn = page.getByTestId("sort-city");
    await sortCityBtn.click();

    // First row should now be Agra (alphabetical)
    const firstRowAfterSort = page
      .getByTestId("compare-table")
      .locator("tbody tr")
      .first();
    await expect(firstRowAfterSort).toContainText("Agra");

    // Sort by operational km descending
    const sortOpKmBtn = page.getByTestId("sort-operational-km");
    await sortOpKmBtn.click();

    // First row should now be Delhi (highest operational km)
    const topOpKmRow = page
      .getByTestId("compare-table")
      .locator("tbody tr")
      .first();
    await expect(topOpKmRow).toContainText("Delhi");
  });

  test("filters cities by tier (Tier 1 vs Tier 2) and search query", async ({
    page,
  }) => {
    // Filter by Tier 1
    const tier1Btn = page.getByTestId("tier-filter-tier1");
    await tier1Btn.click();

    await expect(page.getByTestId("city-row-delhi")).toBeVisible();
    await expect(page.getByTestId("city-row-mumbai")).toBeVisible();
    await expect(page.getByTestId("city-row-agra")).not.toBeVisible();
    await expect(page.getByTestId("city-row-patna")).not.toBeVisible();

    // Filter by Tier 2
    const tier2Btn = page.getByTestId("tier-filter-tier2");
    await tier2Btn.click();

    await expect(page.getByTestId("city-row-delhi")).not.toBeVisible();
    await expect(page.getByTestId("city-row-agra")).toBeVisible();
    await expect(page.getByTestId("city-row-patna")).toBeVisible();

    // Search filter
    const searchInput = page.getByTestId("search-cities-input");
    await page.getByTestId("tier-filter-all").click();
    await searchInput.fill("Kolkata");

    await expect(page.getByTestId("city-row-kolkata")).toBeVisible();
    await expect(page.getByTestId("city-row-chennai")).not.toBeVisible();
  });

  test("displays data quality flag for length variance and completeness caveats", async ({
    page,
  }) => {
    // Bhopal has > 3% variance vs reference
    await expect(page.getByTestId("data-quality-flag-bhopal")).toBeVisible();

    // Bhopal has data completeness caveat
    await expect(page.getByTestId("completeness-caveat-bhopal")).toBeVisible();

    // Clicking a row expands the detail drawer
    await page.getByTestId("city-row-bhopal").click();
    await expect(page.getByRole("status")).toContainText(
      "Data Completeness Notice"
    );
  });

  test("provides seamless bidirectional navigation between / and /compare", async ({
    page,
  }) => {
    // Return to map from /compare
    const navToMap = page.getByTestId("nav-to-map");
    await expect(navToMap).toBeVisible();
    await navToMap.click();

    // Verify on home map
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("nav-to-compare")).toBeVisible();

    // Navigate back to compare from home map
    await page.getByTestId("nav-to-compare").click();
    await expect(page).toHaveURL(/\/compare/);
    await expect(page.getByTestId("compare-table")).toBeVisible();
  });
});
