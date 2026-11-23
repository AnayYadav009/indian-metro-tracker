import { test, expect } from "@playwright/test";
import {
  gotoHome,
  openRouteFinder,
  routeFinderButton,
  routeFinderPanel,
  routeCitySelect,
  routeOriginInput,
  routeDestinationInput,
  routeResults,
  routeGuardNotice,
  routeDisclaimer,
  routeOriginMarker,
  routeDestinationMarker,
  routeSwapButton,
  routeSameStationNotice,
} from "./helpers";

test.describe("M18 Route Finder", () => {
  test("opens Route Finder panel from header button and displays city selector", async ({
    page,
  }) => {
    await gotoHome(page);
    await page.waitForLoadState("domcontentloaded");

    const routeBtn = routeFinderButton(page);
    await expect(routeBtn).toBeVisible();
    await routeBtn.click();

    const panel = routeFinderPanel(page);
    await expect(panel).toBeVisible();

    const citySelect = routeCitySelect(page);
    await expect(citySelect).toBeVisible();
  });

  test("displays guard notice for non-routable networks (Surat)", async ({
    page,
  }) => {
    await gotoHome(page);
    await page.waitForLoadState("domcontentloaded");

    await openRouteFinder(page);
    const panel = routeFinderPanel(page);
    await expect(panel).toBeVisible();

    // Select Surat
    const citySelect = routeCitySelect(page);
    await citySelect.selectOption("surat");

    // Verify guard notice is displayed
    const guardNotice = routeGuardNotice(page);
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
    await gotoHome(page, {
      city: "kochi",
      from: "kochi-aluva",
      to: "kochi-edappally",
    });
    await page.waitForLoadState("domcontentloaded");

    const panel = routeFinderPanel(page);
    await expect(panel).toBeVisible();

    // Verify inputs populated
    const originInput = routeOriginInput(page);
    await expect(originInput).toHaveValue("Aluva");

    const destInput = routeDestinationInput(page);
    await expect(destInput).toHaveValue("Edappally");

    // Verify route results summary
    const resultsContainer = routeResults(page);
    await expect(resultsContainer).toBeVisible();

    // Check stops count
    await expect(resultsContainer).toContainText("8"); // 8 stops
    await expect(resultsContainer).toContainText("0"); // 0 transfers

    // Check disclaimer note
    const disclaimer = routeDisclaimer(page);
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText("rough estimates");
    await expect(disclaimer).toContainText("32 km/h");

    // Verify route markers on map
    const originMarker = routeOriginMarker(page);
    await expect(originMarker).toBeVisible();

    const destMarker = routeDestinationMarker(page);
    await expect(destMarker).toBeVisible();
  });

  test("swaps origin and destination correctly", async ({ page }) => {
    await gotoHome(page, {
      city: "kochi",
      from: "kochi-aluva",
      to: "kochi-edappally",
    });
    await page.waitForLoadState("domcontentloaded");

    const swapBtn = routeSwapButton(page);
    await expect(swapBtn).toBeVisible();
    await swapBtn.click();

    const originInput = routeOriginInput(page);
    await expect(originInput).toHaveValue("Edappally");

    const destInput = routeDestinationInput(page);
    await expect(destInput).toHaveValue("Aluva");
  });

  test("displays notice when origin and destination are the same station", async ({
    page,
  }) => {
    await gotoHome(page, {
      city: "kochi",
      from: "kochi-aluva",
      to: "kochi-aluva",
    });
    await page.waitForLoadState("domcontentloaded");

    const sameStationNotice = routeSameStationNotice(page);
    await expect(sameStationNotice).toBeVisible();
    await expect(sameStationNotice).toContainText(
      "Origin and destination are the same station"
    );
  });

  test("calculates route on routable Tier 1 big city network (Bengaluru)", async ({
    page,
  }) => {
    await gotoHome(page, {
      city: "bengaluru",
      from: "blr-whitefield-kadugodi",
      to: "blr-nadaprabhu-kempegowda-majestic",
    });
    await page.waitForLoadState("domcontentloaded");

    const panel = routeFinderPanel(page);
    await expect(panel).toBeVisible();

    const originInput = routeOriginInput(page);
    await expect(originInput).toHaveValue("Whitefield (Kadugodi)");

    const destInput = routeDestinationInput(page);
    await expect(destInput).toHaveValue(
      "Nadaprabhu Kempegowda, Majestic"
    );

    const resultsContainer = routeResults(page);
    await expect(resultsContainer).toBeVisible();
    await expect(resultsContainer).toContainText("Purple Line");
  });

  test("displays audit guard notice on guarded network (Bhopal)", async ({
    page,
  }) => {
    await gotoHome(page, { city: "bhopal" });
    await page.waitForLoadState("domcontentloaded");

    const routeBtn = routeFinderButton(page);
    await expect(routeBtn).toBeVisible();
    await routeBtn.click();

    const panel = routeFinderPanel(page);
    await expect(panel).toBeVisible();

    const guardNotice = routeGuardNotice(page);
    await expect(guardNotice).toBeVisible();
    await expect(guardNotice).toContainText(
      "Routing is not available for this network yet"
    );
    await expect(guardNotice).toContainText("PRE-01");
  });
});
