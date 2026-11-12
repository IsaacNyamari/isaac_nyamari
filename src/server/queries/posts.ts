import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { TAGS } from "@/lib/cache";
import { asDoc, type RTNode } from "@/lib/rich-text/model";
import type { PostInput } from "@/lib/validation";
import { cached, imageSelect, iso, publishedWhere, toImage, type PublicImage } from "./common";

export const POSTS_PER_PAGE = 9;

export type PostCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string | null;
  readingMinutes: number;
  featured: boolean;
  cover: PublicImage | null;
  category: { name: string; slug: string } | null;
  authorName: string;
};

export type PostDetail = PostCard & {
  content: RTNode;
  tags: { name: string; slug: string }[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogImage: PublicImage | null;
  updatedAt: string;
  showToc: boolean;
  categoryId: string | null;
  tagIds: string[];
  relatedIds: string[];
  status: string;
};

const cardInclude = {
  coverImage: { select: imageSelect },
  category: { select: { name: true, slug: true } },
  author: { select: { name: true } },
} satisfies Prisma.PostInclude;

type CardRow = Prisma.PostGetPayload<{ include: typeof cardInclude }>;

function toCard(p: CardRow): PostCard {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    publishedAt: iso(p.publishedAt),
    readingMinutes: p.readingMinutes,
    featured: p.featured,
    cover: toImage(p.coverImage),
    category: p.category,
    authorName: p.author?.name ?? "",
  };
}

export type PostListQuery = { page?: number; categorySlug?: string; tagSlug?: string; q?: string; perPage?: number };

async function loadPostList(query: PostListQuery) {
  const perPage = query.perPage ?? POSTS_PER_PAGE;
  const page = Math.max(1, query.page ?? 1);
  const q = query.q?.trim().slice(0, 100);
  const where: Prisma.PostWhereInput = {
    ...publishedWhere(),
    ...(query.categorySlug ? { category: { slug: query.categorySlug } } : {}),
    ...(query.tagSlug ? { tags: { some: { tag: { slug: query.tagSlug } } } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { excerpt: { contains: q, mode: "insensitive" } },
            { contentText: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.post.findMany({ where, include: cardInclude, orderBy: [{ publishedAt: "desc" }], skip: (page - 1) * perPage, take: perPage }),
    db.post.count({ where }),
  ]);
  return { items: rows.map(toCard), total, page, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export const listPublishedPosts = cached(loadPostList, "posts:list", [TAGS.posts, TAGS.taxonomy, TAGS.media]);

async function loadRecentPosts(limit: number, ids: string[]) {
  const where = ids.length ? { ...publishedWhere(), id: { in: ids } } : publishedWhere();
  const rows = await db.post.findMany({
    where,
    include: cardInclude,
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    take: ids.length ? ids.length : limit,
  });
  const cards = rows.map(toCard);
  return ids.length ? ids.map((id) => cards.find((c) => c.id === id)).filter((c): c is PostCard => Boolean(c)) : cards;
}

export const getRecentPosts = cached(loadRecentPosts, "posts:recent", [TAGS.posts, TAGS.media]);

const detailInclude = {
  ...cardInclude,
  ogImage: { select: imageSelect },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  related: { orderBy: { position: "asc" }, select: { relatedId: true } },
} satisfies Prisma.PostInclude;

type DetailRow = Prisma.PostGetPayload<{ include: typeof detailInclude }>;

function toDetail(p: DetailRow): PostDetail {
  return {
    ...toCard(p),
    content: asDoc(p.content),
    tags: p.tags.map((t) => ({ name: t.tag.name, slug: t.tag.slug })),
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    canonicalUrl: p.canonicalUrl,
    ogImage: toImage(p.ogImage),
    updatedAt: p.updatedAt.toISOString(),
    showToc: p.showToc,
    categoryId: p.categoryId,
    tagIds: p.tags.map((t) => t.tag.id),
    relatedIds: p.related.map((r) => r.relatedId),
    status: p.status,
  };
}

async function loadPostBySlug(slug: string): Promise<PostDetail | null> {
  const p = await db.post.findFirst({ where: { slug, ...publishedWhere() }, include: detailInclude });
  return p ? toDetail(p) : null;
}

export const getPublishedPost = cached(loadPostBySlug, "posts:detail", [TAGS.posts, TAGS.taxonomy, TAGS.media]);

/** Draft preview (admins only — callers must verify the session). Applies unpublished edits. */
export async function getPostPreview(slug: string): Promise<PostDetail | null> {
  const p = await db.post.findUnique({ where: { slug }, include: detailInclude });
  if (!p) return null;
  const base = toDetail(p);
  const pending = p.pendingChanges as Partial<PostInput> | null;
  if (!pending) return base;
  const [cover, category, tags, og] = await Promise.all([
    pending.coverImageId ? db.mediaAsset.findUnique({ where: { id: pending.coverImageId }, select: imageSelect }) : null,
    pending.categoryId ? db.category.findUnique({ where: { id: pending.categoryId }, select: { name: true, slug: true } }) : null,
    db.tag.findMany({ where: { id: { in: pending.tagIds ?? [] } }, select: { id: true, name: true, slug: true } }),
    pending.ogImageId ? db.mediaAsset.findUnique({ where: { id: pending.ogImageId }, select: imageSelect }) : null,
  ]);
  return {
    ...base,
    title: pending.title ?? base.title,
    excerpt: pending.excerpt ?? base.excerpt,
    content: asDoc(pending.content ?? base.content),
    cover: toImage(cover),
    category,
    tags: tags.map((t) => ({ name: t.name, slug: t.slug })),
    ogImage: toImage(og),
    showToc: pending.showToc ?? base.showToc,
    seoTitle: pending.seoTitle ?? base.seoTitle,
    seoDescription: pending.seoDescription ?? base.seoDescription,
    relatedIds: pending.relatedIds ?? base.relatedIds,
    tagIds: tags.map((t) => t.id),
    categoryId: pending.categoryId ?? null,
  };
}

async function loadRelatedPosts(postId: string, explicitIds: string[], categoryId: string | null, tagIds: string[], limit = 3) {
  const explicit = explicitIds.length
    ? await db.post.findMany({ where: { ...publishedWhere(), id: { in: explicitIds } }, include: cardInclude })
    : [];
  const ordered = explicitIds.map((id) => explicit.find((p) => p.id === id)).filter((p): p is CardRow => Boolean(p));
  if (ordered.length >= limit) return ordered.slice(0, limit).map(toCard);
  const excluded = [postId, ...ordered.map((p) => p.id)];
  const similar = await db.post.findMany({
    where: {
      ...publishedWhere(),
      id: { notIn: excluded },
      OR: [
        ...(categoryId ? [{ categoryId }] : []),
        ...(tagIds.length ? [{ tags: { some: { tagId: { in: tagIds } } } }] : []),
      ],
    },
    include: cardInclude,
    orderBy: { publishedAt: "desc" },
    take: limit - ordered.length,
  });
  let result = [...ordered, ...similar];
  if (result.length < limit) {
    const recent = await db.post.findMany({
      where: { ...publishedWhere(), id: { notIn: [...excluded, ...similar.map((p) => p.id)] } },
      include: cardInclude,
      orderBy: { publishedAt: "desc" },
      take: limit - result.length,
    });
    result = [...result, ...recent];
  }
  return result.map(toCard);
}

export const getRelatedPosts = cached(loadRelatedPosts, "posts:related", [TAGS.posts, TAGS.media]);

async function loadCategories() {
  const rows = await db.category.findMany({
    orderBy: { name: "asc" },
    select: { name: true, slug: true, description: true, _count: { select: { posts: { where: publishedWhere() } } } },
  });
  return rows.map((c) => ({ name: c.name, slug: c.slug, description: c.description, count: c._count.posts }));
}
export const getPublicCategories = cached(loadCategories, "posts:categories", [TAGS.posts, TAGS.taxonomy]);

async function loadTag(slug: string) {
  return db.tag.findUnique({ where: { slug }, select: { name: true, slug: true } });
}
export const getPublicTag = cached(loadTag, "posts:tag", [TAGS.taxonomy]);

/** For the sitemap. */
export async function publishedPostSlugs() {
  return db.post.findMany({ where: publishedWhere(), select: { slug: true, updatedAt: true }, orderBy: { publishedAt: "desc" } });
}
