import { test, expect } from "@playwright/test";
import {
  goToCompare,
  comparePage,
  nationwideSummary,
  compareTable,
  cityRow,
  sortCityButton,
  sortOperationalKmButton,
  tierFilter,
  searchCitiesInput,
  dataQualityFlag,
  completenessCaveatCity,
  navToMap,
  navToCompare,
} from "./helpers";

test.describe("M14 Stats & Comparison Dashboard (/compare/)", () => {
  test.beforeEach(async ({ page }) => {
    await goToCompare(page);
  });

  test("renders comparison dashboard header and nationwide summary metrics", async ({
    page,
  }) => {
    await expect(comparePage(page)).toBeVisible();

    // Verify main title
    await expect(
      page.getByRole("heading", { name: /metro stats & city comparison/i })
    ).toBeVisible();

    // Verify nationwide summary section
    const summary = nationwideSummary(page);
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
    const table = compareTable(page);
    await expect(table).toBeVisible();

    // Check key cities are present
    await expect(cityRow(page, "delhi")).toBeVisible();
    await expect(cityRow(page, "mumbai")).toBeVisible();
    await expect(cityRow(page, "bengaluru")).toBeVisible();
    await expect(cityRow(page, "kolkata")).toBeVisible();
    await expect(cityRow(page, "surat")).toBeVisible();
    await expect(cityRow(page, "patna")).toBeVisible();
    await expect(cityRow(page, "agra")).toBeVisible();

    // Verify total row at bottom
    await expect(table).toContainText("Total (21 Cities)");
  });

  test("supports sorting table by city name and operational km", async ({
    page,
  }) => {
    // Sort by city name ascending
    const sortCityBtn = sortCityButton(page);
    await sortCityBtn.click();

    // First row should now be Agra (alphabetical)
    const firstRowAfterSort = compareTable(page)
      .locator("tbody tr")
      .first();
    await expect(firstRowAfterSort).toContainText("Agra");

    // Sort by operational km descending
    const sortOpKmBtn = sortOperationalKmButton(page);
    await sortOpKmBtn.click();

    // First row should now be Delhi (highest operational km)
    const topOpKmRow = compareTable(page)
      .locator("tbody tr")
      .first();
    await expect(topOpKmRow).toContainText("Delhi");
  });

  test("filters cities by tier (Tier 1 vs Tier 2) and search query", async ({
    page,
  }) => {
    // Filter by Tier 1
    const tier1Btn = tierFilter(page, "tier1");
    await tier1Btn.click();

    await expect(cityRow(page, "delhi")).toBeVisible();
    await expect(cityRow(page, "mumbai")).toBeVisible();
    await expect(cityRow(page, "agra")).not.toBeVisible();
    await expect(cityRow(page, "patna")).not.toBeVisible();

    // Filter by Tier 2
    const tier2Btn = tierFilter(page, "tier2");
    await tier2Btn.click();

    await expect(cityRow(page, "delhi")).not.toBeVisible();
    await expect(cityRow(page, "agra")).toBeVisible();
    await expect(cityRow(page, "patna")).toBeVisible();

    // Search filter
    const searchInput = searchCitiesInput(page);
    await tierFilter(page, "all").click();
    await searchInput.fill("Kolkata");

    await expect(cityRow(page, "kolkata")).toBeVisible();
    await expect(cityRow(page, "chennai")).not.toBeVisible();
  });

  test("displays data quality flag for length variance and completeness caveats", async ({
    page,
  }) => {
    // Bhopal has > 3% variance vs reference
    await expect(dataQualityFlag(page, "bhopal")).toBeVisible();

    // Bhopal has data completeness caveat
    await expect(completenessCaveatCity(page, "bhopal")).toBeVisible();

    // Clicking a row expands the detail drawer
    await cityRow(page, "bhopal").click();
    await expect(page.getByRole("status")).toContainText(
      "Data Completeness Notice"
    );
  });

  test("provides seamless bidirectional navigation between / and /compare", async ({
    page,
  }) => {
    // Return to map from /compare
    const toMap = navToMap(page);
    await expect(toMap).toBeVisible();
    await toMap.click();

    // Verify on home map
    await expect(page).toHaveURL(/\/$/);
    await expect(navToCompare(page)).toBeVisible();

    // Navigate back to compare from home map
    await navToCompare(page).click();
    await expect(page).toHaveURL(/\/compare/);
    await expect(compareTable(page)).toBeVisible();
  });
});
