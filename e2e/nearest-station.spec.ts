import { test, expect } from "@playwright/test";
import {
  gotoHome,
  openNearestStation,
  nearestStationButton,
  nearestStationPanel,
  privacyNote,
  nearestStationItem,
  straightLineDistance,
  stationLineBadge,
  geoPermissionDenied,
  pickPointButton,
  cityFallbackSelect,
  tooFarMessage,
  noOperationalMessage,
  toggleConstruction,
  notYetOpenBadge,
  walkDirectionsLink,
  pickingLocationBanner,
  userLocationMarker,
} from "./helpers";

test.describe("M16 Nearest Station Finder", () => {
  test("renders nearest station button and opens panel with privacy note", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ longitude: 77.2183, latitude: 28.6328 });

    await gotoHome(page);
    await page.waitForLoadState("domcontentloaded");

    const nearestBtn = nearestStationButton(page);
    await expect(nearestBtn).toBeVisible();
    await nearestBtn.click();

    const panel = nearestStationPanel(page);
    await expect(panel).toBeVisible();

    // Verify client-side privacy note
    const note = privacyNote(page);
    await expect(note).toBeVisible();
    await expect(note).toContainText("Client-Side Only");
  });

  test("calculates nearest operational stations when geolocation is granted", async ({
    page,
    context,
  }) => {
    // Delhi Connaught Place / Rajiv Chowk
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ longitude: 77.2183, latitude: 28.6328 });

    await gotoHome(page);
    await page.waitForLoadState("domcontentloaded");

    await openNearestStation(page);
    const panel = nearestStationPanel(page);
    await expect(panel).toBeVisible();

    // Wait for locate-me action or automatic request to populate nearest stations list
    const stationItems = nearestStationItem(page);
    await expect(stationItems.first()).toBeVisible({ timeout: 10000 });

    // Verify distance is labelled as straight-line
    const firstDistance = straightLineDistance(stationItems.first());
    await expect(firstDistance).toBeVisible();
    await expect(firstDistance).toContainText("straight-line");

    // Verify station lines are displayed
    const lineBadges = stationLineBadge(stationItems.first());
    await expect(lineBadges.first()).toBeVisible();

    // Verify closest station name (Rajiv Chowk or adjacent central station)
    const panelText = await stationItems.first().textContent();
    expect(panelText).toMatch(/Rajiv Chowk|Barakhamba|Janpath|Shivaji Stadium/i);
    // M25: Walking directions link with travelmode=walking
    const walkLink = walkDirectionsLink(stationItems.first());
    await expect(walkLink).toBeVisible();
    const href = await walkLink.getAttribute("href");
    expect(href).toContain("google.com/maps/dir/?api=1");
    expect(href).toContain("travelmode=walking");
    expect(href).toContain("origin=28.6328,77.2183");
  });

  test("handles geolocation permission denied gracefully with fallback options", async ({
    page,
  }) => {
    // Override geolocation to simulate permission denied
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "geolocation", {
        value: {
          getCurrentPosition: (_success: any, error: (err: any) => void) => {
            if (error) {
              error({
                code: 1, // PERMISSION_DENIED
                message: "User denied Geolocation",
                PERMISSION_DENIED: 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT: 3,
              });
            }
          },
          watchPosition: () => 0,
          clearWatch: () => {},
        },
      });
    });

    await gotoHome(page);
    await page.waitForLoadState("domcontentloaded");

    await openNearestStation(page);

    // Expect permission denied banner
    const deniedBanner = geoPermissionDenied(page);
    await expect(deniedBanner).toBeVisible({ timeout: 10000 });
    await expect(deniedBanner).toContainText("Location access was denied");

    // Verify manual fallbacks are present
    await expect(pickPointButton(page)).toBeVisible();
    await expect(cityFallbackSelect(page)).toBeVisible();

    // Test city search / jump fallback
    await cityFallbackSelect(page).selectOption({ label: "Kolkata" });

    // Once a city is selected, nearest stations list appears for that city
    const stationItems = nearestStationItem(page);
    await expect(stationItems.first()).toBeVisible();
    await expect(stationItems.first()).toContainText("Kolkata");
  });

  test("displays out of range notice when nearest station is over 50 km away", async ({
    page,
    context,
  }) => {
    // Remote Thar desert location far from any metro (>50 km)
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ longitude: 71.0, latitude: 26.5 });

    await gotoHome(page);
    await page.waitForLoadState("domcontentloaded");

    await openNearestStation(page);

    const tooFar = tooFarMessage(page);
    await expect(tooFar).toBeVisible({ timeout: 10000 });
    await expect(tooFar).toContainText("Metro Service Out of Range (>50 km)");
    await expect(tooFar).toContainText("out of range (> 50 km)");
  });

  test("informs user when in a city with no operational metro network (Surat)", async ({
    page,
    context,
  }) => {
    // Surat coordinates: Surat has only construction lines and 0 operational stations
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ longitude: 72.83, latitude: 21.17 });

    await gotoHome(page);
    await page.waitForLoadState("domcontentloaded");

    await openNearestStation(page);

    const noOp = noOperationalMessage(page);
    await expect(noOp).toBeVisible({ timeout: 10000 });
    await expect(noOp).toContainText("No Operational Metro Yet");
    await expect(noOp).toContainText("Surat metro is currently under construction");

    // Toggle construction stations
    const toggle = toggleConstruction(page);
    await toggle.check();

    // After checking, under construction stations are shown with tag
    const stationItems = nearestStationItem(page);
    await expect(stationItems.first()).toBeVisible();
    await expect(notYetOpenBadge(page).first()).toBeVisible();
    await expect(notYetOpenBadge(page).first()).toContainText(
      "Under Construction (Not yet open)"
    );
  });

  test("allows user to pick a point on the map as a manual fallback", async ({
    page,
  }) => {
    // Override geolocation to simulate permission denied so manual mode is active
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "geolocation", {
        value: {
          getCurrentPosition: (_success: any, error: (err: any) => void) => {
            if (error) {
              error({
                code: 1,
                message: "Location denied",
                PERMISSION_DENIED: 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT: 3,
              });
            }
          },
          watchPosition: () => 0,
          clearWatch: () => {},
        },
      });
    });

    await gotoHome(page);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !!(window as any)._mapLibreInstance, undefined, { timeout: 15000 });

    await openNearestStation(page);

    // Click pick-on-map button
    const pickBtn = pickPointButton(page);
    await pickBtn.click();

    const banner = pickingLocationBanner(page);
    await expect(banner).toBeVisible();

    // Dispatch click on the map canvas at Delhi coordinates
    await page.evaluate(() => {
      const map = (window as any)._mapLibreInstance;
      const point = map.project([77.2183, 28.6328]);
      const canvas = map.getCanvas();
      const rect = canvas.getBoundingClientRect();
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + point.x,
        clientY: rect.top + point.y,
      });
      canvas.dispatchEvent(clickEvent);
    });

    // The picked point marker appears on the map canvas
    const userMarker = userLocationMarker(page);
    await expect(userMarker).toBeVisible();

    // Nearest station results populate with nearby Delhi stations
    const stationItems = nearestStationItem(page);
    await expect(stationItems.first()).toBeVisible({ timeout: 10000 });
  });
});
