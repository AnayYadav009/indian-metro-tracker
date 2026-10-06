import { test, expect } from "@playwright/test";

function rectIntersects(
  r1: { x: number; y: number; width: number; height: number },
  r2: { x: number; y: number; width: number; height: number }
) {
  return !(
    r2.x >= r1.x + r1.width ||
    r2.x + r2.width <= r1.x ||
    r2.y >= r1.y + r1.height ||
    r2.y + r2.height <= r1.y
  );
}

test.describe("OSM Attribution Visibility & Zero-Intersection (Phase 6)", () => {
  const viewports = [
    { name: "mobile (375x812)", width: 375, height: 812 },
    { name: "tablet (768x1024)", width: 768, height: 1024 },
    { name: "desktop (1440x900)", width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`attribution is visible, inside viewport, and never intersects legend or metadata on ${vp.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Test without feature selected (Legend expanded and collapsed)
      await page.goto("/");
      const attribution = page.getByTestId("osm-attribution").first();
      await expect(attribution).toBeVisible();

      let attrBox = await attribution.boundingBox();
      expect(attrBox).not.toBeNull();
      if (!attrBox) return;

      // Inside viewport
      expect(attrBox.x).toBeGreaterThanOrEqual(0);
      expect(attrBox.y).toBeGreaterThanOrEqual(0);
      expect(attrBox.x + attrBox.width).toBeLessThanOrEqual(vp.width + 1);
      expect(attrBox.y + attrBox.height).toBeLessThanOrEqual(vp.height + 1);

      // Check legend intersection (expanded)
      const legend = page.getByTestId("map-legend");
      let legendBox = await legend.boundingBox();
      expect(legendBox).not.toBeNull();
      if (legendBox) {
        expect(rectIntersects(attrBox, legendBox)).toBe(false);
      }

      // Toggle legend to collapsed
      await page.getByTestId("toggle-legend-btn").click();
      await page.waitForTimeout(200);

      attrBox = await attribution.boundingBox();
      legendBox = await legend.boundingBox();
      expect(attrBox).not.toBeNull();
      expect(legendBox).not.toBeNull();
      if (attrBox && legendBox) {
        expect(rectIntersects(attrBox, legendBox)).toBe(false);
      }

      // 2. Test with feature selected (MetadataPanel open)
      await page.goto("/?city=delhi&selected=station:del-ramesh-nagar");
      const metaPanel = page.getByTestId("metadata-panel");
      await expect(metaPanel).toBeVisible();

      // On mobile viewports, the attribution is docked inside the sheet footer; on desktop it is in the bottom-right container
      const activeAttr =
        vp.width < 768
          ? page.getByTestId("osm-attribution-mobile")
          : page.getByTestId("osm-attribution");

      await expect(activeAttr).toBeVisible();
      attrBox = await activeAttr.boundingBox();
      expect(attrBox).not.toBeNull();

      if (attrBox) {
        expect(attrBox.x).toBeGreaterThanOrEqual(0);
        expect(attrBox.y).toBeGreaterThanOrEqual(0);
        expect(attrBox.x + attrBox.width).toBeLessThanOrEqual(vp.width + 1);
        expect(attrBox.y + attrBox.height).toBeLessThanOrEqual(vp.height + 1);

        // On desktop/tablet (where metadata panel is a side floating card), verify zero intersection
        if (vp.width >= 768) {
          const metaBox = await metaPanel.boundingBox();
          expect(metaBox).not.toBeNull();
          if (metaBox) {
            expect(rectIntersects(attrBox, metaBox)).toBe(false);
          }
        }
      }
    });
  }
});
