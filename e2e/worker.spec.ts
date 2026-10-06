import { test, expect } from "@playwright/test";

test.describe("MapLibre Worker Isolation (Zero Runtime unpkg)", () => {
  test("loads MapLibre worker locally with zero network requests to unpkg.com", async ({
    page,
  }) => {
    const unpkgRequests: string[] = [];
    const localWorkerRequests: string[] = [];
    const localSharedRequests: string[] = [];
    const failed404s: string[] = [];

    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("unpkg.com")) {
        unpkgRequests.push(url);
      }
      if (url.includes("maplibre-gl-worker.mjs")) {
        localWorkerRequests.push(url);
      }
      if (url.includes("maplibre-gl-shared.mjs")) {
        localSharedRequests.push(url);
      }
    });

    page.on("response", (res) => {
      if (res.status() === 404) {
        failed404s.push(res.url());
      }
    });

    await page.goto("/");

    // Wait for map canvas to be loaded and visible
    const mapCanvas = page.locator("canvas.maplibregl-canvas");
    await expect(mapCanvas).toBeVisible({ timeout: 15000 });

    // Assert zero unpkg requests took place
    expect(unpkgRequests).toHaveLength(0);

    // Assert that the local worker was requested
    expect(localWorkerRequests.length).toBeGreaterThanOrEqual(1);

    // Assert no 404 errors for maplibre files
    const maplibre404s = failed404s.filter((u) => u.includes("maplibre-gl"));
    expect(maplibre404s).toHaveLength(0);
  });
});
