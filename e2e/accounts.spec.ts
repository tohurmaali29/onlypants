import { expect, test } from "@playwright/test";
import { addFirstAvailableToCart, staffLogin } from "./helpers";

test.setTimeout(300_000);

test("customer signs up, saves an address, checks out prefilled and sees the order", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  // Sign up from the header button
  await page.goto("/id/shop");
  await page.locator("header").getByRole("link", { name: /Masuk|Akun/ }).first().click();
  await page.getByRole("tab", { name: "Daftar" }).click();
  await page.locator("#a-name").fill("Rina Pembeli");
  await page.locator("#a-email").fill(email);
  await page.locator("#a-phone").fill("0813 1111 2222");
  await page.locator("#a-password").fill("rahasia123");
  await page.getByRole("button", { name: "Daftar", exact: true }).last().click();
  await page.waitForURL("**/id/account");
  await expect(page.getByRole("heading", { name: /Halo, Rina/i })).toBeVisible();

  // Save an address
  await page.getByRole("button", { name: "Tambah alamat" }).click();
  await page.locator("#addr-label").fill("Rumah");
  await page.locator("#addr-recipient").fill("Rina Pembeli");
  await page.locator("#addr-phone").fill("081311112222");
  await page.locator("#addr-postalCode").fill("12730");
  await page.locator("#addr-line").fill("Jl. Kemang Raya No. 5");
  await page.locator("#addr-district").fill("Mampang Prapatan");
  await page.locator("#addr-city").fill("Jakarta Selatan");
  await page.locator("#addr-province").fill("DKI Jakarta");
  await page.locator("form:has(#addr-line)").getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByText("Jl. Kemang Raya No. 5")).toBeVisible();
  await expect(page.getByText("Utama")).toBeVisible();

  // Checkout is prefilled from the account
  await addFirstAvailableToCart(page);
  await page.getByRole("link", { name: "Checkout" }).click();
  await expect(page.locator("#f-email")).toHaveValue(email);
  await expect(page.locator("#f-line")).toHaveValue("Jl. Kemang Raya No. 5");
  await expect(page.locator("#f-customerName")).toHaveValue("Rina Pembeli");
  await page.check("input[name=terms]");
  await page.getByRole("button", { name: /Buat pesanan/ }).click();
  await page.waitForURL(/\/id\/order\/OP-/);
  const code = page.url().match(/order\/([^?]+)/)![1];

  // The order shows up in the account history
  await page.goto("/id/account");
  await expect(page.getByText(code)).toBeVisible();

  // Sign out, then a wrong password is rejected and the right one works
  await page.getByRole("button", { name: "Keluar" }).click();
  await page.waitForURL((url) => url.pathname === "/id"); // let the sign-out action finish clearing the session
  await page.goto("/id/account");
  await page.waitForURL((url) => url.pathname === "/id/login"); // signed out: account page sends us to login
  await page.locator("#a-email").fill(email);
  await page.locator("#a-password").fill("salah-password");
  await page.getByRole("button", { name: "Masuk", exact: true }).last().click();
  await expect(page.getByText("Email atau password salah.")).toBeVisible();
  await page.locator("#a-password").fill("rahasia123");
  await page.getByRole("button", { name: "Masuk", exact: true }).last().click();
  await page.waitForURL((url) => url.pathname === "/id/account");

  // A customer account can't open the dashboard
  await page.goto("/admin");
  await expect(page.getByText(/bukan akun admin/)).toBeVisible();
});

test("staff sign in on the shared login page and land on the dashboard", async ({ browser }) => {
  const admin = await staffLogin(browser, "staff@onlypants.test");
  await expect(admin.getByRole("heading", { name: /Halo, Staff/ })).toBeVisible();
  // /admin/login keeps working as a shortcut
  await admin.goto("/admin/login");
  await admin.waitForURL((url) => url.pathname === "/admin");
});
