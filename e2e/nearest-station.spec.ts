import { test, expect } from "@playwright/test";

test.describe("M16 Nearest Station Finder", () => {
  test("renders nearest station button and opens panel with privacy note", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ longitude: 77.2183, latitude: 28.6328 });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const nearestBtn = page.locator('[data-testid="find-nearest-btn"]');
    await expect(nearestBtn).toBeVisible();
    await nearestBtn.click();

    const panel = page.locator('[data-testid="nearest-station-panel"]');
    await expect(panel).toBeVisible();

    // Verify client-side privacy note
    const privacyNote = page.locator('[data-testid="privacy-note"]');
    await expect(privacyNote).toBeVisible();
    await expect(privacyNote).toContainText("Client-Side Only");
  });

  test("calculates nearest operational stations when geolocation is granted", async ({
    page,
    context,
  }) => {
    // Delhi Connaught Place / Rajiv Chowk
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ longitude: 77.2183, latitude: 28.6328 });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="find-nearest-btn"]').click();
    const panel = page.locator('[data-testid="nearest-station-panel"]');
    await expect(panel).toBeVisible();

    // Wait for locate-me action or automatic request to populate nearest stations list
    const stationItems = page.locator('[data-testid="nearest-station-item"]');
    await expect(stationItems.first()).toBeVisible({ timeout: 10000 });

    // Verify distance is labelled as straight-line
    const firstDistance = stationItems.first().locator('[data-testid="straight-line-distance"]');
    await expect(firstDistance).toBeVisible();
    await expect(firstDistance).toContainText("straight-line");

    // Verify station lines are displayed
    const lineBadges = stationItems.first().locator('[data-testid="station-line-badge"]');
    await expect(lineBadges.first()).toBeVisible();

    // Verify closest station name (Rajiv Chowk or adjacent central station)
    const panelText = await stationItems.first().textContent();
    expect(panelText).toMatch(/Rajiv Chowk|Barakhamba|Janpath|Shivaji Stadium/i);
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

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="find-nearest-btn"]').click();

    // Expect permission denied banner
    const deniedBanner = page.locator('[data-testid="geo-permission-denied"]');
    await expect(deniedBanner).toBeVisible({ timeout: 10000 });
    await expect(deniedBanner).toContainText("Location access was denied");

    // Verify manual fallbacks are present
    await expect(page.locator('[data-testid="pick-point-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="city-fallback-select"]')).toBeVisible();

    // Test city search / jump fallback
    await page.locator('[data-testid="city-fallback-select"]').selectOption({ label: "Kolkata" });

    // Once a city is selected, nearest stations list appears for that city
    const stationItems = page.locator('[data-testid="nearest-station-item"]');
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

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="find-nearest-btn"]').click();

    const tooFarMessage = page.locator('[data-testid="too-far-message"]');
    await expect(tooFarMessage).toBeVisible({ timeout: 10000 });
    await expect(tooFarMessage).toContainText("Metro Service Out of Range (>50 km)");
    await expect(tooFarMessage).toContainText("out of range (> 50 km)");
  });

  test("informs user when in a city with no operational metro network (Surat)", async ({
    page,
    context,
  }) => {
    // Surat coordinates: Surat has only construction lines and 0 operational stations
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ longitude: 72.83, latitude: 21.17 });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="find-nearest-btn"]').click();

    const noOpMessage = page.locator('[data-testid="no-operational-message"]');
    await expect(noOpMessage).toBeVisible({ timeout: 10000 });
    await expect(noOpMessage).toContainText("No Operational Metro Yet");
    await expect(noOpMessage).toContainText("Surat metro is currently under construction");

    // Toggle construction stations
    const toggleConstruction = page.locator('[data-testid="toggle-construction"]');
    await toggleConstruction.check();

    // After checking, under construction stations are shown with tag
    const stationItems = page.locator('[data-testid="nearest-station-item"]');
    await expect(stationItems.first()).toBeVisible();
    await expect(page.locator('[data-testid="not-yet-open-badge"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="not-yet-open-badge"]').first()).toContainText(
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

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !!(window as any)._mapLibreInstance, undefined, { timeout: 15000 });

    await page.locator('[data-testid="find-nearest-btn"]').click();

    // Click pick-on-map button
    const pickBtn = page.locator('[data-testid="pick-point-btn"]');
    await pickBtn.click();

    const banner = page.locator('[data-testid="picking-location-banner"]');
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
    const userMarker = page.locator('[data-testid="user-location-marker"]');
    await expect(userMarker).toBeVisible();

    // Nearest station results populate with nearby Delhi stations
    const stationItems = page.locator('[data-testid="nearest-station-item"]');
    await expect(stationItems.first()).toBeVisible({ timeout: 10000 });
  });
});
