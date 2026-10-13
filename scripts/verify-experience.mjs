// Browser regression checks: navigation, outbound projects, layout and idle rendering.
// Run against a built site: URL=http://localhost:3002 node scripts/verify-experience.mjs
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.URL || "http://localhost:3000";
const dir = process.env.ARTIFACT_DIR || "/tmp/rubberduck-verification";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
});
await context.addInitScript(() => {
  window.__drawCount = 0;
  for (const type of [
    window.WebGLRenderingContext,
    window.WebGL2RenderingContext,
  ]) {
    if (!type) continue;
    for (const name of [
      "drawArrays",
      "drawElements",
      "drawArraysInstanced",
      "drawElementsInstanced",
    ]) {
      const original = type.prototype[name];
      if (!original) continue;
      type.prototype[name] = function (...args) {
        window.__drawCount++;
        return original.apply(this, args);
      };
    }
  }
});
const page = await context.newPage();
const errors = [];
const checks = [];
page.on("pageerror", (e) => errors.push(e.message));
const overlap = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
try {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator("canvas").first().waitFor();
  await page.waitForTimeout(1500);
  assert.equal(await page.locator(".rd-overlay-story").count(), 0,
    "Home must not contain a reading backdrop");
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 768, height: 1024 },
    { width: 640, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const boxes = await page
      .locator("[data-nav-item]")
      .evaluateAll((elements) =>
        elements.map((e) => {
          const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }),
      );
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++)
        assert(
          !overlap(boxes[i], boxes[j]),
          "Home nav labels overlap at " + viewport.width,
        );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: dir + "/home.png" });
  checks.push("Desktop home navigation does not overlap at 640, 768 or 1440px");
  for (const view of ["projects", "about", "contact"]) {
    await page.locator('[data-nav-item="' + view + '"]').click();
    await page.locator("[data-story-scroll] h1").waitFor({ state: "visible" });
    await page.waitForTimeout(500);
    assert.equal(
      await page.locator("[data-story-scroll]").getAttribute("data-story-open"),
      "true",
    );
    if (view === "projects")
      assert.equal(
        await page
          .locator("[data-story-scroll] a.rd-project-action--live")
          .count(),
        2,
      );
    await page
      .getByRole("button", { name: "Back to home", exact: true })
      .click();
    await page.waitForTimeout(450);
    assert.equal(
      await page.locator("[data-story-scroll], .rd-overlay-story").count(),
      0,
      "Returning Home must remove the entire reading backdrop",
    );
  }
  checks.push("All three home overlays open and fully unmount when closed");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(200);
  const start = await page.evaluate(() => window.__drawCount);
  await page.waitForTimeout(600);
  const end = await page.evaluate(() => window.__drawCount);
  assert.equal(end, start, "Hidden scene still renders");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(300);
  assert(
    (await page.evaluate(() => window.__drawCount)) > end,
    "Scene did not resume",
  );
  checks.push("Hidden scene performs zero draws and resumes when visible");
  for (const route of [
    "/work",
    "/work/nutripanda",
    "/work/mi-amor-tales",
    "/about",
    "/contact",
  ]) {
    console.log("Checking", route);
    await page.goto(base + route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    assert.equal(await page.locator("main h1").count(), 1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert(!overflow, route + " overflows");
    await page.screenshot({
      path: dir + "/" + route.slice(1).replaceAll("/", "-") + ".png",
    });
    if (route === "/work") {
      const hrefs = await page
        .locator(".rd-project-action--live")
        .evaluateAll((a) =>
          a.map((e) => ({ href: e.href, target: e.target, rel: e.rel })),
        );
      assert.deepEqual(
        hrefs.map((x) => x.href),
        ["https://nutripanda.in/", "https://www.miamortales.com/"],
      );
      assert(
        hrefs.every((x) => x.target === "_blank" && x.rel.includes("noopener")),
      );
      await page.locator(".rd-project-entry").first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: dir + "/case-study-list.png" });
      await page
        .getByRole("link", { name: "Read case study", exact: true })
        .first()
        .click();
      await page.waitForURL("**/work/nutripanda");
      await page
        .getByRole("link", { name: "All work", exact: true })
        .first()
        .click();
      await page.waitForURL("**/work");
    }
    if (route === "/work/nutripanda") {
      await page.locator("a.rd-next-project").click();
      await page.waitForURL("**/work/mi-amor-tales");
    }
  }
  checks.push(
    "Every story route renders, both live URLs are present, and case/back/next navigation works",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/work/nutripanda", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Contact", exact: true })
    .click();
  await page.waitForURL("**/contact");
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: dir + "/mobile-contact.png" });
  await page.goto(base + "/work/nutripanda", { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: dir + "/mobile-case-study.png" });
  checks.push("Mobile navigation opens, closes with Escape, and navigates");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page
    .getByRole("link", { name: "Work", exact: true })
    .filter({ visible: true })
    .click();
  await page.locator("[data-story-scroll] h1").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Back to home", exact: true }).click();
  await page.waitForTimeout(100);
  assert.equal(await page.locator("[data-story-scroll], .rd-overlay-story").count(), 0);
  checks.push("Reduced-motion overlay opens and closes");
  assert.deepEqual(errors, []);
  checks.push("No browser page errors");
  console.log(JSON.stringify({ checks }, null, 2));
  await writeFile(
    dir + "/checks.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} finally {
  await browser.close();
}
