import { expect, test } from "@playwright/test";

test.describe("public website", () => {
  test("required routes render with their headings", async ({ page }) => {
    const routes: [string, RegExp][] = [
      ["/", /Hi, I'm Isaac Nyamari/],
      ["/about", /I build software that solves real-world problems/],
      ["/services", /Software, systems and infrastructure/],
      ["/services/custom-software-development", /Custom Software Development/],
      ["/projects", /Work that runs in the real world/],
      ["/insights", /Notes on building software/],
      ["/contact", /.+/],
      ["/privacy", /Privacy Policy/],
    ];
    for (const [path, heading] of routes) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator("h1").first(), path).toHaveText(heading);
    }
  });

  test("homepage shows the five seeded services and no fabricated stats", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Custom Software Development/ }).first()).toBeVisible();
    for (const name of ["Website Design and Development", "Business Management Systems and SaaS", "Systems Architecture and Infrastructure", "API Integration and Technology Consulting"]) {
      await expect(page.getByText(name).first()).toBeAttached();
    }
    await expect(page.locator("main")).not.toContainText(/years of experience|clients served|\d+\+ projects/i);
  });

  test("unknown and unpublished content returns 404", async ({ page }) => {
    expect((await page.goto("/insights/does-not-exist"))?.status()).toBe(404);
    expect((await page.goto("/services/not-a-service"))?.status()).toBe(404);
    expect((await page.goto("/totally-unknown-page"))?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /doesn't exist/ })).toBeVisible();
  });

  test("SEO metadata, robots and sitemap", async ({ page, request }) => {
    await page.goto("/services/custom-software-development");
    await expect(page).toHaveTitle(/Custom Software Development/);
    expect(await page.locator('meta[property="og:title"]').getAttribute("content")).toBeTruthy();
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toContain("/services/custom-software-development");
    expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);

    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/services/custom-software-development");
    expect(sitemap).not.toContain("/admin");
  });

  test("service CTA preselects the service on the contact form", async ({ page }) => {
    await page.goto("/services/website-design-and-development");
    await page.getByRole("link", { name: "Discuss your project" }).first().click();
    await expect(page).toHaveURL(/\/contact\?service=website-design-and-development/);
    await expect(page.locator("#f-service")).toHaveValue("website-design-and-development");
  });

  test("contact form validates and then submits an inquiry", async ({ page }) => {
    await page.goto("/contact");
    await page.waitForTimeout(2800); // spam timing token requires a human-like fill time
    await page.getByRole("button", { name: "Send inquiry" }).click();
    await expect(page.getByText("Please correct the highlighted fields.")).toBeVisible();
    await expect(page.getByText("Please enter your name")).toBeVisible();

    await page.getByLabel(/Your name/).fill("E2E Visitor");
    await page.getByLabel(/Email address/).fill("visitor@example.com");
    await page.getByLabel(/Project description/).fill("We would like a water billing platform for our utility company.");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Send inquiry" }).click();
    await expect(page.getByText(/your message has been received/i)).toBeVisible();
  });

  test("admin area redirects anonymous visitors to the login page", async ({ page }) => {
    await page.goto("/admin/posts");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { name: "Dashboard sign in" })).toBeVisible();
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots).toContain("noindex");
  });

  test("preview endpoint refuses anonymous visitors", async ({ request }) => {
    const res = await request.get("/api/preview?path=/", { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });

  test("cron endpoint requires the secret", async ({ request }) => {
    expect((await request.post("/api/cron/publish")).status()).toBe(401);
    expect((await request.post("/api/cron/publish", { headers: { Authorization: "Bearer wrong-secret-wrong-secret" } })).status()).toBe(401);
  });
});
