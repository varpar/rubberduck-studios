import { chromium } from "playwright";
import { resolve } from "path";

const url = process.env.URL ?? "http://localhost:3002/";
const nav = process.env.NAV ?? "Projects";
const out = resolve(process.argv[2] ?? "/tmp/duck-shot-nav.png");
const swimMs = Number(process.env.SWIM_MS ?? 4500);
const scrollTo = process.env.SCROLL_TO;
const directPath = process.env.DIRECT_PATH;
const fullPage = process.env.FULL_PAGE === "true";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 2,
  // Navigation screenshots test the settled state, not transition timing.
  reducedMotion: "reduce",
});
const page = await ctx.newPage();
page.on("pageerror", (error) => console.error(error.stack));
await page.goto(directPath ? new URL(directPath, url).href : url, {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(1200);
if (!directPath) {
  // Click the nav item; wait for the swim animation + content fade-in.
  await page.getByRole("button", { name: nav }).click();
  await page.waitForTimeout(swimMs);
}
if (scrollTo === "bottom") {
  await page.evaluate(() => {
    const scroller = Array.from(
      document.querySelectorAll<HTMLElement>("div"),
    )
      .filter((element) => element.scrollHeight > element.clientHeight + 1)
      .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  });
  await page.waitForTimeout(500);
}
await page.screenshot({ path: out, fullPage });
await browser.close();
console.log("wrote", out);
