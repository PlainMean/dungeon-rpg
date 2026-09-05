// Capture screenshots of the game against the local preview server for sharing.
import { chromium } from "@playwright/test";

const base = "http://localhost:4399/dungeon-rpg/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForSelector("canvas", { timeout: 20000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: "/home/cmuxao/repos/dungeon-rpg/shot_overworld.png" });

// move to see the player + world
const down = page.locator(".d-btn.down");
await down.dispatchEvent("pointerdown");
await page.waitForTimeout(600);
await down.dispatchEvent("pointerup");
await page.waitForTimeout(300);
await page.screenshot({ path: "/home/cmuxao/repos/dungeon-rpg/shot_moved.png" });

// open the interact -> will likely trigger a dialogue or nothing; then menu via toggle isn't on screen.
console.log("ERRORS:", JSON.stringify(errors));
await browser.close();