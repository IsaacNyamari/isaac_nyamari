import "server-only";
import { db } from "@/lib/db";
import { TAGS } from "@/lib/cache";
import { asDoc, type RTNode } from "@/lib/rich-text/model";
import type { PageInput } from "@/lib/validation";
import { cached, imageSelect, publishedWhere, toImage, type PublicImage } from "./common";

export type PageDetail = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: RTNode;
  template: string;
  data: Record<string, unknown>;
  featuredImage: PublicImage | null;
  seoTitle: string;
  seoDescription: string;
  updatedAt: string;
};

const include = { featuredImage: { select: imageSelect } } as const;

async function loadPage(slug: string): Promise<PageDetail | null> {
  const p = await db.page.findFirst({ where: { slug, ...publishedWhere() }, include });
  if (!p) return null;
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content: asDoc(p.content),
    template: p.template,
    data: (p.data ?? {}) as Record<string, unknown>,
    featuredImage: toImage(p.featuredImage),
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    updatedAt: p.updatedAt.toISOString(),
  };
}
export const getPublishedPage = cached(loadPage, "pages:detail", [TAGS.pages, TAGS.media]);

export async function getPagePreview(slug: string): Promise<PageDetail | null> {
  const p = await db.page.findUnique({ where: { slug }, include });
  if (!p) return null;
  const pending = p.pendingChanges as Partial<PageInput> | null;
  const imageId = pending ? pending.featuredImageId : p.featuredImageId;
  const image = imageId ? await db.mediaAsset.findUnique({ where: { id: imageId }, select: imageSelect }) : null;
  return {
    id: p.id,
    title: pending?.title ?? p.title,
    slug: p.slug,
    excerpt: pending?.excerpt ?? p.excerpt,
    content: asDoc(pending?.content ?? p.content),
    template: p.template,
    data: (pending?.data ?? p.data ?? {}) as Record<string, unknown>,
    featuredImage: toImage(image),
    seoTitle: pending?.seoTitle ?? p.seoTitle,
    seoDescription: pending?.seoDescription ?? p.seoDescription,
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function loadNavPages() {
  return db.page.findMany({
    where: { ...publishedWhere(), showInNav: true, system: false },
    select: { title: true, slug: true },
    orderBy: { title: "asc" },
  });
}
export const getNavPages = cached(loadNavPages, "pages:nav", [TAGS.pages]);

export async function publishedPageSlugs() {
  return db.page.findMany({ where: publishedWhere(), select: { slug: true, updatedAt: true, system: true } });
}
