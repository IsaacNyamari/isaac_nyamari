import { expect, test } from "@playwright/test";

test.describe("mobile layout", () => {
  test("navigation collapses into an accessible menu", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await expect(toggle).toBeVisible();
    await toggle.click();
    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Services" }).click();
    await expect(page).toHaveURL(/\/services$/);
    await expect(page.locator("#mobile-menu")).toHaveCount(0);
  });

  test("no horizontal overflow on key pages", async ({ page }) => {
    for (const path of ["/", "/services", "/projects", "/insights", "/contact", "/about"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(1);
    }
  });
});
