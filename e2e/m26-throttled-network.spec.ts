import { test, expect } from "@playwright/test";
import { mapContainer, cityPickerTrigger } from "./helpers";

test.describe("M26 Throttled Slow Network", () => {
  test("measures time to interactive and first usable map under throttled network", async ({
    page,
    context,
  }, testInfo) => {
    // Chromium CDP emulation only works on Chromium projects
    test.skip(testInfo.project.name !== "chromium", "CDP network throttling requires Chromium");

    test.setTimeout(120_000);

    const client = await context.newCDPSession(page);

    // Standard Fast 3G profile (1.6 Mbps download, 750 Kbps upload, 150 ms latency)
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: Math.floor((1.6 * 1024 * 1024) / 8),
      uploadThroughput: Math.floor((750 * 1024) / 8),
    });

    const startTime = Date.now();
    await page.goto("/");

    // 1. Time to Interactive: City picker trigger is loaded and ready for interaction
    const trigger = cityPickerTrigger(page);
    await expect(trigger).toBeVisible({ timeout: 60_000 });
    const ttiMs = Date.now() - startTime;

    // 2. First Usable Map: MapLibre instance initialized and canvas visible
    await expect(mapContainer(page)).toBeVisible({ timeout: 60_000 });
    await page.waitForFunction(() => {
      const map = (window as any)._mapLibreInstance;
      return map && map.loaded();
    }, null, { timeout: 60_000 });
    const firstUsableMapMs = Date.now() - startTime;

    // Report measured numbers without inventing arbitrary pass/fail assertions
    console.log(`\n======================================================`);
    console.log(`📊 M26 Throttled Network Profile (Fast 3G)`);
    console.log(`   • Latency: 150 ms`);
    console.log(`   • Download: 1.6 Mbps (200 KB/s)`);
    console.log(`   • Upload: 750 Kbps (93.75 KB/s)`);
    console.log(`   ⏱️ Time to Interactive (TTI): ${ttiMs} ms`);
    console.log(`   🗺️ First Usable Map: ${firstUsableMapMs} ms`);
    console.log(`======================================================\n`);

    testInfo.annotations.push({
      type: "network-measurement",
      description: `Fast 3G: TTI=${ttiMs}ms, FirstUsableMap=${firstUsableMapMs}ms`,
    });

    expect(ttiMs).toBeGreaterThan(0);
    expect(firstUsableMapMs).toBeGreaterThan(0);
  });
});

