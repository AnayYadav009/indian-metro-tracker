import { test, expect } from "@playwright/test";
import {
  cityOption,
  cityPickerTrigger,
  cityPickerSearch,
  gotoHome,
  openCityPicker,
} from "./helpers";

test.describe("Searchable city picker", () => {
  test("searches and selects a city from the header", async ({ page }) => {
    await gotoHome(page);
    await expect(cityPickerTrigger(page)).toContainText("All Cities");
    await openCityPicker(page);

    const search = cityPickerSearch(page);
    await search.fill("Bengaluru");
    await expect(cityOption(page, "bengaluru")).toBeVisible();
    await expect(cityOption(page, "delhi")).toBeHidden();
    await cityOption(page, "bengaluru").click();

    await expect(cityPickerTrigger(page)).toContainText("Bengaluru");
    await expect(cityPickerTrigger(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("keeps the city picker usable at a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await gotoHome(page);
    await expect(cityPickerTrigger(page)).toBeVisible();
    await openCityPicker(page);
    await cityPickerSearch(page).fill("Delhi");
    await expect(cityOption(page, "delhi")).toBeVisible();
    await cityOption(page, "delhi").click();
    await expect(cityPickerTrigger(page)).toContainText("Delhi");
  });
});
