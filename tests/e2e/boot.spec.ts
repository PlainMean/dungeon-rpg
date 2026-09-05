// Browser smoke: mobile touch viewport, boot the game, tap through, assert ZERO entries
// from console.error, window.onerror (pageerror), unhandledrejection, or failed requests.

import { test, expect } from "@playwright/test";

test("boots on a mobile viewport without any console errors", async ({ page }) => {
  const errors: string[] = [];
  const failedRequests: string[] = [];

  await page.addInitScript(() => {
    // capture window.onerror + unhandledrejection into a global array
    (window as unknown as { __jsErrors: string[] }).__jsErrors = [];
    window.addEventListener("error", (e) => {
      (window as unknown as { __jsErrors: string[] }).__jsErrors.push("error: " + e.message);
    });
    window.addEventListener("unhandledrejection", (e) => {
      (window as unknown as { __jsErrors: string[] }).__jsErrors.push("unhandled: " + String(e.reason));
    });
  });
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console.error: " + m.text());
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("requestfailed", (r) => {
    if (!r.url().includes("favicon")) failedRequests.push(r.url());
  });

  await page.goto("/dungeon-rpg/");

  // Phaser canvas + our HUD must appear
  await page.waitForSelector("canvas", { timeout: 20000 });
  await page.waitForSelector(".hud", { timeout: 5000 });
  await expect(page.locator(".hud-gold")).toContainText("30");

  // let the scene settle and generate textures
  await page.waitForTimeout(1500);

  // touch-move via the D-pad (dispatched pointer events, our handler listens on pointerdown)
  const down = page.locator(".d-btn.down");
  await down.dispatchEvent("pointerdown");
  await page.waitForTimeout(400);
  await down.dispatchEvent("pointerup");
  const up = page.locator(".d-btn.up");
  await up.dispatchEvent("pointerdown");
  await page.waitForTimeout(300);
  await up.dispatchEvent("pointerup");
  await page.waitForTimeout(400);

  // the world canvas is actually rendering (nonzero dimensions)
  const box = await page.locator("canvas").boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(100);
  expect(box!.height).toBeGreaterThan(100);

  // window.onerror + unhandledrejection captured in-page
  const jsErrors = await page.evaluate(() => (window as unknown as { __jsErrors: string[] }).__jsErrors || []);
  expect(jsErrors).toEqual([]);

  // zero console errors, pageerrors, failed requests
  expect(errors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("interact button dispatches without errors in the overworld", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/dungeon-rpg/");
  await page.waitForSelector(".btn-interact", { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.locator(".btn-interact").tap();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});