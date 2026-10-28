import { test, expect } from "@playwright/test";
import { dataBadge, mapContainer, attribution, gotoHome, openLayersDrawer } from "./helpers";

test.describe("Home Page and Map Integration", () => {
  test("loads page and displays main title and data badges", async ({
    page,
  }) => {
    await gotoHome(page);
    await openLayersDrawer(page);
    await expect(
      page.getByRole("heading", { name: "Indian Metro Network Tracker" })
    ).toBeVisible();
    await expect(dataBadge(page)).toBeVisible();
    await expect(page.getByText("OpenFreeMap Positron")).toBeVisible();
  });

  test("renders map container with persistent OSM attribution", async ({
    page,
  }) => {
    await gotoHome(page);
    await openLayersDrawer(page);
    await expect(mapContainer(page)).toBeVisible();
    await expect(attribution(page)).toBeVisible();
    await expect(attribution(page)).toContainText(
      "OpenStreetMap"
    );
  });
});
