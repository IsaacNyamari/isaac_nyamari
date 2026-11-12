import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { saveNavigationAction } from "@/app/admin/(panel)/navigation/actions";
import { saveSettingsAction } from "@/app/admin/(panel)/settings/actions";
import { getDraftHomeSections, getLiveHomeSections } from "@/server/queries/home";
import { getPublishedPage } from "@/server/queries/pages";
import { getFeaturedProjects, getPublishedProject, listPublishedProjects } from "@/server/queries/projects";
import { getPublishedService, listPublishedServices } from "@/server/queries/services";
import { getNavigation, getSettings } from "@/server/queries/settings";
import { deletePage, savePage } from "@/server/services/pages";
import { reorderProjects, saveProject, unpublishProject } from "@/server/services/projects";
import { deleteService, reorderServices, saveService } from "@/server/services/services";
import { getEditableHomeSections, publishHome, saveHomeDraft } from "@/server/services/site";
import { createAdmin, doc, resetDb, signIn } from "../helpers";

let adminId: string;
beforeEach(async () => {
  await resetDb();
  adminId = await createAdmin();
});

const project = (o: Record<string, unknown> = {}) => ({ title: "Water billing platform", slug: "water-billing", summary: "Billing for a utility.", content: doc("Case study"), ...o });
const service = (o: Record<string, unknown> = {}) => ({ title: "Custom Software Development", slug: "custom-software-development", summary: "Apps", content: doc("Details"), ...o });

describe("projects", () => {
  it("publishes, orders, features and unpublishes on the public site", async () => {
    const a = await saveProject(adminId, { intent: "publish", data: project() });
    const b = await saveProject(adminId, { intent: "publish", data: project({ title: "ISP manager", slug: "isp-manager", featured: true }) });
    await saveProject(adminId, { intent: "draft", data: project({ title: "Secret", slug: "secret" }) });

    expect((await listPublishedProjects()).map((p) => p.slug)).toEqual(["water-billing", "isp-manager"]);
    await reorderProjects([b.id, a.id]);
    expect((await listPublishedProjects()).map((p) => p.slug)).toEqual(["isp-manager", "water-billing"]);
    expect((await getFeaturedProjects(1, []))[0].slug).toBe("isp-manager");
    expect(await getPublishedProject("secret")).toBeNull();

    await unpublishProject(adminId, b.id);
    expect(await getPublishedProject("isp-manager")).toBeNull();
  });

  it("filters by project category", async () => {
    const cat = await db.projectCategory.create({ data: { name: "Business Systems", slug: "business-systems" } });
    await saveProject(adminId, { intent: "publish", data: project({ categoryIds: [cat.id] }) });
    await saveProject(adminId, { intent: "publish", data: project({ title: "Other", slug: "other" }) });
    expect((await listPublishedProjects("business-systems")).map((p) => p.slug)).toEqual(["water-billing"]);
  });
});

describe("services", () => {
  it("updates, reorders and hides services publicly", async () => {
    const a = await saveService(adminId, { intent: "publish", data: service() });
    const b = await saveService(adminId, { intent: "publish", data: service({ title: "Website Design", slug: "website-design" }) });
    await reorderServices([b.id, a.id]);
    expect((await listPublishedServices()).map((s) => s.slug)).toEqual(["website-design", "custom-software-development"]);

    await saveService(adminId, { id: a.id, version: a.version, intent: "publish", data: service({ title: "Custom Software (updated)" }) });
    expect((await getPublishedService("custom-software-development"))?.title).toBe("Custom Software (updated)");

    await deleteService(b.id);
    expect(await getPublishedService("website-design")).toBeNull();
  });

  it("falls back to a safe icon when an unknown icon is submitted", async () => {
    await saveService(adminId, { intent: "publish", data: service({ icon: "<script>" }) });
    expect((await getPublishedService("custom-software-development"))?.icon).toBe("code");
  });
});

describe("homepage builder", () => {
  it("keeps draft changes private until published, then applies order and visibility", async () => {
    const sections = await getEditableHomeSections();
    expect(sections[0].type).toBe("HERO");
    await publishHome();

    const reordered = [...sections].reverse().map((s) => ({ ...s, visible: s.type !== "SKILLS" }));
    reordered.find((s) => s.type === "HERO")!.config = { ...reordered.find((s) => s.type === "HERO")!.config, title: "New hero title" };
    await saveHomeDraft(reordered);

    let live = await getLiveHomeSections();
    expect(live[0].type).toBe("HERO");
    expect(live.find((s) => s.type === "HERO")?.config.title).not.toBe("New hero title");
    expect((await getDraftHomeSections())[0].type).toBe("CONTACT_CTA");

    await publishHome();
    live = await getLiveHomeSections();
    expect(live[0].type).toBe("CONTACT_CTA");
    expect(live.find((s) => s.type === "SKILLS")?.visible).toBe(false);
    expect(live.find((s) => s.type === "HERO")?.config.title).toBe("New hero title");
  });

  it("rejects unsafe CTA links in section configuration", async () => {
    const sections = await getEditableHomeSections();
    const hero = sections.find((s) => s.type === "HERO")!;
    hero.config = { ...hero.config, primaryCta: { label: "x", href: "javascript:alert(1)" } };
    await expect(saveHomeDraft(sections)).rejects.toThrow();
  });
});

describe("pages", () => {
  it("protects system pages and reserved addresses", async () => {
    const about = await db.page.create({ data: { title: "About", slug: "about", content: doc("Bio"), system: true, status: "PUBLISHED", publishedAt: new Date() } });
    await expect(deletePage(about.id)).rejects.toThrow(/cannot be deleted/);
    await expect(savePage(adminId, { id: about.id, version: about.version, intent: "publish", data: { title: "About", slug: "about-me", content: doc("Bio") } })).rejects.toThrow(/cannot be changed/);
    await expect(savePage(adminId, { intent: "publish", data: { title: "Admin", slug: "admin", content: doc("x") } })).rejects.toThrow(/reserved/);
  });

  it("publishes custom pages and hides unpublished ones", async () => {
    const p = await savePage(adminId, { intent: "draft", data: { title: "Terms", slug: "terms", content: doc("Terms") } });
    expect(await getPublishedPage("terms")).toBeNull();
    await savePage(adminId, { id: p.id, version: p.version, intent: "publish", data: { title: "Terms", slug: "terms", content: doc("Terms") } });
    expect((await getPublishedPage("terms"))?.title).toBe("Terms");
  });
});

describe("navigation and settings", () => {
  it("refuses navigation links to admin or API routes and unsafe protocols", async () => {
    await signIn();
    for (const href of ["/admin", "/admin/posts", "/api/auth/sign-in", "javascript:alert(1)", "//evil.example"]) {
      const r = await saveNavigationAction("header", { items: [{ label: "x", href }] });
      expect(r.ok, href).toBe(false);
    }
    const ok = await saveNavigationAction("header", { items: [{ label: "Blog", href: "/insights" }, { label: "GitHub", href: "https://github.com/example", newTab: true }] });
    expect(ok.ok).toBe(true);
    const nav = await getNavigation("header");
    expect(nav.map((n) => n.href)).toEqual(["/insights", "https://github.com/example"]);
    expect(nav[1].external).toBe(true);
  });

  it("stores contact values exactly as entered and validates formats", async () => {
    await signIn();
    const base = {
      general: { siteName: "Isaac Nyamari" },
      contact: { email: "hello@example.com", phone: "+254 700 000 000", whatsapp: "+254 700 000 000", socials: { linkedin: "https://www.linkedin.com/in/example" } },
      branding: {}, seo: {}, footer: {},
    };
    expect((await saveSettingsAction(base)).ok).toBe(true);
    const s = await getSettings();
    expect(s.phone).toBe("+254 700 000 000");
    expect(s.socials.linkedin).toBe("https://www.linkedin.com/in/example");

    const bad = await saveSettingsAction({ ...base, contact: { ...base.contact, email: "not-an-email", socials: { linkedin: "javascript:alert(1)" } } });
    expect(bad.ok).toBe(false);
  });
});
