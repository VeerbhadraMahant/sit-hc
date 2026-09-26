import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = "http://localhost:3000";
const OUT = path.join(process.cwd(), "docs", "preview");

async function main() {
  if (!fs.existsSync(OUT)) {
    fs.mkdirSync(OUT, { recursive: true });
  }

  const browser = await chromium.launch();

  // 1. Overview
  {
    console.log("Capturing 01-overview-critical-banner.png...");
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 });
    await page.goto(`${BASE}/dashboard`, { waitUntil: "load", timeout: 25000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, "01-overview-critical-banner.png"), fullPage: false });
    await page.close();
  }

  // 2. Alerts Triage
  {
    console.log("Capturing 02-alerts-triage-view.png...");
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 });
    await page.goto(`${BASE}/dashboard/feedback?urgency=critical`, { waitUntil: "load", timeout: 25000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, "02-alerts-triage-view.png"), fullPage: false });
    await page.close();
  }

  // 3. Critical Escalation Drawer
  {
    console.log("Capturing 03-critical-escalation-drawer.png...");
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 });
    await page.goto(`${BASE}/dashboard/feedback?urgency=critical`, { waitUntil: "load", timeout: 25000 });
    await page.waitForTimeout(1500);
    const firstRow = page.locator('a[href*="id="]').first();
    if (await firstRow.count()) {
      await firstRow.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: path.join(OUT, "03-critical-escalation-drawer.png"), fullPage: false });
    await page.close();
  }

  // 4. Insights
  {
    console.log("Capturing 04-insights-critical-concerns.png...");
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 });
    await page.goto(`${BASE}/dashboard/insights`, { waitUntil: "load", timeout: 25000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, "04-insights-critical-concerns.png"), fullPage: false });
    await page.close();
  }

  // 5. Portal Checkin (Clean Scale, No Emojis)
  {
    console.log("Capturing 05-portal-checkin-clean-scale.png...");
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 });
    await page.goto(`${BASE}/portal/checkin`, { waitUntil: "load", timeout: 25000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, "05-portal-checkin-clean-scale.png"), fullPage: false });
    await page.close();
  }

  await browser.close();
  console.log("Screenshot run finished successfully!");
}

main().catch((err) => {
  console.error("Screenshot error:", err);
  process.exit(1);
});
