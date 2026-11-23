import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("loads placeholder page and displays main title", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Indian Metro Network Tracker" })
    ).toBeVisible();
    await expect(page.getByText("Milestone 1")).toBeVisible();
  });
});
