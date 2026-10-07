import { expect, test } from "@playwright/test";

// Full customer + admin journey on the merch sweatpants (multi-stock, so the test is repeatable).
test.setTimeout(180_000);

test("customer checks out, admin quotes, customer uploads proof, admin approves and ships", async ({ page, browser }) => {
  await page.goto("/id/p/onlypants-gray-sweatpants");
  const add = page.getByRole("button", { name: /Tambah ke keranjang/ });
  await expect(add).toBeDisabled(); // size required
  await page.locator("label:has(input[name=size]:not([disabled]))").first().click();
  await add.click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.getByRole("link", { name: "Checkout" }).click();

  // Validation
  await page.getByRole("button", { name: /Buat pesanan/ }).click();
  await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();

  await page.fill("#f-customerName", "E2E Buyer");
  await page.fill("#f-email", "e2e@example.com");
  await page.fill("#f-phone", "0812 0000 1111");
  await page.fill("#f-line", "Jl. Uji Coba No. 1");
  await page.fill("#f-district", "Jagakarsa");
  await page.fill("#f-city", "Jakarta Selatan");
  await page.fill("#f-province", "DKI Jakarta");
  await page.fill("#f-postalCode", "12620");
  await page.check("input[name=terms]");
  await page.getByRole("button", { name: /Buat pesanan/ }).click();
  await page.waitForURL(/\/id\/order\/OP-\d{6}-[A-Z0-9]{4}\?k=/);
  await expect(page.getByText("Menunggu ongkir").first()).toBeVisible();
  const orderUrl = page.url();
  const code = orderUrl.match(/order\/([^?]+)/)![1];

  // Admin sets shipping
  const admin = await (await browser.newContext()).newPage();
  admin.on("dialog", (d) => d.accept());
  await admin.goto("/admin/login");
  await admin.fill("#email", "owner@onlypants.test");
  await admin.fill("#password", "onlypants123");
  await admin.click("button[type=submit]");
  await admin.waitForURL("**/admin");
  await admin.goto(`/admin/orders?q=${code}&status=all`);
  await admin.getByRole("link", { name: code }).click();
  await admin.getByLabel("Ongkir (Rp)").fill("15000");
  await admin.getByLabel("Ongkir (Rp)").press("Enter");
  await expect(admin.getByText("Menunggu bayar").first()).toBeVisible();

  // Customer pays
  await page.reload();
  await expect(page.getByText("Bayar dengan QRIS", { exact: false })).toBeVisible();
  await page.setInputFiles("input[type=file]", "public/images/brand/mascot.jpg");
  await page.getByRole("button", { name: "Kirim bukti bayar" }).click();
  await expect(page.getByText("Bukti bayar terkirim").first()).toBeVisible();

  // Admin approves and ships
  await admin.reload();
  await admin.getByRole("button", { name: /Setujui/ }).click();
  await expect(admin.getByRole("button", { name: /Mulai kemas/ })).toBeVisible();
  await admin.getByLabel("Nomor resi").fill("E2E123456");
  await admin.getByLabel("Nomor resi").press("Enter");
  await expect(admin.getByText("Dikirim").first()).toBeVisible();

  await page.reload();
  await expect(page.getByText("E2E123456")).toBeVisible();
});

test("order link with a wrong key shows 404 content", async ({ page }) => {
  await page.goto("/id/order/OP-000000-AAAA?k=wrong");
  await expect(page.getByText("404")).toBeVisible();
});

test("no horizontal scroll on key pages", async ({ page }) => {
  for (const path of ["/id", "/id/shop", "/id/p/brown-graphic-cargo", "/id/checkout", "/id/track", "/id/contact"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("mobile menu covers the full screen", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/id/shop");
  await page.click("button[aria-controls=mobile-menu]");
  const box = await page.locator("#mobile-menu nav").boundingBox();
  expect(box!.height).toBeGreaterThan(page.viewportSize()!.height - 2);
});

test("back link from a product returns to the same scroll position", async ({ page }) => {
  await page.goto("/id/shop");
  const card = page.locator('main a[href*="/p/"]:visible').nth(5);
  await card.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  expect(before).toBeGreaterThan(0);
  await card.click();
  await page.waitForURL(/\/p\//);
  await page.locator('main a[href="/id/shop"]').first().click();
  await page.waitForURL(/\/id\/shop$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(before);
});
