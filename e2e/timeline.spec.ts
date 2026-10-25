import { test, expect } from "@playwright/test";
import {
  gotoHome,
  timelineContainer,
  timelineSlider,
  timelineCurrentYear,
  timelinePlayButton,
  timelineResetButton,
  timelineFutureToggle,
  toggleStationsButton,
  timelineSparkline,
} from "./helpers";

test.describe("M13 Timeline Slider", () => {
  test("renders timeline slider with accessible controls and current year", async ({
    page,
  }) => {
    await gotoHome(page);

    const container = timelineContainer(page);
    await expect(container).toBeVisible();

    // Verify accessible role and values
    const slider = timelineSlider(page);
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute("role", "slider");
    await expect(slider).toHaveAttribute("aria-valuemin", "1984");

    const currentYearText = timelineCurrentYear(page);
    await expect(currentYearText).toBeVisible();
    const currentYear = new Date().getFullYear().toString();
    await expect(currentYearText).toHaveText(currentYear);

    // Play button exists with appropriate label
    const playBtn = timelinePlayButton(page);
    await expect(playBtn).toBeVisible();
    await expect(playBtn).toHaveAttribute("aria-label", "Play timeline");
  });

  test("scrubbing the year slider updates displayed year and URL param", async ({
    page,
  }) => {
    await gotoHome(page);
    await page.waitForLoadState("domcontentloaded");

    const slider = timelineSlider(page);
    await expect(slider).toBeVisible();

    const currentYearText = timelineCurrentYear(page);

    // Wait until hydration attaches change handlers and updates year
    await expect(async () => {
      await slider.evaluate((el: HTMLInputElement) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (setter) {
          setter.call(el, "2010");
        } else {
          el.value = "2010";
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await expect(currentYearText).toHaveText("2010", { timeout: 1000 });
    }).toPass({ timeout: 10000 });

    // URL parameter ?year=2010 is updated
    await expect(page).toHaveURL(/year=2010/);

    // Reset button appears when year filter is active
    const resetBtn = timelineResetButton(page);
    await expect(resetBtn).toBeVisible();

    // Clicking reset restores max year and removes ?year=
    await resetBtn.click();
    const maxYear = new Date().getFullYear().toString();
    await expect(currentYearText).toHaveText(maxYear);
    expect(page.url()).not.toContain("year=2010");
  });

  test("hydrates selected year from URL parameter ?year=2015", async ({ page }) => {
    await gotoHome(page, { year: "2015" });

    const currentYearText = timelineCurrentYear(page);
    await expect(currentYearText).toHaveText("2015");

    const slider = timelineSlider(page);
    await expect(slider).toHaveValue("2015");
  });

  test("toggles play and pause state", async ({ page }) => {
    await gotoHome(page, { year: "2000" });
    await page.waitForLoadState("domcontentloaded");

    const playBtn = timelinePlayButton(page);
    await expect(playBtn).toBeVisible();
    await expect(playBtn).toHaveAttribute("aria-label", "Play timeline");

    // Wait until hydration is complete and toggle activates
    await expect(async () => {
      await playBtn.click();
      await expect(playBtn).toHaveAttribute("aria-label", "Pause timeline", { timeout: 1000 });
    }).toPass({ timeout: 10000 });

    // Click pause
    await playBtn.click();
    await expect(playBtn).toHaveAttribute("aria-label", "Play timeline");
  });

  test("include future toggle toggles aria-pressed state", async ({ page }) => {
    await gotoHome(page);

    const toggle = timelineFutureToggle(page);
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  test("toggles station visibility and round-trips the URL parameter", async ({
    page,
  }) => {
    await gotoHome(page);

    const toggle = toggleStationsButton(page);
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(page).toHaveURL(/stations=0/);

    await page.reload();
    await expect(toggleStationsButton(page)).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    await toggleStationsButton(page).click();
    await expect(page).not.toHaveURL(/stations=0/);
  });

  test("displays mini inline SVG sparkline chart on desktop viewports", async ({
    page,
  }) => {
    await gotoHome(page);

    const sparkline = timelineSparkline(page);
    // Visible on standard desktop viewports
    if (page.viewportSize() && page.viewportSize()!.width >= 640) {
      await expect(sparkline).toBeVisible();
      const svg = sparkline.locator("svg");
      await expect(svg).toBeVisible();
    }
  });
});
