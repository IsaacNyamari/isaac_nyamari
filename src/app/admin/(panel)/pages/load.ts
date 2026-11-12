import "server-only";
import { db } from "@/lib/db";
import { parseVariants } from "@/lib/media";
import { asDoc, EMPTY_DOC } from "@/lib/rich-text/model";
import { aboutDataSchema, type PageInput } from "@/lib/validation";
import type { PageEditorData } from "./PageEditor";

export async function loadPageEditor(id: string | null): Promise<PageEditorData | null> {
  if (!id) {
    return {
      id: null, version: 0, system: false, template: "DEFAULT", revisions: [], state: { status: "DRAFT", hasPending: false },
      form: { title: "", slug: "", excerpt: "", content: EMPTY_DOC, featuredImage: null, showInNav: false, data: {}, seoTitle: "", seoDescription: "" },
    };
  }
  const p = await db.page.findUnique({
    where: { id },
    include: {
      lastEditedBy: { select: { name: true } },
      revisions: { orderBy: { createdAt: "desc" }, take: 30, select: { id: true, title: true, note: true, createdAt: true, editor: { select: { name: true } } } },
    },
  });
  if (!p) return null;
  const pending = p.pendingChanges as PageInput | null;
  const src = pending ?? { ...p, data: p.data as Record<string, unknown> };
  const imageId = pending ? pending.featuredImageId : p.featuredImageId;
  const m = imageId ? await db.mediaAsset.findUnique({ where: { id: imageId }, select: { id: true, url: true, alt: true, variants: true } }) : null;
  const data = p.template === "ABOUT" ? aboutDataSchema.parse(src.data ?? {}) : ((src.data ?? {}) as Record<string, unknown>);
  return {
    id: p.id,
    version: p.version,
    system: p.system,
    template: p.template,
    revisions: p.revisions.map((r) => ({ id: r.id, title: r.title, note: r.note, createdAt: r.createdAt.toISOString(), editor: r.editor?.name ?? null })),
    state: { status: p.status, hasPending: pending !== null, publishedAt: p.publishedAt?.toISOString() ?? null, updatedAt: p.updatedAt.toISOString(), lastEditor: p.lastEditedBy?.name ?? null },
    form: {
      title: src.title, slug: src.slug, excerpt: src.excerpt, content: asDoc(src.content), showInNav: src.showInNav, data,
      featuredImage: m ? { id: m.id, url: parseVariants(m.variants)[1]?.url ?? m.url, alt: m.alt } : null,
      seoTitle: src.seoTitle, seoDescription: src.seoDescription,
    },
  };
}
