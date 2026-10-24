import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const screenshotsDir = path.resolve(process.cwd(), "reports/visual-qa/m10-1-delhi-pink");
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await desktopContext.newPage();

  console.log("Navigating to http://localhost:3000/?city=delhi&line=del-pink...");
  await page.goto("http://localhost:3000/?city=delhi&line=del-pink", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  // 1. City / Network level overview
  console.log("Capturing 01-desktop-overview.png...");
  await page.screenshot({ path: path.join(screenshotsDir, "01-desktop-overview.png") });

  // 2. Dense junction / core zoom around Maujpur / Phase IV approach
  console.log("Zooming in to Maujpur / Phase IV corridor...");
  await page.evaluate(() => {
    const canvas = document.querySelector(".maplibregl-canvas");
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const event = new WheelEvent("wheel", {
        clientX: rect.width * 0.65,
        clientY: rect.height * 0.35,
        deltaY: -300,
        bubbles: true
      });
      canvas.dispatchEvent(event);
    }
  });
  await page.waitForTimeout(2000);
  console.log("Capturing 02-desktop-dense-core.png...");
  await page.screenshot({ path: path.join(screenshotsDir, "02-desktop-dense-core.png") });

  // 3. Line end zoom (terminal end)
  console.log("Capturing 03-desktop-line-end.png...");
  await page.evaluate(() => {
    const canvas = document.querySelector(".maplibregl-canvas");
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const event = new WheelEvent("wheel", {
        clientX: rect.width * 0.7,
        clientY: rect.height * 0.25,
        deltaY: -400,
        bubbles: true
      });
      canvas.dispatchEvent(event);
    }
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotsDir, "03-desktop-line-end.png") });

  // 4. Mobile viewport (390 x 844)
  console.log("Capturing 04-mobile-view.png...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:3000/?city=delhi&line=del-pink", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(3000);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, "04-mobile-view.png") });

  await browser.close();
  console.log("✅ Visual QA screenshots captured in", screenshotsDir);
}

main().catch(err => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
