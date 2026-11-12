import "server-only";
import { db } from "@/lib/db";
import { parseVariants } from "@/lib/media";
import { asDoc, EMPTY_DOC } from "@/lib/rich-text/model";
import type { PostInput } from "@/lib/validation";
import type { PostEditorData } from "./PostEditor";

async function imageValue(id: string | null | undefined) {
  if (!id) return null;
  const m = await db.mediaAsset.findUnique({ where: { id }, select: { id: true, url: true, alt: true, variants: true } });
  return m ? { id: m.id, url: parseVariants(m.variants)[1]?.url ?? m.url, alt: m.alt } : null;
}

export async function loadPostEditor(id: string | null): Promise<PostEditorData | null> {
  const [categories, tags, others] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.post.findMany({ where: id ? { id: { not: id } } : {}, orderBy: { updatedAt: "desc" }, take: 200, select: { id: true, title: true, status: true } }),
  ]);

  if (!id) {
    return {
      id: null, version: 0, categories, tags, others, revisions: [],
      state: { status: "DRAFT", hasPending: false },
      form: {
        title: "", slug: "", excerpt: "", content: EMPTY_DOC, coverImage: null, ogImage: null, categoryId: null, tagIds: [], relatedIds: [],
        featured: false, showToc: false, canonicalUrl: "", seoTitle: "", seoDescription: "", scheduledAt: "",
      },
    };
  }

  const post = await db.post.findUnique({
    where: { id },
    include: {
      tags: { select: { tagId: true } },
      related: { orderBy: { position: "asc" }, select: { relatedId: true } },
      lastEditedBy: { select: { name: true } },
      revisions: { orderBy: { createdAt: "desc" }, take: 30, select: { id: true, title: true, note: true, createdAt: true, editor: { select: { name: true } } } },
    },
  });
  if (!post) return null;

  // Unpublished edits to a live post are what the editor should continue from.
  const pending = post.pendingChanges as PostInput | null;
  const src = pending ?? {
    title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, coverImageId: post.coverImageId, ogImageId: post.ogImageId,
    categoryId: post.categoryId, tagIds: post.tags.map((t) => t.tagId), relatedIds: post.related.map((r) => r.relatedId), featured: post.featured,
    showToc: post.showToc, canonicalUrl: post.canonicalUrl, seoTitle: post.seoTitle, seoDescription: post.seoDescription,
  };

  return {
    id: post.id,
    version: post.version,
    categories,
    tags,
    others,
    revisions: post.revisions.map((r) => ({ id: r.id, title: r.title, note: r.note, createdAt: r.createdAt.toISOString(), editor: r.editor?.name ?? null })),
    state: {
      status: post.status,
      hasPending: pending !== null,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      scheduledAt: post.scheduledAt?.toISOString() ?? null,
      updatedAt: post.updatedAt.toISOString(),
      lastEditor: post.lastEditedBy?.name ?? null,
    },
    form: {
      title: src.title,
      slug: src.slug,
      excerpt: src.excerpt ?? "",
      content: asDoc(src.content),
      coverImage: await imageValue(src.coverImageId),
      ogImage: await imageValue(src.ogImageId),
      categoryId: src.categoryId ?? null,
      tagIds: src.tagIds ?? [],
      relatedIds: src.relatedIds ?? [],
      featured: src.featured ?? false,
      showToc: src.showToc ?? false,
      canonicalUrl: src.canonicalUrl ?? "",
      seoTitle: src.seoTitle ?? "",
      seoDescription: src.seoDescription ?? "",
      scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString() : "",
    },
  };
}
