import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { request } from "./setup";

const TABLES = [
  "inquiry_notes", "contact_inquiries", "post_revisions", "post_relations", "post_tags", "posts", "tags", "categories",
  "project_images", "_ProjectToProjectCategory", "projects", "project_categories", "services", "page_revisions", "pages",
  "home_sections", "skills", "navigation_items", "navigation_menus", "site_settings", "redirects", "rate_limit_buckets",
  "media_assets", "sessions", "accounts", "verifications", "auth_rate_limits", "admin_users",
];

export async function resetDb() {
  await db.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
  request.cookie = "";
  request.draft = false;
}

export const ADMIN = { email: "admin@test.local", password: "correct-horse-battery-staple" };

export async function createAdmin() {
  const id = randomUUID();
  await db.adminUser.create({
    data: {
      id, name: "Test Admin", email: ADMIN.email, emailVerified: true, role: "ADMIN",
      accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(ADMIN.password) } },
    },
  });
  return id;
}

/** Signs in through Better Auth and attaches the session cookie to the simulated request. */
export async function signIn() {
  const res = await auth.api.signInEmail({ body: { email: ADMIN.email, password: ADMIN.password }, returnHeaders: true });
  const setCookie = res.headers.get("set-cookie") ?? "";
  request.cookie = setCookie
    .split(/,(?=\s*[\w.-]+=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
  if (!request.cookie) throw new Error("No session cookie returned");
}

export function signOut() {
  request.cookie = "";
}

export function doc(text: string) {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

export function postData(overrides: Record<string, unknown> = {}) {
  return {
    title: "Building reliable billing systems",
    slug: "building-reliable-billing-systems",
    excerpt: "Lessons from the field.",
    content: doc("Body text for the article about billing systems and reliability."),
    tagIds: [],
    relatedIds: [],
    ...overrides,
  };
}

export async function pngBuffer(width = 900, height = 600) {
  return sharp({ create: { width, height, channels: 3, background: { r: 30, g: 42, b: 74 } } }).png().toBuffer();
}
