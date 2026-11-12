import "server-only";
import { unstable_cache } from "next/cache";
import type { MediaAsset } from "@/generated/prisma/client";
import type { CacheTag } from "@/lib/cache";
import { parseVariants } from "@/lib/media";

/**
 * Tagged cache for public read models. Results are JSON-serialised by Next,
 * so loaders return plain DTOs (dates as ISO strings).
 */
export function cached<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string, tags: CacheTag[]) {
  if (process.env.VITEST) return fn;
  return unstable_cache(fn, [key], { tags, revalidate: 3600 });
}

/** Only records that are published and whose publication time has passed. */
export function publishedWhere() {
  return { status: "PUBLISHED" as const, publishedAt: { lte: new Date() } };
}

export type PublicImage = {
  id: string;
  url: string;
  alt: string;
  caption: string;
  width: number | null;
  height: number | null;
  srcSet: string;
};

export function toImage(asset: Pick<MediaAsset, "id" | "url" | "alt" | "caption" | "width" | "height" | "variants"> | null | undefined): PublicImage | null {
  if (!asset) return null;
  const variants = parseVariants(asset.variants);
  const srcSet = [
    ...variants.map((v) => `${v.url} ${v.width}w`),
    ...(asset.width ? [`${asset.url} ${asset.width}w`] : []),
  ].join(", ");
  return {
    id: asset.id,
    url: asset.url,
    alt: asset.alt,
    caption: asset.caption,
    width: asset.width,
    height: asset.height,
    srcSet,
  };
}

export const imageSelect = { id: true, url: true, alt: true, caption: true, width: true, height: true, variants: true } as const;

export function iso(d: Date | null | undefined) {
  return d ? d.toISOString() : null;
}
