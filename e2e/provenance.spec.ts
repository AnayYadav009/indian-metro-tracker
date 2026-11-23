import { test, expect } from "@playwright/test";
import {
  goToCityPage,
  openSegment,
  openStation,
  cityProvenanceFooter,
  metadataPanel,
  segmentDetail,
  stationDetail,
  provenanceFooter,
  provenanceDisclaimerNotice,
} from "./helpers";

test.describe("M19 Provenance Layer Display", () => {
  const disclaimerText = "Unofficial data. Estimates only. Check with the operator before you travel.";

  test("city page displays provenance footer and disclaimer notice", async ({ page }) => {
    await goToCityPage(page, "delhi");

    const footer = cityProvenanceFooter(page);
    await expect(footer).toBeVisible();

    // Text status label (currently unverified)
    await expect(footer).toContainText("Unverified");
    await expect(footer).toContainText("No official source link");
    await expect(footer).toContainText("Not verified");

    // Single disclaimer notice per section
    const disclaimer = provenanceDisclaimerNotice(footer);
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toHaveText(disclaimerText);
  });

  test("segment detail panel displays line provenance and disclaimer notice", async ({ page }) => {
    await openSegment(page, "delhi", "del-red-seg-01");

    const panel = metadataPanel(page);
    await expect(panel).toBeVisible();

    const detail = segmentDetail(page);
    await expect(detail).toBeVisible();

    const footer = provenanceFooter(detail);
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("Unverified");
    await expect(footer).toContainText("No official source link");
    await expect(footer).toContainText("Not verified");

    const disclaimer = provenanceDisclaimerNotice(footer);
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toHaveText(disclaimerText);
  });

  test("station detail panel displays city and line provenance and disclaimer notice", async ({ page }) => {
    await openStation(page, "delhi", "del-kashmere-gate");

    const panel = metadataPanel(page);
    await expect(panel).toBeVisible();

    const detail = stationDetail(page);
    await expect(detail).toBeVisible();

    const footer = provenanceFooter(detail);
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("City:");
    await expect(footer).toContainText("Lines:");
    await expect(footer).toContainText("Unverified");

    const disclaimer = provenanceDisclaimerNotice(footer);
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toHaveText(disclaimerText);
  });

  test("mobile viewport displays provenance footer and disclaimer properly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await goToCityPage(page, "delhi");

    const footer = cityProvenanceFooter(page);
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("Unverified");

    const disclaimer = provenanceDisclaimerNotice(footer);
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toHaveText(disclaimerText);
  });
});
