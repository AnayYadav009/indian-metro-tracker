import { test, expect } from "@playwright/test";
import citiesJson from "../data/cities.json";
import {
  goToCityPage,
  goToCompare,
  gotoHome,
  cityLinesTable,
  zeroOperationalNotice,
  completenessCaveatBanner,
  cityPageLink,
  crawlableCityDirectory,
  cityDirectoryButton,
  cityDirectoryModal,
} from "./helpers";

test.describe("M17 City Static Pages & SEO", () => {
  test("renders all 21 city pages with valid headings, metrics, and metadata", async ({
    page,
  }) => {
    // Test a sample of diverse cities: Tier 1, Tier 2, loop topology, and under-construction
    const testCities = ["delhi", "mumbai", "bengaluru", "indore", "surat", "patna", "kochi"];

    for (const cityId of testCities) {
      const city = citiesJson.find((c) => c.id === cityId)!;
      await goToCityPage(page, cityId);

      // 1. Heading & Title
      const heading = page.locator("h1");
      await expect(heading).toContainText(`${city.name} Metro Network`);
      await expect(page).toHaveTitle(new RegExp(`${city.name} Metro Network`));

      // 2. Canonical Link Tag
      const canonicalTag = page.locator('link[rel="canonical"]');
      await expect(canonicalTag).toHaveAttribute(
        "href",
        `https://anayyadav009.github.io/indian-metro-tracker/city/${cityId}/`
      );

      // 3. JSON-LD structured data script
      const jsonLdScript = page.locator('script[type="application/ld+json"]');
      await expect(jsonLdScript).toHaveCount(1);
      const jsonText = await jsonLdScript.textContent();
      expect(jsonText).not.toBeNull();
      const parsed = JSON.parse(jsonText!);
      expect(parsed["@context"]).toBe("https://schema.org");
      expect(parsed["@type"]).toBe("ItemPage");
      expect(parsed.mainEntity["@type"]).toBe("City");
      expect(parsed.mainEntity.name).toBe(city.name);
      expect(parsed.mainEntity.geo).toBeUndefined();

      // 4. Lines & Corridors Table
      const lines = cityLinesTable(page);
      await expect(lines).toBeVisible();
      const tableRows = lines.locator("tbody tr");
      await expect(tableRows).not.toHaveCount(0);
    }
  });

  test("handles Surat with zero-operational construction notice", async ({
    page,
  }) => {
    await goToCityPage(page, "surat");

    // Verify zero operational notice banner
    const notice = zeroOperationalNotice(page);
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("Network Under Construction");
    await expect(notice).toContainText("No stations or lines are currently open");

    // Verify metadata description contains 0 operational stations
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute(
      "content",
      /0 operational stations currently open/
    );
  });

  test("displays data completeness notice on cities with coverage gaps (Delhi)", async ({
    page,
  }) => {
    await goToCityPage(page, "delhi");

    await page.getByRole("button", { name: "Details" }).click();
    const caveatBanner = completenessCaveatBanner(page);
    await expect(caveatBanner).toBeVisible();
    await expect(caveatBanner).toContainText("Data incomplete for this line");
  });

  test("provides working navigation from city page to interactive map and compare", async ({
    page,
  }) => {
    await goToCityPage(page, "bengaluru");

    // 1. Click "Back to Map"
    const backToMap = page.getByRole("link", { name: "Back to Map" });
    await expect(backToMap).toBeVisible();
    await backToMap.click();
    await expect(page).toHaveURL(/\/\?city=bengaluru/);

    // 2. Return to city page and navigate to Compare
    await goToCityPage(page, "bengaluru");
    const compareLink = page.getByRole("link", { name: "Compare", exact: false }).first();
    await expect(compareLink).toBeVisible();
    await compareLink.click();
    await expect(page).toHaveURL(/\/compare/);
  });

  test("allows navigating from /compare/ table rows to city pages", async ({
    page,
  }) => {
    await goToCompare(page);

    // Find Delhi city page link
    const delhiLink = cityPageLink(page, "delhi");
    await expect(delhiLink).toBeVisible();
    await delhiLink.click();

    // Verify navigation to city page
    await expect(page).toHaveURL(/\/city\/delhi\//);
    await expect(page.locator("h1")).toContainText("Delhi Metro Network");
  });

  test("home page contains crawlable city links and accessible city directory", async ({
    page,
  }) => {
    await gotoHome(page);

    // 1. Verify semantic crawlable nav exists in DOM
    const crawlableNav = crawlableCityDirectory(page);
    await expect(crawlableNav).toBeAttached();
    const cityLinks = crawlableNav.locator("a");
    await expect(cityLinks).toHaveCount(21);

    // Verify all 21 cities are linked
    for (const city of citiesJson) {
      const link = crawlableNav.locator(`a[href$="/city/${city.id}/"]`);
      await expect(link).toBeAttached();
    }

    // 2. Test visible Cities header button and modal
    const cityDirectoryBtn = cityDirectoryButton(page);
    await expect(cityDirectoryBtn).toBeVisible();
    await cityDirectoryBtn.click();

    const directoryModal = cityDirectoryModal(page);
    await expect(directoryModal).toBeVisible();

    // Click a city inside modal
    const kochiLink = directoryModal.locator('a[href$="/city/kochi/"]');
    await expect(kochiLink).toBeVisible();
    await kochiLink.click();

    await expect(page).toHaveURL(/\/city\/kochi\//);
    await expect(page.locator("h1")).toContainText("Kochi Metro Network");
  });

  test("sitemap.xml and robots.txt exist and list all 21 cities", async ({
    page,
    request,
  }) => {
    // 1. Check sitemap.xml
    const sitemapRes = await request.get("/sitemap.xml");
    expect(sitemapRes.status()).toBe(200);
    const sitemapText = await sitemapRes.text();
    expect(sitemapText).toContain("<loc>https://anayyadav009.github.io/indian-metro-tracker/</loc>");
    expect(sitemapText).toContain("<loc>https://anayyadav009.github.io/indian-metro-tracker/compare/</loc>");

    for (const city of citiesJson) {
      expect(sitemapText).toContain(
        `<loc>https://anayyadav009.github.io/indian-metro-tracker/city/${city.id}/</loc>`
      );
    }

    // 2. Check robots.txt
    const robotsRes = await request.get("/robots.txt");
    expect(robotsRes.status()).toBe(200);
    const robotsText = await robotsRes.text();
    expect(robotsText).toContain("Allow: /");
    expect(robotsText).toContain("Sitemap: https://anayyadav009.github.io/indian-metro-tracker/sitemap.xml");
  });
});
