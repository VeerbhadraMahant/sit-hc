/**
 * Captures real app screenshots for the landing page, headless (not the user's Chrome).
 * Requires a server already running (dev or `next start`) — pass its URL via BASE_URL.
 *
 *   npm run screenshots                       # http://localhost:3000
 *   BASE_URL=http://localhost:3001 npm run screenshots
 */
import { chromium, type Page } from "playwright";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = "public/screenshots";
const VIEWPORT = { width: 1440, height: 900 };

async function loginViaApi(page: Page, email: string, password: string) {
  // Reuse the same cookie-issuing path as scripts/dev-session.mjs, but inside the browser
  // context so the app's own client picks up the session normally.
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    async ([url, anonKey, email, password]) => {
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(`Sign-in failed: ${res.status} ${await res.text()}`);
      const session = await res.json();
      const projectRef = new URL(url).hostname.split(".")[0];
      const cookieValue = `base64-${btoa(
        JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + session.expires_in,
          token_type: session.token_type,
          user: session.user,
        }),
      )}`;
      document.cookie = `sb-${projectRef}-auth-token=${encodeURIComponent(cookieValue)}; path=/; max-age=31536000`;
    },
    [process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, email, password] as const,
  );
}

async function shot(page: Page, path: string, file: string, opts: { wait?: number; fullPage?: boolean } = {}) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  if (opts.wait) await page.waitForTimeout(opts.wait);
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: opts.fullPage ?? false });
  console.log(`  ${file}`);
}

async function main() {
  const browser = await chromium.launch();

  // ── HR dashboard ──────────────────────────────────────────────
  {
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
    await loginViaApi(page, process.env.HR_ADMIN_EMAIL!, process.env.HR_ADMIN_PASSWORD!);
    console.log("HR:");
    await shot(page, "/dashboard", "dashboard.png", { wait: 600 });
    await shot(page, "/dashboard/feedback", "feedback-inbox.png", { wait: 400 });
    // Open the first row's detail panel for a richer shot.
    const firstRow = page.locator('a[href^="/dashboard/feedback?id="]').first();
    if (await firstRow.count()) {
      await firstRow.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: `${OUT}/feedback-detail.png` });
    console.log("  feedback-detail.png");
    await shot(page, "/dashboard/insights", "insights.png", { wait: 500 });
    await shot(page, "/dashboard/surveys", "surveys-hr.png", { wait: 400 });
    await shot(page, "/dashboard/updates", "updates-hr.png", { wait: 400 });
    await page.close();
  }

  // ── Ask AI (with a real answer) ───────────────────────────────
  {
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
    await loginViaApi(page, process.env.HR_ADMIN_EMAIL!, process.env.HR_ADMIN_PASSWORD!);
    await page.goto(`${BASE}/dashboard/ask`, { waitUntil: "networkidle" });
    const input = page.locator("textarea, input[type=text]").first();
    await input.fill("What are the top concerns in Engineering this quarter?");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(9000); // let the streamed answer + sources render
    console.log("Ask AI:");
    await page.screenshot({ path: `${OUT}/ask-ai.png` }); // no re-navigation — would reset the chat
    console.log("  ask-ai.png");
    await page.close();
  }

  // ── Public: submit + track ────────────────────────────────────
  {
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
    console.log("Public:");
    await shot(page, "/submit", "submit.png", { wait: 300 });
    const voiceTab = page.getByRole("tab", { name: /voice/i });
    if (await voiceTab.count()) {
      await voiceTab.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `${OUT}/submit-voice.png` });
    console.log("  submit-voice.png");
    await page.close();
  }

  // ── Employee portal ───────────────────────────────────────────
  {
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
    await loginViaApi(page, process.env.DEMO_EMPLOYEE_EMAIL!, process.env.DEMO_EMPLOYEE_PASSWORD!);
    console.log("Portal:");
    await shot(page, "/portal", "portal-home.png", { wait: 500 });
    await shot(page, "/portal/surveys", "portal-surveys.png", { wait: 400 });
    await shot(page, "/portal/checkin", "portal-checkin.png", { wait: 400 });
    await shot(page, "/portal/updates", "portal-updates.png", { wait: 400 });
    await page.close();
  }

  await browser.close();
  console.log(`\nDone. Screenshots in ${OUT}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
