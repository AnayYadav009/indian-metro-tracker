import { test, expect } from "@playwright/test";

test.describe("M18 Route Finder", () => {
  test("opens Route Finder panel from header button and displays city selector", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const routeBtn = page.locator('[data-testid="find-route-btn"]');
    await expect(routeBtn).toBeVisible();
    await routeBtn.click();

    const panel = page.locator('[data-testid="route-finder-panel"]');
    await expect(panel).toBeVisible();

    const citySelect = page.locator('[data-testid="route-city-select"]');
    await expect(citySelect).toBeVisible();
  });

  test("displays guard notice for non-routable networks (Surat)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="find-route-btn"]').click();
    const panel = page.locator('[data-testid="route-finder-panel"]');
    await expect(panel).toBeVisible();

    // Select Surat
    const citySelect = page.locator('[data-testid="route-city-select"]');
    await citySelect.selectOption("surat");

    // Verify guard notice is displayed
    const guardNotice = page.locator('[data-testid="route-guard-notice"]');
    await expect(guardNotice).toBeVisible();
    await expect(guardNotice).toContainText(
      "Routing is not available for this network yet"
    );
    await expect(guardNotice).toContainText("under construction");
  });

  test("calculates route with stops, est time, and disclaimer on routable network (Kochi)", async ({
    page,
  }) => {
    // Navigate with deep-linked URL params
    await page.goto("/?city=kochi&from=kochi-aluva&to=kochi-edappally");
    await page.waitForLoadState("domcontentloaded");

    const panel = page.locator('[data-testid="route-finder-panel"]');
    await expect(panel).toBeVisible();

    // Verify inputs populated
    const originInput = page.locator('[data-testid="route-origin-input"]');
    await expect(originInput).toHaveValue("Aluva");

    const destInput = page.locator('[data-testid="route-destination-input"]');
    await expect(destInput).toHaveValue("Edappally");

    // Verify route results summary
    const resultsContainer = page.locator('[data-testid="route-results-container"]');
    await expect(resultsContainer).toBeVisible();

    // Check stops count
    await expect(resultsContainer).toContainText("8"); // 8 stops
    await expect(resultsContainer).toContainText("0"); // 0 transfers

    // Check disclaimer note
    const disclaimer = page.locator('[data-testid="route-disclaimer"]');
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText("rough estimates");
    await expect(disclaimer).toContainText("32 km/h");

    // Verify route markers on map
    const originMarker = page.locator('[data-testid="route-origin-marker"]');
    await expect(originMarker).toBeVisible();

    const destMarker = page.locator('[data-testid="route-destination-marker"]');
    await expect(destMarker).toBeVisible();
  });

  test("swaps origin and destination correctly", async ({ page }) => {
    await page.goto("/?city=kochi&from=kochi-aluva&to=kochi-edappally");
    await page.waitForLoadState("domcontentloaded");

    const swapBtn = page.locator('[data-testid="route-swap-btn"]');
    await expect(swapBtn).toBeVisible();
    await swapBtn.click();

    const originInput = page.locator('[data-testid="route-origin-input"]');
    await expect(originInput).toHaveValue("Edappally");

    const destInput = page.locator('[data-testid="route-destination-input"]');
    await expect(destInput).toHaveValue("Aluva");
  });

  test("displays notice when origin and destination are the same station", async ({
    page,
  }) => {
    await page.goto("/?city=kochi&from=kochi-aluva&to=kochi-aluva");
    await page.waitForLoadState("domcontentloaded");

    const sameStationNotice = page.locator('[data-testid="route-same-station-notice"]');
    await expect(sameStationNotice).toBeVisible();
    await expect(sameStationNotice).toContainText(
      "Origin and destination are the same station"
    );
  });
});
