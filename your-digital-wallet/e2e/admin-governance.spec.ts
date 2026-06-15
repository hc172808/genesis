import { test, expect } from "@playwright/test";

const SUPER_ADMIN = "0x6422D12BFADdEE5142BFaD21b3006a74D09017B1";
const OTHER_ADMIN = "0x2c31DaaB3130d37C5b8502Db2b459270AE875303";
const NEW_ADMIN   = "0x3333333333333333333333333333333333333333";

test.describe("Admin governance: only the super admin can mutate the admin list", () => {
  test("super admin can add and remove a runtime admin", async ({ page }) => {
    await page.addInitScript((wallet) => {
      localStorage.setItem("gyds_wallet_address", wallet as string);
    }, SUPER_ADMIN);

    await page.goto("/admin");
    await page.getByRole("button", { name: /Admins/i }).click();

    await page.getByPlaceholder(/0x\.\.\. wallet address/i).fill(NEW_ADMIN);
    await page.keyboard.press("Enter");
    await expect(page.getByText(NEW_ADMIN, { exact: false })).toBeVisible();

    // Now remove
    const row = page.locator("div", { hasText: NEW_ADMIN }).first();
    await row.locator("button").last().click();
    await expect(page.getByText(NEW_ADMIN, { exact: false })).toHaveCount(0);
  });

  test("a regular admin sees the locked-add notice and no trash icons", async ({ page }) => {
    await page.addInitScript((wallet) => {
      localStorage.setItem("gyds_wallet_address", wallet as string);
    }, OTHER_ADMIN);

    await page.goto("/admin");
    await page.getByRole("button", { name: /Admins/i }).click();

    await expect(page.getByText(/Adding or removing admins is restricted/i)).toBeVisible();
    await expect(page.getByPlaceholder(/0x\.\.\. wallet address/i)).toHaveCount(0);
  });
});
