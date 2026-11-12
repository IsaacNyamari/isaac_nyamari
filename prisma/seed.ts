/**
 * Idempotent seed: creates initial content only where it does not exist yet.
 * It never overwrites records an administrator has edited, and never creates an admin account
 * (use `npm run admin:create`).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { extractText, readingMinutes } from "../src/lib/rich-text/model";
import { DEFAULT_HOME_SECTIONS } from "../src/lib/home-defaults";
import { ABOUT, CATEGORIES, PRIVACY, PROJECT_CATEGORIES, SERVICES, SKILLS } from "./seed-data";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const now = new Date();

  // Settings (singleton). Contact values come only from SEED_CONTACT_* — nothing is invented.
  const existingSettings = await db.siteSettings.findUnique({ where: { id: "site" } });
  if (!existingSettings) {
    await db.siteSettings.create({
      data: {
        id: "site",
        siteName: "Isaac Nyamari",
        tagline: "Software Engineer | Full-Stack Developer | Systems Builder | Technology Entrepreneur",
        siteDescription:
          "Isaac Nyamari is a software engineer and technology entrepreneur in Kenya building web applications, business management systems, SaaS, APIs and infrastructure.",
        siteUrl: process.env.SITE_URL ?? "",
        seoTitle: "Isaac Nyamari — Software Engineer & Systems Builder",
        seoDescription:
          "Software engineer and technology entrepreneur in Kenya building web applications, business systems, SaaS, APIs and infrastructure.",
        email: process.env.SEED_CONTACT_EMAIL ?? "",
        phone: process.env.SEED_CONTACT_PHONE ?? "",
        whatsapp: process.env.SEED_CONTACT_WHATSAPP ?? "",
        locationText: "Kenya",
        contactCtaTitle: "Let's build something that works.",
        contactCtaText: "Tell me about the system you need, the problem you're solving or the project you're planning.",
        footerDescription: "Software engineer and technology entrepreneur building web applications, business systems and infrastructure from Kenya.",
        copyrightText: "Isaac Nyamari. All rights reserved.",
        footerCtaText: "Have a project in mind? Let's talk.",
      },
    });
    console.log("✓ settings");
  }

  for (const [position, s] of SERVICES.entries()) {
    const exists = await db.service.findUnique({ where: { slug: s.slug } });
    if (exists) continue;
    await db.service.create({
      data: {
        slug: s.slug,
        title: s.title,
        icon: s.icon,
        summary: s.summary,
        deliverables: s.deliverables,
        content: s.content as object,
        position,
        featured: true,
        status: "PUBLISHED",
        publishedAt: now,
        ctaLabel: "Discuss your project",
        seoDescription: s.summary.slice(0, 160),
      },
    });
    console.log(`✓ service ${s.slug}`);
  }

  for (const c of CATEGORIES) {
    await db.category.upsert({ where: { slug: c.slug }, create: c, update: {} });
  }
  for (const [position, c] of PROJECT_CATEGORIES.entries()) {
    await db.projectCategory.upsert({ where: { slug: c.slug }, create: { ...c, position }, update: {} });
  }

  if ((await db.skill.count()) === 0) {
    await db.skill.createMany({ data: SKILLS.map((s, position) => ({ ...s, position })) });
    console.log("✓ skills");
  }

  for (const [slug, page, template] of [
    ["about", ABOUT, "ABOUT"],
    ["privacy", PRIVACY, "LEGAL"],
  ] as const) {
    if (await db.page.findUnique({ where: { slug } })) continue;
    await db.page.create({
      data: {
        slug,
        title: page.title,
        excerpt: page.excerpt,
        content: page.content as object,
        template,
        data: ("data" in page ? page.data : {}) as object,
        system: true,
        status: "PUBLISHED",
        publishedAt: now,
        seoDescription: page.excerpt,
      },
    });
    console.log(`✓ page ${slug}`);
  }

  if ((await db.homeSection.count()) === 0) {
    for (const state of ["LIVE", "DRAFT"] as const) {
      await db.homeSection.createMany({
        data: DEFAULT_HOME_SECTIONS.map((s, position) => ({ ...s, state, position, config: s.config as object })),
      });
    }
    console.log("✓ homepage sections");
  }

  for (const key of ["header", "footer"] as const) {
    if (await db.navigationMenu.findUnique({ where: { key } })) continue;
    const items =
      key === "header"
        ? [["Home", "/"], ["About", "/about"], ["Services", "/services"], ["Projects", "/projects"], ["Insights", "/insights"], ["Contact", "/contact"]]
        : [["About", "/about"], ["Services", "/services"], ["Projects", "/projects"], ["Insights", "/insights"], ["Contact", "/contact"], ["Privacy", "/privacy"]];
    await db.navigationMenu.create({
      data: {
        key,
        name: key === "header" ? "Header" : "Footer",
        items: { create: items.map(([label, href], position) => ({ label, href, position })) },
      },
    });
    console.log(`✓ navigation ${key}`);
  }

  // Keep derived search text in sync for any posts created outside the dashboard.
  const posts = await db.post.findMany({ where: { contentText: "" }, select: { id: true, content: true } });
  for (const p of posts) {
    const text = extractText(p.content as never);
    await db.post.update({ where: { id: p.id }, data: { contentText: text, readingMinutes: readingMinutes(text) } });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
