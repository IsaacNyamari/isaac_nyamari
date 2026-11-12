import "server-only";
import { db } from "@/lib/db";
import { parseVariants } from "@/lib/media";
import { asDoc, EMPTY_DOC } from "@/lib/rich-text/model";
import type { ServiceInput } from "@/lib/validation";
import type { ServiceEditorData } from "./ServiceEditor";

export async function loadServiceEditor(id: string | null): Promise<ServiceEditorData | null> {
  if (!id) {
    return {
      id: null, version: 0, state: { status: "DRAFT", hasPending: false },
      form: { title: "", slug: "", summary: "", content: EMPTY_DOC, icon: "code", deliverables: [], ctaLabel: "Discuss your project", featured: true, image: null, seoTitle: "", seoDescription: "" },
    };
  }
  const s = await db.service.findUnique({ where: { id }, include: { lastEditedBy: { select: { name: true } } } });
  if (!s) return null;
  const pending = s.pendingChanges as ServiceInput | null;
  const src = pending ?? { ...s, content: s.content };
  const imageId = pending ? pending.imageId : s.imageId;
  const m = imageId ? await db.mediaAsset.findUnique({ where: { id: imageId }, select: { id: true, url: true, alt: true, variants: true } }) : null;
  return {
    id: s.id,
    version: s.version,
    state: { status: s.status, hasPending: pending !== null, publishedAt: s.publishedAt?.toISOString() ?? null, updatedAt: s.updatedAt.toISOString(), lastEditor: s.lastEditedBy?.name ?? null },
    form: {
      title: src.title, slug: src.slug, summary: src.summary, content: asDoc(src.content), icon: src.icon, deliverables: src.deliverables, ctaLabel: src.ctaLabel,
      featured: src.featured, image: m ? { id: m.id, url: parseVariants(m.variants)[1]?.url ?? m.url, alt: m.alt } : null, seoTitle: src.seoTitle, seoDescription: src.seoDescription,
    },
  };
}
