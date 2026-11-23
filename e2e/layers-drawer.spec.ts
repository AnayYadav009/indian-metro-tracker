import { test, expect } from "@playwright/test";
import {
  closeLayersDrawer,
  gotoHome,
  layersDrawer,
  layersDrawerTrigger,
  mapContainer,
  mapLegend,
  filterPanel,
  timelineSlider,
  attribution,
  openLayersDrawer,
} from "./helpers";

test.describe("Layers and Settings drawer", () => {
  test("keeps secondary controls closed until requested, then opens and closes cleanly", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoHome(page);

    await expect(layersDrawerTrigger(page)).toHaveAttribute("aria-expanded", "false");
    await expect(layersDrawer(page)).not.toBeVisible();

    await openLayersDrawer(page);
    await expect(layersDrawerTrigger(page)).toHaveAttribute("aria-expanded", "true");
    await expect(layersDrawer(page)).toBeVisible();
    await expect(timelineSlider(page)).toBeVisible();
    await expect(filterPanel(page)).toBeVisible();
    await expect(mapLegend(page)).toBeVisible();
    await expect(attribution(page)).toBeVisible();

    await closeLayersDrawer(page);
    await expect(layersDrawerTrigger(page)).toHaveAttribute("aria-expanded", "false");
    await expect(mapContainer(page)).toBeVisible();
    await expect(layersDrawer(page)).not.toBeVisible();
  });

  test("keeps the drawer in the viewport on a desktop layout", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoHome(page);
    await openLayersDrawer(page);

    const box = await layersDrawer(page).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1281);
    expect(box!.y + box!.height).toBeLessThanOrEqual(801);
  });
});
