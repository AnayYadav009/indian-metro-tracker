import { test, expect } from "@playwright/test";

test.describe("M19 Provenance Layer Display", () => {
  const disclaimerText = "Unofficial data. Estimates only. Check with the operator before you travel.";

  test("city page displays provenance footer and disclaimer notice", async ({ page }) => {
    await page.goto("/city/delhi/");

    const footer = page.getByTestId("city-provenance-footer");
    await expect(footer).toBeVisible();

    // Text status label (currently unverified)
    await expect(footer).toContainText("Unverified");
    await expect(footer).toContainText("No official source link");
    await expect(footer).toContainText("Not verified");

    // Single disclaimer notice per section
    const disclaimer = footer.getByTestId("provenance-disclaimer-notice");
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toHaveText(disclaimerText);
  });

  test("segment detail panel displays line provenance and disclaimer notice", async ({ page }) => {
    await page.goto("/?city=delhi&selected=segment:del-red-seg-01");

    const metadataPanel = page.getByTestId("metadata-panel");
    await expect(metadataPanel).toBeVisible();

    const segmentDetail = page.getByTestId("segment-detail");
    await expect(segmentDetail).toBeVisible();

    const footer = segmentDetail.getByTestId("provenance-footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("Unverified");
    await expect(footer).toContainText("No official source link");
    await expect(footer).toContainText("Not verified");

    const disclaimer = footer.getByTestId("provenance-disclaimer-notice");
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toHaveText(disclaimerText);
  });

  test("station detail panel displays city and line provenance and disclaimer notice", async ({ page }) => {
    await page.goto("/?city=delhi&selected=station:del-kashmere-gate");

    const metadataPanel = page.getByTestId("metadata-panel");
    await expect(metadataPanel).toBeVisible();

    const stationDetail = page.getByTestId("station-detail");
    await expect(stationDetail).toBeVisible();

    const footer = stationDetail.getByTestId("provenance-footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("City:");
    await expect(footer).toContainText("Lines:");
    await expect(footer).toContainText("Unverified");

    const disclaimer = footer.getByTestId("provenance-disclaimer-notice");
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toHaveText(disclaimerText);
  });

  test("mobile viewport displays provenance footer and disclaimer properly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/city/delhi/");

    const footer = page.getByTestId("city-provenance-footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("Unverified");

    const disclaimer = footer.getByTestId("provenance-disclaimer-notice");
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toHaveText(disclaimerText);
  });
});
