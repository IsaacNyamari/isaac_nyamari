import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { TAGS } from "@/lib/cache";
import { asDoc, type RTNode } from "@/lib/rich-text/model";
import type { ProjectInput } from "@/lib/validation";
import { cached, imageSelect, iso, publishedWhere, toImage, type PublicImage } from "./common";

export type ProjectCard = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  cover: PublicImage | null;
  categories: { name: string; slug: string }[];
  technologies: string[];
  featured: boolean;
};

export type ProjectDetail = ProjectCard & {
  problem: string;
  solution: string;
  content: RTNode;
  role: string;
  clientName: string;
  startDate: string | null;
  endDate: string | null;
  externalUrl: string;
  repositoryUrl: string;
  gallery: (PublicImage & { galleryCaption: string })[];
  seoTitle: string;
  seoDescription: string;
  ogImage: PublicImage | null;
  updatedAt: string;
};

const cardInclude = {
  coverImage: { select: imageSelect },
  categories: { select: { name: true, slug: true }, orderBy: { position: "asc" } },
} satisfies Prisma.ProjectInclude;

type CardRow = Prisma.ProjectGetPayload<{ include: typeof cardInclude }>;

function toCard(p: CardRow): ProjectCard {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    summary: p.summary,
    cover: toImage(p.coverImage),
    categories: p.categories,
    technologies: p.technologies,
    featured: p.featured,
  };
}

const order: Prisma.ProjectOrderByWithRelationInput[] = [{ position: "asc" }, { publishedAt: "desc" }];

async function loadProjects(categorySlug?: string) {
  const rows = await db.project.findMany({
    where: { ...publishedWhere(), ...(categorySlug ? { categories: { some: { slug: categorySlug } } } : {}) },
    include: cardInclude,
    orderBy: order,
  });
  return rows.map(toCard);
}
export const listPublishedProjects = cached(loadProjects, "projects:list", [TAGS.projects, TAGS.media]);

async function loadFeaturedProjects(limit: number, ids: string[]) {
  const rows = await db.project.findMany({
    where: ids.length ? { ...publishedWhere(), id: { in: ids } } : { ...publishedWhere(), featured: true },
    include: cardInclude,
    orderBy: order,
    take: ids.length ? undefined : limit,
  });
  let cards = rows.map(toCard);
  if (ids.length) cards = ids.map((id) => cards.find((c) => c.id === id)).filter((c): c is ProjectCard => Boolean(c));
  if (!ids.length && cards.length < limit) {
    const more = await db.project.findMany({
      where: { ...publishedWhere(), id: { notIn: cards.map((c) => c.id) } },
      include: cardInclude,
      orderBy: order,
      take: limit - cards.length,
    });
    cards = [...cards, ...more.map(toCard)];
  }
  return cards;
}
export const getFeaturedProjects = cached(loadFeaturedProjects, "projects:featured", [TAGS.projects, TAGS.media]);

async function loadProjectCategories() {
  return db.projectCategory.findMany({
    where: { projects: { some: publishedWhere() } },
    orderBy: { position: "asc" },
    select: { name: true, slug: true },
  });
}
export const getPublicProjectCategories = cached(loadProjectCategories, "projects:categories", [TAGS.projects]);

const detailInclude = {
  ...cardInclude,
  ogImage: { select: imageSelect },
  gallery: { orderBy: { position: "asc" }, include: { media: { select: imageSelect } } },
} satisfies Prisma.ProjectInclude;

type DetailRow = Prisma.ProjectGetPayload<{ include: typeof detailInclude }>;

function toDetail(p: DetailRow): ProjectDetail {
  return {
    ...toCard(p),
    problem: p.problem,
    solution: p.solution,
    content: asDoc(p.content),
    role: p.role,
    clientName: p.clientName,
    startDate: iso(p.startDate),
    endDate: iso(p.endDate),
    externalUrl: p.externalUrl,
    repositoryUrl: p.repositoryUrl,
    gallery: p.gallery
      .map((g) => {
        const img = toImage(g.media);
        return img ? { ...img, galleryCaption: g.caption || img.caption } : null;
      })
      .filter((g): g is PublicImage & { galleryCaption: string } => Boolean(g)),
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    ogImage: toImage(p.ogImage),
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function loadProject(slug: string) {
  const p = await db.project.findFirst({ where: { slug, ...publishedWhere() }, include: detailInclude });
  return p ? toDetail(p) : null;
}
export const getPublishedProject = cached(loadProject, "projects:detail", [TAGS.projects, TAGS.media]);

export async function getProjectPreview(slug: string): Promise<ProjectDetail | null> {
  const p = await db.project.findUnique({ where: { slug }, include: detailInclude });
  if (!p) return null;
  const base = toDetail(p);
  const pending = p.pendingChanges as (Partial<ProjectInput> & { startDate?: string; endDate?: string }) | null;
  if (!pending) return base;
  const mediaIds = [pending.coverImageId, pending.ogImageId, ...(pending.gallery ?? []).map((g) => g.mediaId)].filter(Boolean) as string[];
  const [media, cats] = await Promise.all([
    db.mediaAsset.findMany({ where: { id: { in: mediaIds } }, select: imageSelect }),
    db.projectCategory.findMany({ where: { id: { in: pending.categoryIds ?? [] } }, select: { name: true, slug: true } }),
  ]);
  const find = (id?: string | null) => toImage(media.find((m) => m.id === id));
  return {
    ...base,
    title: pending.title ?? base.title,
    summary: pending.summary ?? base.summary,
    problem: pending.problem ?? base.problem,
    solution: pending.solution ?? base.solution,
    content: asDoc(pending.content ?? base.content),
    role: pending.role ?? base.role,
    clientName: pending.clientName ?? base.clientName,
    technologies: pending.technologies ?? base.technologies,
    externalUrl: pending.externalUrl ?? base.externalUrl,
    repositoryUrl: pending.repositoryUrl ?? base.repositoryUrl,
    startDate: pending.startDate ? String(pending.startDate) : null,
    endDate: pending.endDate ? String(pending.endDate) : null,
    cover: find(pending.coverImageId),
    ogImage: find(pending.ogImageId),
    categories: cats,
    gallery: (pending.gallery ?? [])
      .map((g) => {
        const img = find(g.mediaId);
        return img ? { ...img, galleryCaption: g.caption || img.caption } : null;
      })
      .filter((g): g is PublicImage & { galleryCaption: string } => Boolean(g)),
  };
}

export async function publishedProjectSlugs() {
  return db.project.findMany({ where: publishedWhere(), select: { slug: true, updatedAt: true } });
}
