import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError, UserError } from "@/lib/errors";
import { RESERVED_PAGE_SLUGS } from "@/lib/slug";
import { aboutDataSchema, pageInputSchema, type PageInput } from "@/lib/validation";
import { recordRedirect, REVISIONS_TO_KEEP, toJson, type Tx } from "./workflow";

export type SavePageArgs = { id?: string | null; version?: number; intent: "draft" | "publish"; data: unknown };

async function addRevision(tx: Tx, pageId: string, input: PageInput, editorId: string, note: string) {
  await tx.pageRevision.create({ data: { pageId, title: input.title, snapshot: toJson(input), editorId, note } });
  const stale = await tx.pageRevision.findMany({ where: { pageId }, orderBy: { createdAt: "desc" }, skip: REVISIONS_TO_KEEP, select: { id: true } });
  if (stale.length) await tx.pageRevision.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
}

export async function savePage(adminId: string, args: SavePageArgs) {
  const input = pageInputSchema.parse(args.data);

  return db.$transaction(async (tx) => {
    const existing = args.id ? await tx.page.findUnique({ where: { id: args.id } }) : null;
    if (args.id && !existing) throw new NotFoundError("Page");

    if (existing?.system) {
      if (input.slug !== existing.slug) throw new UserError("The address of a system page cannot be changed.", { slug: "Locked" });
    } else if (RESERVED_PAGE_SLUGS.has(input.slug)) {
      throw new UserError(`"/${input.slug}" is reserved by the website.`, { slug: "Reserved" });
    }
    const data = existing?.template === "ABOUT" ? aboutDataSchema.parse(input.data) : input.data;
    const normalized: PageInput = { ...input, data };
    const cols = {
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      content: toJson(input.content),
      data: toJson(data),
      featuredImageId: input.featuredImageId,
      showInNav: existing?.system ? false : input.showInNav,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
    };

    if (!existing) {
      const page = await tx.page.create({
        data: {
          ...cols,
          status: args.intent === "publish" ? "PUBLISHED" : "DRAFT",
          publishedAt: args.intent === "publish" ? new Date() : null,
          lastEditedById: adminId,
        },
      });
      await addRevision(tx, page.id, normalized, adminId, "Created");
      return { id: page.id, slug: page.slug, status: page.status, version: page.version };
    }

    if (args.version !== undefined && args.version !== existing.version) throw new ConflictError();
    const nextVersion = existing.version + 1;

    if (existing.status === "PUBLISHED" && args.intent === "draft") {
      const res = await tx.page.updateMany({
        where: { id: existing.id, version: existing.version },
        data: { pendingChanges: toJson(normalized), version: nextVersion, lastEditedById: adminId },
      });
      if (res.count !== 1) throw new ConflictError();
      await addRevision(tx, existing.id, normalized, adminId, "Saved unpublished changes");
      return { id: existing.id, slug: existing.slug, status: existing.status, version: nextVersion, pending: true };
    }

    const publishing = args.intent === "publish";
    const res = await tx.page.updateMany({
      where: { id: existing.id, version: existing.version },
      data: {
        ...cols,
        status: publishing ? "PUBLISHED" : existing.status === "ARCHIVED" ? "DRAFT" : existing.status,
        publishedAt: publishing ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
        pendingChanges: Prisma.DbNull,
        version: nextVersion,
        lastEditedById: adminId,
      },
    });
    if (res.count !== 1) throw new ConflictError();
    if (existing.status === "PUBLISHED" && existing.slug !== input.slug) {
      await recordRedirect(tx, `/${existing.slug}`, `/${input.slug}`);
    }
    await addRevision(tx, existing.id, normalized, adminId, publishing ? "Published" : "Saved draft");
    return { id: existing.id, slug: input.slug, status: publishing ? "PUBLISHED" : existing.status, version: nextVersion };
  });
}

export async function unpublishPage(adminId: string, id: string) {
  const page = await db.page.findUnique({ where: { id } });
  if (!page) throw new NotFoundError("Page");
  return db.page.update({ where: { id }, data: { status: "DRAFT", lastEditedById: adminId, version: { increment: 1 } } });
}

export async function discardPageChanges(id: string) {
  await db.page.update({ where: { id }, data: { pendingChanges: Prisma.DbNull, version: { increment: 1 } } });
}

export async function deletePage(id: string) {
  const page = await db.page.findUnique({ where: { id } });
  if (!page) throw new NotFoundError("Page");
  if (page.system) throw new UserError("System pages (About, Privacy) cannot be deleted. Unpublish it instead.");
  await db.$transaction([
    db.redirect.deleteMany({ where: { toPath: `/${page.slug}` } }),
    db.page.delete({ where: { id } }),
  ]);
}

export async function restorePageRevision(adminId: string, revisionId: string) {
  const rev = await db.pageRevision.findUnique({ where: { id: revisionId }, include: { page: true } });
  if (!rev) throw new NotFoundError("Revision");
  const snapshot = pageInputSchema.parse(rev.snapshot);
  return savePage(adminId, { id: rev.pageId, version: rev.page.version, intent: "draft", data: snapshot });
}
