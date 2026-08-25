import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { resolve } from "path";

const url = process.env.URL ?? "http://localhost:3000/";
const out = resolve(process.argv[2] ?? "/tmp/duck-shot.png");
const waitMs = Number(process.env.WAIT_MS ?? 1500);
const key = process.env.KEY;
const wheelDelta = Number(process.env.WHEEL_DELTA ?? 0);
const click = process.env.CLICK;

mkdirSync(resolve(out, ".."), { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
page.on("pageerror", (error) => console.error(error.stack));
page.on("console", async (message) => {
  if (message.type() !== "error") return;
  console.error("browser console:", message.text());
  for (const argument of message.args()) {
    try {
      console.error(await argument.jsonValue());
    } catch {}
  }
});
// The Next dev server keeps its HMR connection open, so `networkidle` can
// hang even after the WebGL scene is ready.
await page.goto(url, { waitUntil: "domcontentloaded" });
// Give the GLB + water normals a beat to settle after first paint.
if (key) {
  await page.waitForTimeout(600);
  await page.keyboard.down(key);
  await page.waitForTimeout(waitMs);
  await page.keyboard.up(key);
} else {
  await page.waitForTimeout(waitMs);
}
if (wheelDelta) {
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, wheelDelta);
  await page.waitForTimeout(waitMs);
}
if (click) {
  await page.getByRole("button", { name: click, exact: true }).click();
  await page.waitForTimeout(waitMs);
}
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log("wrote", out);
