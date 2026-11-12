import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { NotFoundError, UserError } from "@/lib/errors";
import { deleteStoredFiles, storeUpload, validateUpload } from "@/lib/media";
import { z } from "zod";

export type UploadFile = { buffer: Buffer; filename: string; type?: string };

function cleanFilename(name: string) {
  return name.replace(/[\\/]/g, "_").replace(/[^\w.\- ()]/g, "").slice(0, 160) || "upload";
}

export async function createMedia(adminId: string, file: UploadFile, meta?: { alt?: string }) {
  const validated = await validateUpload(file.buffer, file.filename, file.type);
  const stored = await storeUpload(file.buffer, validated);
  try {
    return await db.mediaAsset.create({
      data: {
        kind: stored.kind,
        filename: cleanFilename(file.filename),
        storageKey: stored.storageKey,
        url: stored.url,
        mimeType: stored.mimeType,
        size: stored.size,
        width: stored.width,
        height: stored.height,
        variants: stored.variants as unknown as Prisma.InputJsonValue,
        alt: meta?.alt?.slice(0, 300) ?? "",
        uploaderId: adminId,
      },
    });
  } catch (err) {
    await deleteStoredFiles(stored.storageKey, stored.variants);
    throw err;
  }
}

/** Swaps the file behind an asset while keeping its id, so every reference stays valid. */
export async function replaceMedia(adminId: string, id: string, file: UploadFile) {
  const existing = await db.mediaAsset.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Media");
  const validated = await validateUpload(file.buffer, file.filename, file.type);
  if (validated.kind !== existing.kind) throw new UserError("A replacement must be the same kind of file (image or document).");
  const stored = await storeUpload(file.buffer, validated);
  const updated = await db.mediaAsset.update({
    where: { id },
    data: {
      filename: cleanFilename(file.filename),
      storageKey: stored.storageKey,
      url: stored.url,
      mimeType: stored.mimeType,
      size: stored.size,
      width: stored.width,
      height: stored.height,
      variants: stored.variants as unknown as Prisma.InputJsonValue,
      uploaderId: adminId,
    },
  });
  // Rich-text image nodes embed the URL, so point them at the new file.
  await rewriteEmbeddedUrls(existing.url, stored.url);
  await deleteStoredFiles(existing.storageKey, existing.variants);
  return updated;
}

async function rewriteEmbeddedUrls(oldUrl: string, newUrl: string) {
  for (const table of ["posts", "projects", "services", "pages"] as const) {
    await db.$executeRawUnsafe(
      `UPDATE ${table} SET content = replace(content::text, $1, $2)::jsonb WHERE content::text LIKE '%' || $1 || '%'`,
      JSON.stringify(oldUrl).slice(1, -1),
      JSON.stringify(newUrl).slice(1, -1),
    );
  }
}

export const mediaMetaSchema = z.object({
  alt: z.string().trim().max(300).default(""),
  caption: z.string().trim().max(500).default(""),
  description: z.string().trim().max(2000).default(""),
});

export async function updateMediaMeta(id: string, data: unknown) {
  return db.mediaAsset.update({ where: { id }, data: mediaMetaSchema.parse(data) });
}

export type MediaUsage = { type: string; label: string; href: string };

/** Finds every place an asset is referenced: relations, settings, homepage config and rich text. */
export async function findMediaUsage(id: string): Promise<MediaUsage[]> {
  const usage: MediaUsage[] = [];
  const like = `%${id}%`;
  const [posts, projects, gallery, services, pages, settings, sections] = await Promise.all([
    db.post.findMany({
      where: { OR: [{ coverImageId: id }, { ogImageId: id }] },
      select: { id: true, title: true },
    }),
    db.project.findMany({ where: { OR: [{ coverImageId: id }, { ogImageId: id }] }, select: { id: true, title: true } }),
    db.projectImage.findMany({ where: { mediaId: id }, select: { project: { select: { id: true, title: true } } } }),
    db.service.findMany({ where: { imageId: id }, select: { id: true, title: true } }),
    db.page.findMany({ where: { featuredImageId: id }, select: { id: true, title: true } }),
    db.siteSettings.findFirst({
      where: { OR: [{ logoLightId: id }, { logoDarkId: id }, { faviconId: id }, { ogImageId: id }, { placeholderImageId: id }] },
      select: { id: true },
    }),
    db.$queryRaw<{ key: string; state: string }[]>`SELECT key, state::text FROM home_sections WHERE config::text LIKE ${like}`,
  ]);
  posts.forEach((p) => usage.push({ type: "Post", label: p.title, href: `/admin/posts/${p.id}` }));
  projects.forEach((p) => usage.push({ type: "Project", label: p.title, href: `/admin/projects/${p.id}` }));
  gallery.forEach((g) => usage.push({ type: "Project gallery", label: g.project.title, href: `/admin/projects/${g.project.id}` }));
  services.forEach((s) => usage.push({ type: "Service", label: s.title, href: `/admin/services/${s.id}` }));
  pages.forEach((p) => usage.push({ type: "Page", label: p.title, href: `/admin/pages/${p.id}` }));
  if (settings) usage.push({ type: "Settings", label: "Branding / SEO", href: "/admin/settings" });
  sections.forEach((s) => usage.push({ type: "Homepage", label: `${s.key} (${s.state.toLowerCase()})`, href: "/admin/pages/homepage" }));

  // Inline images inside rich text (live content and unpublished changes)
  for (const [table, type, base] of [
    ["posts", "Post content", "/admin/posts"],
    ["projects", "Project content", "/admin/projects"],
    ["services", "Service content", "/admin/services"],
    ["pages", "Page content", "/admin/pages"],
  ] as const) {
    const rows = await db.$queryRawUnsafe<{ id: string; title: string }[]>(
      `SELECT id, title FROM ${table} WHERE content::text LIKE $1 OR COALESCE("pendingChanges"::text, '') LIKE $1`,
      like,
    );
    rows.forEach((r) => {
      if (!usage.some((u) => u.href === `${base}/${r.id}` && u.type === type)) usage.push({ type, label: r.title, href: `${base}/${r.id}` });
    });
  }
  return usage;
}

/** Deletes an asset only when nothing references it. Files are removed after the row. */
export async function deleteMedia(id: string) {
  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw new NotFoundError("Media");
  const usage = await findMediaUsage(id);
  if (usage.length) {
    throw new UserError(
      `This file is still used in ${usage.length} place${usage.length === 1 ? "" : "s"} (${usage
        .slice(0, 3)
        .map((u) => `${u.type}: ${u.label}`)
        .join("; ")}). Remove those references first.`,
    );
  }
  await db.mediaAsset.delete({ where: { id } });
  await deleteStoredFiles(asset.storageKey, asset.variants);
}

export type MediaListQuery = { q?: string; kind?: "IMAGE" | "DOCUMENT" | ""; page?: number; perPage?: number };

export async function listMedia(query: MediaListQuery) {
  const perPage = Math.min(100, query.perPage ?? 24);
  const page = Math.max(1, query.page ?? 1);
  const where: Prisma.MediaAssetWhereInput = {
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.q
      ? {
          OR: [
            { filename: { contains: query.q, mode: "insensitive" } },
            { alt: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.mediaAsset.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * perPage, take: perPage }),
    db.mediaAsset.count({ where }),
  ]);
  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}
