import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { projectCategoryInputSchema, projectInputSchema, type ProjectInput } from "@/lib/validation";
import { recordRedirect, toJson, type Tx } from "./workflow";

export type SaveProjectArgs = { id?: string | null; version?: number; intent: "draft" | "publish"; data: unknown };

function columnsFrom(input: ProjectInput) {
  return {
    title: input.title,
    slug: input.slug,
    summary: input.summary,
    problem: input.problem,
    solution: input.solution,
    content: toJson(input.content),
    role: input.role,
    clientName: input.clientName,
    technologies: [...new Set(input.technologies)],
    startDate: input.startDate,
    endDate: input.endDate,
    externalUrl: input.externalUrl,
    repositoryUrl: input.repositoryUrl,
    featured: input.featured,
    coverImageId: input.coverImageId,
    ogImageId: input.ogImageId,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
  };
}

async function syncGallery(tx: Tx, projectId: string, input: ProjectInput) {
  await tx.projectImage.deleteMany({ where: { projectId } });
  if (input.gallery.length) {
    await tx.projectImage.createMany({
      data: input.gallery.map((g, position) => ({ projectId, mediaId: g.mediaId, caption: g.caption, position })),
    });
  }
}

export async function saveProject(adminId: string, args: SaveProjectArgs) {
  const input = projectInputSchema.parse(args.data);
  const cols = columnsFrom(input);
  const categories = { set: [...new Set(input.categoryIds)].map((id) => ({ id })) };

  return db.$transaction(async (tx) => {
    if (!args.id) {
      const max = await tx.project.aggregate({ _max: { position: true } });
      const project = await tx.project.create({
        data: {
          ...cols,
          categories: { connect: categories.set },
          position: (max._max.position ?? -1) + 1,
          status: args.intent === "publish" ? "PUBLISHED" : "DRAFT",
          publishedAt: args.intent === "publish" ? new Date() : null,
          lastEditedById: adminId,
        },
      });
      await syncGallery(tx, project.id, input);
      return { id: project.id, slug: project.slug, status: project.status, version: project.version };
    }

    const existing = await tx.project.findUnique({ where: { id: args.id } });
    if (!existing) throw new NotFoundError("Project");
    if (args.version !== undefined && args.version !== existing.version) throw new ConflictError();
    const nextVersion = existing.version + 1;

    if (existing.status === "PUBLISHED" && args.intent === "draft") {
      const res = await tx.project.updateMany({
        where: { id: existing.id, version: existing.version },
        data: { pendingChanges: toJson(input), version: nextVersion, lastEditedById: adminId },
      });
      if (res.count !== 1) throw new ConflictError();
      return { id: existing.id, slug: existing.slug, status: existing.status, version: nextVersion, pending: true };
    }

    const publishing = args.intent === "publish";
    const res = await tx.project.updateMany({
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
    await tx.project.update({ where: { id: existing.id }, data: { categories } });
    await syncGallery(tx, existing.id, input);
    if (existing.status === "PUBLISHED" && existing.slug !== input.slug) {
      await recordRedirect(tx, `/projects/${existing.slug}`, `/projects/${input.slug}`);
    }
    return { id: existing.id, slug: input.slug, status: publishing ? "PUBLISHED" : existing.status, version: nextVersion };
  });
}

export async function unpublishProject(adminId: string, id: string) {
  return db.project.update({ where: { id }, data: { status: "DRAFT", lastEditedById: adminId, version: { increment: 1 } } });
}

export async function discardProjectChanges(id: string) {
  await db.project.update({ where: { id }, data: { pendingChanges: Prisma.DbNull, version: { increment: 1 } } });
}

export async function deleteProject(id: string) {
  const p = await db.project.findUnique({ where: { id }, select: { slug: true } });
  if (!p) throw new NotFoundError("Project");
  await db.$transaction([
    db.redirect.deleteMany({ where: { toPath: `/projects/${p.slug}` } }),
    db.project.delete({ where: { id } }),
  ]);
}

/** Persists a full ordering given as an array of ids. */
export async function reorderProjects(ids: string[]) {
  await db.$transaction(ids.map((id, position) => db.project.update({ where: { id }, data: { position } })));
}

export async function saveProjectCategory(id: string | null, data: unknown) {
  const input = projectCategoryInputSchema.parse(data);
  if (id) return db.projectCategory.update({ where: { id }, data: input });
  const max = await db.projectCategory.aggregate({ _max: { position: true } });
  return db.projectCategory.create({ data: { ...input, position: (max._max.position ?? -1) + 1 } });
}

export async function deleteProjectCategory(id: string) {
  // Projects keep existing; the many-to-many link is removed.
  await db.projectCategory.delete({ where: { id } });
}
