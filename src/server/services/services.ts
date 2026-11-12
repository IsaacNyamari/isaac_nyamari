import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { ICON_NAMES } from "@/lib/icons";
import { serviceInputSchema, type ServiceInput } from "@/lib/validation";
import { recordRedirect, toJson } from "./workflow";

export type SaveServiceArgs = { id?: string | null; version?: number; intent: "draft" | "publish"; data: unknown };

function columnsFrom(input: ServiceInput) {
  return {
    title: input.title,
    slug: input.slug,
    summary: input.summary,
    content: toJson(input.content),
    icon: (ICON_NAMES as string[]).includes(input.icon) ? input.icon : "code",
    deliverables: input.deliverables,
    ctaLabel: input.ctaLabel || "Discuss your project",
    featured: input.featured,
    imageId: input.imageId,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
  };
}

export async function saveService(adminId: string, args: SaveServiceArgs) {
  const input = serviceInputSchema.parse(args.data);
  const cols = columnsFrom(input);

  return db.$transaction(async (tx) => {
    if (!args.id) {
      const max = await tx.service.aggregate({ _max: { position: true } });
      const s = await tx.service.create({
        data: {
          ...cols,
          position: (max._max.position ?? -1) + 1,
          status: args.intent === "publish" ? "PUBLISHED" : "DRAFT",
          publishedAt: args.intent === "publish" ? new Date() : null,
          lastEditedById: adminId,
        },
      });
      return { id: s.id, slug: s.slug, status: s.status, version: s.version };
    }
    const existing = await tx.service.findUnique({ where: { id: args.id } });
    if (!existing) throw new NotFoundError("Service");
    if (args.version !== undefined && args.version !== existing.version) throw new ConflictError();
    const nextVersion = existing.version + 1;

    if (existing.status === "PUBLISHED" && args.intent === "draft") {
      const res = await tx.service.updateMany({
        where: { id: existing.id, version: existing.version },
        data: { pendingChanges: toJson(input), version: nextVersion, lastEditedById: adminId },
      });
      if (res.count !== 1) throw new ConflictError();
      return { id: existing.id, slug: existing.slug, status: existing.status, version: nextVersion, pending: true };
    }
    const publishing = args.intent === "publish";
    const res = await tx.service.updateMany({
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
      await recordRedirect(tx, `/services/${existing.slug}`, `/services/${input.slug}`);
    }
    return { id: existing.id, slug: input.slug, status: publishing ? "PUBLISHED" : existing.status, version: nextVersion };
  });
}

export async function unpublishService(adminId: string, id: string) {
  return db.service.update({ where: { id }, data: { status: "DRAFT", lastEditedById: adminId, version: { increment: 1 } } });
}

export async function discardServiceChanges(id: string) {
  await db.service.update({ where: { id }, data: { pendingChanges: Prisma.DbNull, version: { increment: 1 } } });
}

export async function deleteService(id: string) {
  const s = await db.service.findUnique({ where: { id }, select: { slug: true } });
  if (!s) throw new NotFoundError("Service");
  // Inquiries keep their service label snapshot; the FK is set to NULL.
  await db.$transaction([
    db.redirect.deleteMany({ where: { toPath: `/services/${s.slug}` } }),
    db.service.delete({ where: { id } }),
  ]);
}

export async function reorderServices(ids: string[]) {
  await db.$transaction(ids.map((id, position) => db.service.update({ where: { id }, data: { position } })));
}
