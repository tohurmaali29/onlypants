import { expect, type Browser, type Page } from "@playwright/test";

export const PHOTO = "public/images/brand/mascot.jpg";

export async function staffLogin(browser: Browser, email: string) {
  const page = await (await browser.newContext()).newPage();
  page.on("dialog", (d) => d.accept());
  await page.goto("/id/login?next=/admin");
  await page.locator("#a-email").fill(email);
  await page.locator("#a-password").fill("onlypants123");
  await page.getByRole("button", { name: "Masuk", exact: true }).last().click();
  // Match the dashboard path itself, not /id/login?next=/admin.
  await page.waitForURL((url) => url.pathname === "/admin");
  return page;
}

export async function addFirstAvailableToCart(page: Page, slug = "onlypants-gray-sweatpants") {
  await page.goto(`/id/p/${slug}`);
  await page.locator("label:has(input[name=size]:not([disabled]))").first().click();
  await page.getByRole("button", { name: /Tambah ke keranjang/ }).click();
  await expect(page.locator("dialog[open]")).toBeVisible();
}

/** Upload proof photos in the admin fulfillment panel and wait until the thumbnail shows. */
export async function addProofPhoto(admin: Page) {
  const before = await admin.locator('img[alt^="Foto "]').count();
  await admin.locator('input[type=file][accept="image/*"]').setInputFiles(PHOTO);
  await expect(admin.locator('img[alt^="Foto "]')).toHaveCount(before + 1, { timeout: 30_000 });
}
