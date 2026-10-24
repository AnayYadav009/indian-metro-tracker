import { test, expect } from "@playwright/test";

test.describe("M20 Report-an-Error Expansion", () => {
  test("shows report issue button with prefilled GitHub issue URL on segment panel", async ({
    page,
  }) => {
    // Navigate using deep link for a segment
    await page.goto("/?city=delhi&selected=segment:del-red-seg-01");

    const metadataPanel = page.getByTestId("metadata-panel");
    await expect(metadataPanel).toBeVisible();

    const reportButton = page.getByTestId("report-issue-button");
    await expect(reportButton).toBeVisible();
    await expect(reportButton).toContainText("Report an issue");

    // Verify external link attributes
    await expect(reportButton).toHaveAttribute("target", "_blank");
    await expect(reportButton).toHaveAttribute("rel", "noopener noreferrer");
    await expect(reportButton).toHaveAttribute(
      "aria-label",
      "Report an issue on GitHub (opens in a new tab)"
    );

    const href = await reportButton.getAttribute("href");
    expect(href).not.toBeNull();

    const issueUrl = new URL(href!);
    expect(issueUrl.origin).toBe("https://github.com");
    expect(issueUrl.pathname).toBe("/AnayYadav009/indian-metro-tracker/issues/new");
    expect(issueUrl.searchParams.get("template")).toBe("data-correction.yml");
    expect(issueUrl.searchParams.get("labels")).toBe("data-correction");

    const title = issueUrl.searchParams.get("title");
    expect(title).toContain("[Data Correction]: Line");

    const body = issueUrl.searchParams.get("body");
    expect(body).toContain("Feature Diagnostics");
    expect(body).toContain("del-red-seg-01");
    expect(body).toContain("Delhi");
    expect(body).toContain("Network Provenance");
    expect(body).toContain("Line Provenance Status:** unverified");
    expect(body).toContain("Map Permalink");
    expect(body).toContain("selected=segment%3Adel-red-seg-01");

    // Length constraint check: generated URL must be under 7,500 chars
    expect(href!.length).toBeLessThan(7500);
  });

  test("shows report issue button with prefilled GitHub issue URL on station panel", async ({
    page,
  }) => {
    // Navigate using deep link for a station
    await page.goto("/?city=delhi&selected=station:del-kashmere-gate");

    const metadataPanel = page.getByTestId("metadata-panel");
    await expect(metadataPanel).toBeVisible();

    const reportButton = page.getByTestId("report-issue-button");
    await expect(reportButton).toBeVisible();
    await expect(reportButton).toContainText("Report an issue");

    const href = await reportButton.getAttribute("href");
    expect(href).not.toBeNull();

    const issueUrl = new URL(href!);
    expect(issueUrl.origin).toBe("https://github.com");
    expect(issueUrl.pathname).toBe("/AnayYadav009/indian-metro-tracker/issues/new");
    expect(issueUrl.searchParams.get("template")).toBe("data-correction.yml");
    expect(issueUrl.searchParams.get("labels")).toBe("data-correction");

    const title = issueUrl.searchParams.get("title");
    expect(title).toContain("[Data Correction]: Station Kashmere Gate");

    const body = issueUrl.searchParams.get("body");
    expect(body).toContain("Feature Diagnostics");
    expect(body).toContain("del-kashmere-gate");
    expect(body).toContain("Network Provenance");
    expect(body).toContain("City Provenance Status:** unverified");
    expect(body).toContain("Line Provenance Status:** unverified");
    expect(body).toContain("Map Permalink");
    expect(body).toContain("selected=station%3Adel-kashmere-gate");

    // Length constraint check: generated URL must be under 7,500 chars
    expect(href!.length).toBeLessThan(7500);
  });

  test("shows report issue button with prefilled GitHub issue URL on route finder results", async ({
    page,
  }) => {
    // Navigate to a calculated route in Kochi
    await page.goto("/?city=kochi&from=kochi-aluva&to=kochi-edappally");
    await page.waitForLoadState("domcontentloaded");

    const resultsContainer = page.locator('[data-testid="route-results-container"]');
    await expect(resultsContainer).toBeVisible();

    const reportButton = resultsContainer.getByTestId("report-issue-button");
    await expect(reportButton).toBeVisible();
    await expect(reportButton).toHaveAttribute("target", "_blank");
    await expect(reportButton).toHaveAttribute("rel", "noopener noreferrer");
    await expect(reportButton).toHaveAttribute(
      "aria-label",
      "Report an issue on GitHub (opens in a new tab)"
    );

    const href = await reportButton.getAttribute("href");
    expect(href).not.toBeNull();

    const issueUrl = new URL(href!);
    expect(issueUrl.origin).toBe("https://github.com");
    expect(issueUrl.pathname).toBe("/AnayYadav009/indian-metro-tracker/issues/new");
    expect(issueUrl.searchParams.get("template")).toBe("data-correction.yml");
    expect(issueUrl.searchParams.get("labels")).toBe("data-correction");

    const title = issueUrl.searchParams.get("title");
    expect(title).toContain("[Data Correction]: Route Aluva to Edappally (Kochi)");

    const body = issueUrl.searchParams.get("body");
    expect(body).toContain("Route Diagnostics");
    expect(body).toContain("Origin Station:** Aluva");
    expect(body).toContain("Destination Station:** Edappally");
    expect(body).toContain("Total Stations:** 8");
    expect(body).toContain("Page URL");
    expect(body).toContain("/city/kochi");

    expect(href!.length).toBeLessThan(7500);
  });

  test("shows report issue button with prefilled GitHub issue URL on city page", async ({
    page,
  }) => {
    // Navigate to city page for Kochi
    await page.goto("/city/kochi");
    await page.waitForLoadState("domcontentloaded");

    const reportButton = page.getByTestId("report-issue-button");
    await expect(reportButton).toBeVisible();
    await expect(reportButton).toHaveAttribute("target", "_blank");
    await expect(reportButton).toHaveAttribute("rel", "noopener noreferrer");
    await expect(reportButton).toHaveAttribute(
      "aria-label",
      "Report an issue on GitHub (opens in a new tab)"
    );

    const href = await reportButton.getAttribute("href");
    expect(href).not.toBeNull();

    const issueUrl = new URL(href!);
    expect(issueUrl.origin).toBe("https://github.com");
    expect(issueUrl.pathname).toBe("/AnayYadav009/indian-metro-tracker/issues/new");
    expect(issueUrl.searchParams.get("template")).toBe("data-correction.yml");
    expect(issueUrl.searchParams.get("labels")).toBe("data-correction");

    const title = issueUrl.searchParams.get("title");
    expect(title).toBe("[Data Correction]: City Kochi");

    const body = issueUrl.searchParams.get("body");
    expect(body).toContain("City Network Diagnostics");
    expect(body).toContain("City:** Kochi (`kochi`)");
    expect(body).toContain("Provenance Status:** unverified");
    expect(body).toContain("Page URL");
    expect(body).toContain("/city/kochi");

    expect(href!.length).toBeLessThan(7500);
  });

  test("remains completely passive and sends no requests to GitHub on panel or page view", async ({
    page,
  }) => {
    let gitHubRequestMade = false;
    page.on("request", (req) => {
      if (req.url().includes("github.com")) {
        gitHubRequestMade = true;
      }
    });

    await page.goto("/city/kochi");
    await expect(page.getByTestId("report-issue-button")).toBeVisible();

    // Give time to ensure no background fetch is fired
    await page.waitForTimeout(500);
    expect(gitHubRequestMade).toBe(false);
  });
});
