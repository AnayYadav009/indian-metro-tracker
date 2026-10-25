import { test, expect } from "@playwright/test";
import {
  gotoHome,
  filterPanel,
  cityChip,
  statusToggle,
  phasePill,
  phaseEmptyHint,
  filterToggle,
  resetFiltersBtn,
} from "./helpers";

test.describe("Filter UI and Map Interaction", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHome(page);
  });

  test("renders the floating filter panel with city and status options", async ({
    page,
  }) => {
    const panel = filterPanel(page);
    await expect(panel).toBeVisible();

    // Check header
    await expect(
      page.getByText("Filters & Network Controls")
    ).toBeVisible();

    // Check cities
    await expect(cityChip(page, "all")).toBeVisible();
    await expect(cityChip(page, "delhi")).toBeVisible();
    await expect(cityChip(page, "bengaluru")).toBeVisible();
    await expect(cityChip(page, "mumbai")).toBeVisible();

    // Check status options with visual indicators
    await expect(statusToggle(page, "operational")).toBeVisible();
    await expect(statusToggle(page, "construction")).toBeVisible();
    await expect(statusToggle(page, "planned")).toBeVisible();

    await expect(statusToggle(page, "operational").getByText("Solid")).toBeVisible();
    await expect(statusToggle(page, "construction").getByText("Dashed")).toBeVisible();
    await expect(statusToggle(page, "planned").getByText("Dotted")).toBeVisible();
  });

  test("allows selecting a city and shows dynamic city phases", async ({
    page,
  }) => {
    // When no city is selected, phase pills are hidden and empty hint is visible
    await expect(phaseEmptyHint(page)).toBeVisible();
    await expect(phasePill(page, "all")).not.toBeVisible();
    await expect(phasePill(page, "I")).not.toBeVisible();

    // Click Delhi
    await cityChip(page, "delhi").click();
    const toggle = filterToggle(page);
    if ((await toggle.getAttribute("aria-expanded")) === "false") {
      await toggle.click({ force: true });
    }

    // Delhi phases I-IV should appear and empty hint should disappear
    await expect(phaseEmptyHint(page)).not.toBeVisible();
    await expect(phasePill(page, "I")).toBeVisible();
    await expect(phasePill(page, "I")).toHaveText("Phase I");
    await expect(phasePill(page, "IV")).toBeVisible();
    await expect(phasePill(page, "IV")).toHaveText("Phase IV");

    // Click Bengaluru
    if ((await toggle.getAttribute("aria-expanded")) === "false") {
      await toggle.click({ force: true });
    }
    await cityChip(page, "bengaluru").click();
    if ((await toggle.getAttribute("aria-expanded")) === "false") {
      await toggle.click({ force: true });
    }
    await expect(phasePill(page, "1")).toBeVisible();
    await expect(phasePill(page, "1")).toHaveText("Phase 1");
    await expect(phasePill(page, "2B")).toBeVisible();
    await expect(phasePill(page, "2B")).toHaveText("Phase 2B");
  });

  test("toggles status filters and reset button works", async ({ page }) => {
    // Toggle off operational
    const opBtn = statusToggle(page, "operational");
    await opBtn.click();

    // Reset button appears
    const resetBtn = resetFiltersBtn(page);
    await expect(resetBtn).toBeVisible();

    // Click reset
    await resetBtn.click();
    await expect(resetBtn).not.toBeVisible();
  });
});
