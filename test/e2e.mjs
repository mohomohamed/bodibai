import assert from "node:assert/strict";
import { chromium } from "playwright";

const webUrl = process.env.WEB_URL || "http://localhost:5174";
const password = process.env.TEST_APP_PASSWORD || "development-password";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

const runSuffix = Date.now().toString(36);
const onlineName = `E2E Online ${runSuffix}`;
const offlineName = `E2E Offline ${runSuffix}`;

try {
  await page.goto(webUrl, { waitUntil: "networkidle" });
  await page.getByLabel("Your name").fill("Browser Test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Records", exact: true }).waitFor();

  await page.locator(".desktop-add").click();
  await page.locator("#record-name").fill(onlineName);
  await page.locator("#record-area").fill("Male");
  await page.getByRole("dialog", { name: "Add record" }).getByRole("button", { name: "Add record", exact: true }).click();
  await page.locator(".record-card", { hasText: onlineName }).waitFor();

  await context.setOffline(true);
  await page.locator(".desktop-add").click();
  await page.locator("#record-name").fill(offlineName);
  await page.locator("#record-area").fill("Hulhumale");
  await page.getByRole("dialog", { name: "Add record" }).getByRole("button", { name: "Add record", exact: true }).click();
  await page.locator(".record-card", { hasText: offlineName }).waitFor();
  await page.getByText(/You’re offline/).waitFor();
  assert.match(await page.locator(".top-sync").getAttribute("aria-label"), /Synchronize/);

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.locator(".sync-badge.synced").waitFor({ timeout: 15_000 });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".record-card", { hasText: offlineName }).waitFor();

  await page.locator(".record-card", { hasText: offlineName }).click();
  await page.getByRole("button", { name: "Add address" }).click();
  await page.locator("#address-label").fill("Delivery");
  await page.locator("#address-line-1").fill("Test House");
  await page.locator("#address-city").fill("Hulhumale");
  await page.getByRole("button", { name: "Save address" }).click();
  await page.locator(".address-card", { hasText: "Test House" }).waitFor();
  await page.screenshot({ path: "/tmp/bondibai-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Close" }).click();
  await page.screenshot({ path: "/tmp/bondibai-mobile.png", fullPage: true });
  assert.equal(await page.locator(".mobile-nav").isVisible(), true);

  for (const name of [offlineName, onlineName]) {
    await page.locator(".record-card", { hasText: name }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.locator(".record-card", { hasText: name }).waitFor({ state: "detached" });
  }
  assert.deepEqual(errors, []);
  console.log("PASS desktop login/create/address/delete workflow");
  console.log("PASS offline create remains visible and syncs after reconnect");
  console.log("PASS responsive mobile navigation");
  console.log("Screenshots: /tmp/bondibai-desktop.png, /tmp/bondibai-mobile.png");
} finally {
  await browser.close();
}
