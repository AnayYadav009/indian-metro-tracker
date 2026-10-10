import { test, expect } from "@playwright/test";

test.describe("M13 Timeline Slider", () => {
  test("renders timeline slider with accessible controls and current year", async ({
    page,
  }) => {
    await page.goto("/");

    const container = page.getByTestId("timeline-slider-container");
    await expect(container).toBeVisible();

    // Verify accessible role and values
    const slider = page.getByTestId("timeline-range-slider");
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute("role", "slider");
    await expect(slider).toHaveAttribute("aria-valuemin", "1984");

    const currentYearText = page.getByTestId("timeline-current-year");
    await expect(currentYearText).toBeVisible();
    const currentYear = new Date().getFullYear().toString();
    await expect(currentYearText).toHaveText(currentYear);

    // Play button exists with appropriate label
    const playBtn = page.getByTestId("timeline-play-btn");
    await expect(playBtn).toBeVisible();
    await expect(playBtn).toHaveAttribute("aria-label", "Play timeline");
  });

  test("scrubbing the year slider updates displayed year and URL param", async ({
    page,
  }) => {
    await page.goto("/");

    const slider = page.getByTestId("timeline-range-slider");
    await expect(slider).toBeVisible();
    await slider.focus();
    await slider.press("Home");
    for (let year = 1985; year <= 2010; year++) {
      await slider.press("ArrowRight", { delay: 5 });
    }

    // Year text updates immediately
    const currentYearText = page.getByTestId("timeline-current-year");
    await expect(currentYearText).toHaveText("2010");

    // URL parameter ?year=2010 is updated
    await expect(page).toHaveURL(/year=2010/);

    // Reset button appears when year filter is active
    const resetBtn = page.getByTestId("timeline-reset-btn");
    await expect(resetBtn).toBeVisible();

    // Clicking reset restores max year and removes ?year=
    await resetBtn.click();
    const maxYear = new Date().getFullYear().toString();
    await expect(currentYearText).toHaveText(maxYear);
    expect(page.url()).not.toContain("year=2010");
  });

  test("hydrates selected year from URL parameter ?year=2015", async ({ page }) => {
    await page.goto("/?year=2015");

    const currentYearText = page.getByTestId("timeline-current-year");
    await expect(currentYearText).toHaveText("2015");

    const slider = page.getByTestId("timeline-range-slider");
    await expect(slider).toHaveValue("2015");
  });

  test("toggles play and pause state", async ({ page }) => {
    await page.goto("/?year=2000");

    const playBtn = page.getByTestId("timeline-play-btn");
    await expect(playBtn).toHaveAttribute("aria-label", "Play timeline");

    // Click play
    await playBtn.click();
    await expect(playBtn).toHaveAttribute("aria-label", "Pause timeline");

    // Click pause
    await playBtn.click();
    await expect(playBtn).toHaveAttribute("aria-label", "Play timeline");
  });

  test("include future toggle toggles aria-pressed state", async ({ page }) => {
    await page.goto("/");

    const toggle = page.getByTestId("timeline-future-toggle");
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
    await page.goto("/");

    const toggle = page.getByTestId("toggle-stations-btn");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(page).toHaveURL(/stations=0/);

    await page.reload();
    await expect(page.getByTestId("toggle-stations-btn")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    await page.getByTestId("toggle-stations-btn").click();
    await expect(page).not.toHaveURL(/stations=0/);
  });

  test("displays mini inline SVG sparkline chart on desktop viewports", async ({
    page,
  }) => {
    await page.goto("/");

    const sparkline = page.getByTestId("timeline-sparkline-chart");
    // Visible on standard desktop viewports
    if (page.viewportSize() && page.viewportSize()!.width >= 640) {
      await expect(sparkline).toBeVisible();
      const svg = sparkline.locator("svg");
      await expect(svg).toBeVisible();
    }
  });
});
