import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const screenshotsDir = path.resolve(process.cwd(), "reports/visual-qa/m10-2-delhi-golden");
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await desktopContext.newPage();

  console.log("Navigating to http://localhost:3000/?city=delhi&line=del-golden...");
  await page.goto("http://localhost:3000/?city=delhi&line=del-golden", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  // 1. Overview across full corridor (Delhi Aerocity to Tughlakabad)
  console.log("Capturing 01-desktop-overview.png...");
  await page.screenshot({ path: path.join(screenshotsDir, "01-desktop-overview.png") });

  // 2. Zoom to western interchange (Delhi Aerocity / Mahipalpur)
  console.log("Zooming into western terminus / Delhi Aerocity...");
  await page.evaluate(() => {
    const canvas = document.querySelector(".maplibregl-canvas");
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const event = new WheelEvent("wheel", {
        clientX: rect.width * 0.45,
        clientY: rect.height * 0.60,
        deltaY: -400,
        bubbles: true
      });
      canvas.dispatchEvent(event);
    }
  });
  await page.waitForTimeout(2000);
  console.log("Capturing 02-desktop-aerocity-terminal.png...");
  await page.screenshot({ path: path.join(screenshotsDir, "02-desktop-aerocity-terminal.png") });

  // 3. Zoom to eastern terminus (Tughlakabad interchange)
  console.log("Zooming into eastern terminus / Tughlakabad...");
  await page.evaluate(() => {
    const canvas = document.querySelector(".maplibregl-canvas");
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const event = new WheelEvent("wheel", {
        clientX: rect.width * 0.70,
        clientY: rect.height * 0.65,
        deltaY: -400,
        bubbles: true
      });
      canvas.dispatchEvent(event);
    }
  });
  await page.waitForTimeout(2000);
  console.log("Capturing 03-desktop-tughlakabad-terminal.png...");
  await page.screenshot({ path: path.join(screenshotsDir, "03-desktop-tughlakabad-terminal.png") });

  await desktopContext.close();

  // 4. Mobile view
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });
  const mobilePage = await mobileContext.newPage();
  console.log("Navigating mobile viewport...");
  await mobilePage.goto("http://localhost:3000/?city=delhi&line=del-golden", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(3000);
  console.log("Capturing 04-mobile-view.png...");
  await mobilePage.screenshot({ path: path.join(screenshotsDir, "04-mobile-view.png") });

  await mobileContext.close();
  await browser.close();

  console.log("✅ All visual QA screenshots for Delhi Golden Line captured successfully.");
}

main().catch((err) => {
  console.error("Error capturing visual QA:", err);
  process.exit(1);
});
