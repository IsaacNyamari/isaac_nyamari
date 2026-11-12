"use server";

import { runAction } from "@/lib/action";
import { invalidate, TAGS } from "@/lib/cache";
import { parseVariants } from "@/lib/media";
import { requireAdmin } from "@/lib/session";
import { deleteMedia, findMediaUsage, listMedia, type MediaListQuery, updateMediaMeta } from "@/server/services/media";
import type { MediaAsset } from "@/generated/prisma/client";
import type { MediaItem } from "@/components/admin/media-types";

function toItem(m: MediaAsset): MediaItem {
  const variants = parseVariants(m.variants);
  return {
    id: m.id,
    url: m.url,
    thumbUrl: variants[0]?.url ?? m.url,
    filename: m.filename,
    alt: m.alt,
    caption: m.caption,
    description: m.description,
    width: m.width,
    height: m.height,
    size: m.size,
    mimeType: m.mimeType,
    kind: m.kind,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function listMediaAction(query: MediaListQuery) {
  return runAction(async () => {
    await requireAdmin();
    const res = await listMedia({ ...query, q: query.q?.slice(0, 100) });
    return { ...res, items: res.items.map(toItem) };
  });
}

export async function getMediaItemsAction(ids: string[]) {
  return runAction(async () => {
    await requireAdmin();
    const { db } = await import("@/lib/db");
    const rows = await db.mediaAsset.findMany({ where: { id: { in: ids.slice(0, 100) } } });
    return rows.map(toItem);
  });
}

export async function updateMediaMetaAction(id: string, data: unknown) {
  return runAction(async () => {
    await requireAdmin("media:write");
    const m = await updateMediaMeta(id, data);
    invalidate(TAGS.media);
    return toItem(m);
  }, "Details saved");
}

export async function mediaUsageAction(id: string) {
  return runAction(async () => {
    await requireAdmin();
    return findMediaUsage(id);
  });
}

export async function deleteMediaAction(id: string) {
  return runAction(async () => {
    await requireAdmin("media:write");
    await deleteMedia(id);
    invalidate(TAGS.media);
    return null;
  }, "File deleted");
}
