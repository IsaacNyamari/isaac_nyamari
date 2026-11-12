import "server-only";
import { db } from "@/lib/db";
import { parseVariants } from "@/lib/media";
import { asDoc, EMPTY_DOC } from "@/lib/rich-text/model";
import type { ProjectEditorData } from "./ProjectEditor";

type Pending = {
  title: string; slug: string; summary: string; problem: string; solution: string; content: unknown; role: string; clientName: string;
  technologies: string[]; categoryIds: string[]; startDate: string | null; endDate: string | null; externalUrl: string; repositoryUrl: string;
  featured: boolean; coverImageId: string | null; ogImageId: string | null; gallery: { mediaId: string; caption: string }[];
  seoTitle: string; seoDescription: string;
};

export async function loadProjectEditor(id: string | null): Promise<ProjectEditorData | null> {
  const categories = await db.projectCategory.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } });
  if (!id) {
    return {
      id: null, version: 0, categories, state: { status: "DRAFT", hasPending: false },
      form: {
        title: "", slug: "", summary: "", problem: "", solution: "", content: EMPTY_DOC, role: "", clientName: "", technologies: [], categoryIds: [],
        startDate: "", endDate: "", externalUrl: "", repositoryUrl: "", featured: false, coverImage: null, ogImage: null, gallery: [], seoTitle: "", seoDescription: "",
      },
    };
  }
  const p = await db.project.findUnique({
    where: { id },
    include: { categories: { select: { id: true } }, gallery: { orderBy: { position: "asc" } }, lastEditedBy: { select: { name: true } } },
  });
  if (!p) return null;
  const pending = p.pendingChanges as Pending | null;
  const src: Pending = pending ?? {
    title: p.title, slug: p.slug, summary: p.summary, problem: p.problem, solution: p.solution, content: p.content, role: p.role, clientName: p.clientName,
    technologies: p.technologies, categoryIds: p.categories.map((c) => c.id), startDate: p.startDate?.toISOString() ?? null, endDate: p.endDate?.toISOString() ?? null,
    externalUrl: p.externalUrl, repositoryUrl: p.repositoryUrl, featured: p.featured, coverImageId: p.coverImageId, ogImageId: p.ogImageId,
    gallery: p.gallery.map((g) => ({ mediaId: g.mediaId, caption: g.caption })), seoTitle: p.seoTitle, seoDescription: p.seoDescription,
  };
  const mediaIds = [src.coverImageId, src.ogImageId, ...src.gallery.map((g) => g.mediaId)].filter(Boolean) as string[];
  const media = await db.mediaAsset.findMany({ where: { id: { in: mediaIds } }, select: { id: true, url: true, alt: true, variants: true } });
  const img = (mid: string | null) => {
    const m = media.find((x) => x.id === mid);
    return m ? { id: m.id, url: parseVariants(m.variants)[1]?.url ?? m.url, alt: m.alt } : null;
  };
  const day = (v: string | null) => (v ? String(v).slice(0, 10) : "");
  return {
    id: p.id,
    version: p.version,
    categories,
    state: { status: p.status, hasPending: pending !== null, publishedAt: p.publishedAt?.toISOString() ?? null, updatedAt: p.updatedAt.toISOString(), lastEditor: p.lastEditedBy?.name ?? null },
    form: {
      title: src.title, slug: src.slug, summary: src.summary, problem: src.problem, solution: src.solution, content: asDoc(src.content), role: src.role,
      clientName: src.clientName, technologies: src.technologies, categoryIds: src.categoryIds, startDate: day(src.startDate), endDate: day(src.endDate),
      externalUrl: src.externalUrl, repositoryUrl: src.repositoryUrl, featured: src.featured, coverImage: img(src.coverImageId), ogImage: img(src.ogImageId),
      gallery: src.gallery.map((g) => ({ ...img(g.mediaId)!, caption: g.caption })).filter((g) => g.id),
      seoTitle: src.seoTitle, seoDescription: src.seoDescription,
    },
  };
}
