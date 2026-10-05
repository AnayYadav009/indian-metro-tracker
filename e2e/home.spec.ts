import { test, expect } from "@playwright/test";

test.describe("Home Page and Map Integration", () => {
  test("loads page and displays main title and milestone badge", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Indian Metro Network Tracker" })
    ).toBeVisible();
    await expect(
      page.getByText("Milestone 7: Real Data Pipeline")
    ).toBeVisible();
  });

  test("renders map container with persistent OSM attribution", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("map-container")).toBeVisible();
    await expect(page.getByTestId("osm-attribution")).toBeVisible();
    await expect(page.getByTestId("osm-attribution")).toContainText(
      "OpenStreetMap"
    );
  });
});
