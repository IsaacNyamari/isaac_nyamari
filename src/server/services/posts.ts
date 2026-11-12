import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError, UserError } from "@/lib/errors";
import { extractText, readingMinutes } from "@/lib/rich-text/model";
import { postInputSchema, type PostInput, saveIntentSchema } from "@/lib/validation";
import { recordRedirect, REVISIONS_TO_KEEP, type SaveIntent, toJson, type Tx } from "./workflow";

export type SavePostArgs = {
  id?: string | null;
  version?: number;
  intent: SaveIntent;
  scheduledAt?: string | null;
  data: unknown;
};

function columnsFrom(input: PostInput) {
  const text = extractText(input.content as never);
  return {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    content: toJson(input.content),
    contentText: text.slice(0, 200_000),
    readingMinutes: readingMinutes(text),
    coverImageId: input.coverImageId,
    ogImageId: input.ogImageId,
    categoryId: input.categoryId,
    featured: input.featured,
    showToc: input.showToc,
    canonicalUrl: input.canonicalUrl,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
  };
}

async function syncRelations(tx: Tx, postId: string, input: PostInput) {
  await tx.postTag.deleteMany({ where: { postId } });
  if (input.tagIds.length) {
    await tx.postTag.createMany({ data: [...new Set(input.tagIds)].map((tagId) => ({ postId, tagId })) });
  }
  await tx.postRelation.deleteMany({ where: { postId } });
  const related = [...new Set(input.relatedIds)].filter((r) => r !== postId);
  if (related.length) {
    await tx.postRelation.createMany({ data: related.map((relatedId, position) => ({ postId, relatedId, position })) });
  }
}

async function addRevision(tx: Tx, postId: string, input: PostInput, editorId: string, note: string) {
  await tx.postRevision.create({ data: { postId, title: input.title, snapshot: toJson(input), editorId, note } });
  const stale = await tx.postRevision.findMany({
    where: { postId },
    orderBy: { createdAt: "desc" },
    skip: REVISIONS_TO_KEEP,
    select: { id: true },
  });
  if (stale.length) await tx.postRevision.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
}

function parseSchedule(value: string | null | undefined) {
  if (!value) throw new UserError("Choose a publication date and time.", { scheduledAt: "Required" });
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new UserError("Invalid schedule date.", { scheduledAt: "Invalid date" });
  if (date.getTime() <= Date.now() + 30_000) {
    throw new UserError("The scheduled time must be in the future.", { scheduledAt: "Must be in the future" });
  }
  return date;
}

/**
 * Create or update a post.
 * - draft on an unpublished post saves in place;
 * - draft on a published post stores `pendingChanges` so the live article is untouched;
 * - publish applies everything and makes it live; schedule queues it for the publisher.
 */
export async function savePost(adminId: string, args: SavePostArgs) {
  const intent = saveIntentSchema.parse(args.intent);
  const input = postInputSchema.parse(args.data);
  const cols = columnsFrom(input);

  return db.$transaction(async (tx) => {
    if (!args.id) {
      const scheduledAt = intent === "schedule" ? parseSchedule(args.scheduledAt) : null;
      const post = await tx.post.create({
        data: {
          ...cols,
          authorId: adminId,
          lastEditedById: adminId,
          status: intent === "publish" ? "PUBLISHED" : intent === "schedule" ? "SCHEDULED" : "DRAFT",
          publishedAt: intent === "publish" ? new Date() : null,
          scheduledAt,
        },
      });
      await syncRelations(tx, post.id, input);
      await addRevision(tx, post.id, input, adminId, `Created (${intent})`);
      return { id: post.id, slug: post.slug, status: post.status, version: post.version };
    }

    const existing = await tx.post.findUnique({ where: { id: args.id } });
    if (!existing) throw new NotFoundError("Post");
    if (args.version !== undefined && args.version !== existing.version) throw new ConflictError();

    const nextVersion = existing.version + 1;
    const guard = { id: existing.id, version: existing.version };

    if (existing.status === "PUBLISHED" && intent === "draft") {
      const res = await tx.post.updateMany({
        where: guard,
        data: { pendingChanges: toJson(input), version: nextVersion, lastEditedById: adminId },
      });
      if (res.count !== 1) throw new ConflictError();
      await addRevision(tx, existing.id, input, adminId, "Saved unpublished changes");
      return { id: existing.id, slug: existing.slug, status: existing.status, version: nextVersion, pending: true };
    }

    if (existing.status === "PUBLISHED" && intent === "schedule") {
      throw new UserError("This post is already published. Unpublish it first to schedule it.");
    }

    let status = existing.status;
    let publishedAt = existing.publishedAt;
    let scheduledAt = existing.scheduledAt;
    if (intent === "publish") {
      status = "PUBLISHED";
      publishedAt = existing.status === "PUBLISHED" && existing.publishedAt ? existing.publishedAt : new Date();
      scheduledAt = null;
    } else if (intent === "schedule") {
      status = "SCHEDULED";
      scheduledAt = parseSchedule(args.scheduledAt);
      publishedAt = null;
    } else if (existing.status === "SCHEDULED" || existing.status === "ARCHIVED") {
      // Saving as draft takes a scheduled/archived post back to draft.
      status = "DRAFT";
      scheduledAt = null;
    }

    const res = await tx.post.updateMany({
      where: guard,
      data: {
        ...cols,
        status,
        publishedAt,
        scheduledAt,
        pendingChanges: Prisma.DbNull,
        version: nextVersion,
        lastEditedById: adminId,
      },
    });
    if (res.count !== 1) throw new ConflictError();
    await syncRelations(tx, existing.id, input);
    if (existing.status === "PUBLISHED" && status === "PUBLISHED" && existing.slug !== input.slug) {
      await recordRedirect(tx, `/insights/${existing.slug}`, `/insights/${input.slug}`);
    }
    await addRevision(tx, existing.id, input, adminId, intent === "publish" ? "Published" : intent === "schedule" ? "Scheduled" : "Saved draft");
    return { id: existing.id, slug: input.slug, status, version: nextVersion };
  });
}

export async function setPostStatus(adminId: string, id: string, status: "DRAFT" | "ARCHIVED") {
  const post = await db.post.findUnique({ where: { id } });
  if (!post) throw new NotFoundError("Post");
  return db.post.update({
    where: { id },
    data: { status, scheduledAt: null, lastEditedById: adminId, version: { increment: 1 } },
  });
}

export async function discardPostChanges(id: string) {
  await db.post.update({ where: { id }, data: { pendingChanges: Prisma.DbNull, version: { increment: 1 } } });
}

export async function deletePost(id: string) {
  const post = await db.post.findUnique({ where: { id }, select: { slug: true } });
  if (!post) throw new NotFoundError("Post");
  await db.$transaction([
    db.redirect.deleteMany({ where: { toPath: `/insights/${post.slug}` } }),
    db.post.delete({ where: { id } }),
  ]);
}

/** Loads a revision into the editor state: as pending changes if live, otherwise in place. */
export async function restorePostRevision(adminId: string, revisionId: string) {
  const rev = await db.postRevision.findUnique({ where: { id: revisionId }, include: { post: true } });
  if (!rev) throw new NotFoundError("Revision");
  const snapshot = postInputSchema.parse(rev.snapshot);
  // Saving as a draft never changes the live article: a published post receives pending changes.
  return savePost(adminId, { id: rev.postId, version: rev.post.version, intent: "draft", data: snapshot });
}

/** Promotes due scheduled posts. Returns the slugs that went live. */
export async function publishDueScheduledPosts(now = new Date()) {
  const rows = await db.$queryRaw<{ id: string; slug: string }[]>`
    UPDATE posts
       SET status = 'PUBLISHED', "publishedAt" = "scheduledAt", "scheduledAt" = NULL,
           version = version + 1, "updatedAt" = NOW()
     WHERE status = 'SCHEDULED' AND "scheduledAt" <= ${now}
     RETURNING id, slug`;
  return rows;
}
