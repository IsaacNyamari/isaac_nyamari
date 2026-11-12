import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import sharp from "sharp";
import { expect, type Page, test } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

const STATE_FILE = path.join(os.tmpdir(), "isaac-e2e-admin-state.json");

/** Real sign-in through the login form (sign-in is rate limited to 5 per minute, so it runs once). */
async function signInThroughForm(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
}

/** Reuses the session cookie from the single real sign-in. */
async function login(page: Page) {
  const { cookies } = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  await page.context().addCookies(cookies);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
}

test.describe.serial("admin dashboard", () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    await signInThroughForm(await ctx.newPage());
    await ctx.storageState({ path: STATE_FILE });
    await ctx.close();
  });

  test("rejects wrong credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(E2E_ADMIN.email);
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /Incorrect email or password/ })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("every dashboard page renders", async ({ page }) => {
    await login(page);
    const paths = [
      "/admin", "/admin/posts", "/admin/posts/new", "/admin/taxonomy", "/admin/media", "/admin/projects", "/admin/projects/new",
      "/admin/services", "/admin/services/new", "/admin/pages", "/admin/pages/new", "/admin/pages/homepage", "/admin/skills",
      "/admin/navigation", "/admin/settings", "/admin/inquiries", "/admin/account",
    ];
    for (const path of paths) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator("h1").first(), path).toBeVisible();
    }
    // Edit pages for seeded records
    await page.goto("/admin/services");
    await page.getByRole("link", { name: "Edit" }).first().click();
    await expect(page.locator("#title")).not.toHaveValue("");
    await page.goto("/admin/pages");
    await page.getByRole("link", { name: "About" }).first().click();
    await expect(page.getByText("About page sections")).toBeVisible();
  });

  test("overview shows real counts", async ({ page }) => {
    await login(page);
    const services = page.getByRole("link", { name: /Published services/ });
    await expect(services).toContainText("5");
  });

  test("create and publish a post, then see it publicly", async ({ page, context }) => {
    await login(page);
    await page.goto("/admin/posts/new");
    await page.locator("#title").fill("Deploying a multi-tenant SaaS");
    await expect(page.locator("#slug")).toHaveValue("deploying-a-multi-tenant-saas");
    await page.locator("#excerpt").fill("How tenancy, billing and backups fit together.");
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type("Tenant isolation starts in the database schema.");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/posts\/[a-z0-9]+$/);

    // Draft is not public
    const anon = await context.browser()!.newContext();
    const anonPage = await anon.newPage();
    expect((await anonPage.goto("/insights/deploying-a-multi-tenant-saas"))?.status()).toBe(404);

    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();

    const res = await anonPage.goto("/insights/deploying-a-multi-tenant-saas");
    expect(res?.status()).toBe(200);
    await expect(anonPage.locator("h1")).toHaveText("Deploying a multi-tenant SaaS");
    await expect(anonPage.locator(".prose-rt")).toContainText("Tenant isolation starts in the database schema.");
    await anonPage.goto("/insights");
    await expect(anonPage.getByText("Deploying a multi-tenant SaaS").first()).toBeVisible();
    await anon.close();
  });

  test("upload media and use it as a project cover", async ({ page, context }) => {
    await login(page);
    const file = path.join(os.tmpdir(), "e2e-cover.png");
    writeFileSync(file, await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#1e2a4a" } }).png().toBuffer());

    await page.goto("/admin/media");
    await page.locator('input[type="file"][multiple]').first().setInputFiles(file);
    await expect(page.getByText("1 file uploaded")).toBeVisible();

    await page.goto("/admin/projects/new");
    await page.locator("#title").fill("School management platform");
    await page.locator("#summary").fill("Admissions, fees and reports for a school.");
    await page.locator("section", { has: page.getByRole("heading", { name: "Cover image" }) }).getByRole("button", { name: "Choose image" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /e2e-cover/ }).first().click();
    await page.getByRole("button", { name: "Use selected" }).click();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/projects\/[a-z0-9]+$/);

    const anon = await context.browser()!.newContext();
    const p = await anon.newPage();
    await p.goto("/projects");
    await expect(p.getByRole("heading", { name: "School management platform" })).toBeVisible();
    const img = p.locator('a[href="/projects/school-management-platform"] img');
    await expect(img).toHaveAttribute("src", /\/media\//);
    await anon.close();
  });

  test("contact inquiries appear in the dashboard and can be annotated", async ({ page }) => {
    await login(page);
    await page.goto("/admin/inquiries");
    await page.getByRole("link", { name: /E2E Visitor/ }).click();
    await expect(page.getByText(/water billing platform/)).toBeVisible();
    await page.getByLabel("New note").fill("Called back, sending a quote.");
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText("Called back, sending a quote.")).toBeVisible();
  });

  test("homepage builder reorders sections after publishing", async ({ page, context }) => {
    await login(page);
    await page.goto("/admin/pages/homepage");
    await page.getByRole("button", { name: "Move Contact call-to-action up" }).click();
    await page.getByRole("button", { name: "Publish homepage" }).click();
    await expect(page.getByText("Homepage published")).toBeVisible();

    const anon = await context.browser()!.newContext();
    const p = await anon.newPage();
    await p.goto("/");
    const headings = await p.locator("main h2").allTextContents();
    const contactIdx = headings.findIndex((h) => /Let's build something that works/.test(h));
    const insightsIdx = headings.findIndex((h) => /Notes from the build/.test(h));
    expect(contactIdx).toBeGreaterThan(-1);
    // Insights has no posts? It has one now (published above), so it renders after contact.
    if (insightsIdx > -1) expect(contactIdx).toBeLessThan(insightsIdx);
    await anon.close();
  });

  test("contact settings drive the public contact links", async ({ page, context }) => {
    await login(page);
    await page.goto("/admin/settings?tab=contact");
    await page.locator("#c-email").fill("hello@example.com");
    await page.locator("#c-phone").fill("+254 700 000 000");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();

    const anon = await context.browser()!.newContext();
    const p = await anon.newPage();
    await p.goto("/contact");
    await expect(p.locator('main a[href="mailto:hello@example.com"]')).toBeVisible();
    await expect(p.locator('main a[href="tel:+254700000000"]')).toBeVisible();
    await expect(p.locator('main a[href*="wa.me"]')).toHaveCount(0);
    await anon.close();
  });
});
