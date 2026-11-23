import { test, expect } from "@playwright/test";

test.describe("M11 Report-an-Error Button", () => {
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
    expect(body).toContain("Map Permalink");
    expect(body).toContain("selected=segment%3Adel-red-seg-01");

    // Length constraint check: generated URL must be under 6 KB
    expect(href!.length).toBeLessThan(6144);
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
    expect(body).toContain("Map Permalink");
    expect(body).toContain("selected=station%3Adel-kashmere-gate");

    // Length constraint check: generated URL must be under 6 KB
    expect(href!.length).toBeLessThan(6144);
  });

  test("remains completely passive and sends no requests to GitHub on panel view", async ({
    page,
  }) => {
    let gitHubRequestMade = false;
    page.on("request", (req) => {
      if (req.url().includes("github.com")) {
        gitHubRequestMade = true;
      }
    });

    await page.goto("/?city=delhi&selected=station:del-kashmere-gate");
    await expect(page.getByTestId("metadata-panel")).toBeVisible();
    await expect(page.getByTestId("report-issue-button")).toBeVisible();

    // Give time to ensure no background fetch is fired
    await page.waitForTimeout(500);
    expect(gitHubRequestMade).toBe(false);
  });
});
