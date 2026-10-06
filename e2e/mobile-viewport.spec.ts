import { test, expect } from "@playwright/test";

test.describe("Mobile Viewport Height (Task 2.7)", () => {
  test("renders full layout within dynamic viewport height without overflow", async ({
    page,
  }) => {
    // Mobile viewport (iPhone 13 size: 390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // Verify main root container uses h-dvh and matches viewport height
    const rootContainer = page.locator(".bg-slate-950").first();
    await expect(rootContainer).toBeVisible();

    const boundingBox = await rootContainer.boundingBox();
    expect(boundingBox).not.toBeNull();
    if (boundingBox) {
      expect(boundingBox.height).toBe(844);
      expect(boundingBox.width).toBe(390);
    }

    // Verify map canvas fills available vertical space
    const mapContainer = page.getByTestId("map-container");
    await expect(mapContainer).toBeVisible();
    const mapBox = await mapContainer.boundingBox();
    expect(mapBox).not.toBeNull();
    if (mapBox) {
      expect(mapBox.height).toBeGreaterThan(700);
    }

    // Verify header and attribution are visible
    await expect(
      page.getByRole("heading", { name: "Indian Metro Network Tracker" })
    ).toBeVisible();
    await expect(page.getByTestId("osm-attribution")).toBeVisible();
  });
});
