import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { TAGS } from "@/lib/cache";
import { asDoc, type RTNode } from "@/lib/rich-text/model";
import type { ServiceInput } from "@/lib/validation";
import { cached, imageSelect, publishedWhere, toImage, type PublicImage } from "./common";

export type ServiceCard = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  icon: string;
  image: PublicImage | null;
  deliverables: string[];
  ctaLabel: string;
  featured: boolean;
};

export type ServiceDetail = ServiceCard & { content: RTNode; seoTitle: string; seoDescription: string; updatedAt: string };

const include = { image: { select: imageSelect } } satisfies Prisma.ServiceInclude;
type Row = Prisma.ServiceGetPayload<{ include: typeof include }>;

function toCard(s: Row): ServiceCard {
  return {
    id: s.id,
    title: s.title,
    slug: s.slug,
    summary: s.summary,
    icon: s.icon,
    image: toImage(s.image),
    deliverables: s.deliverables,
    ctaLabel: s.ctaLabel,
    featured: s.featured,
  };
}

function toDetail(s: Row): ServiceDetail {
  return { ...toCard(s), content: asDoc(s.content), seoTitle: s.seoTitle, seoDescription: s.seoDescription, updatedAt: s.updatedAt.toISOString() };
}

async function loadServices() {
  const rows = await db.service.findMany({ where: publishedWhere(), include, orderBy: [{ position: "asc" }, { title: "asc" }] });
  return rows.map(toCard);
}
export const listPublishedServices = cached(loadServices, "services:list", [TAGS.services, TAGS.media]);

async function loadService(slug: string) {
  const s = await db.service.findFirst({ where: { slug, ...publishedWhere() }, include });
  return s ? toDetail(s) : null;
}
export const getPublishedService = cached(loadService, "services:detail", [TAGS.services, TAGS.media]);

export async function getServicePreview(slug: string): Promise<ServiceDetail | null> {
  const s = await db.service.findUnique({ where: { slug }, include });
  if (!s) return null;
  const base = toDetail(s);
  const pending = s.pendingChanges as Partial<ServiceInput> | null;
  if (!pending) return base;
  const image = pending.imageId ? await db.mediaAsset.findUnique({ where: { id: pending.imageId }, select: imageSelect }) : null;
  return {
    ...base,
    title: pending.title ?? base.title,
    summary: pending.summary ?? base.summary,
    content: asDoc(pending.content ?? base.content),
    icon: pending.icon ?? base.icon,
    deliverables: pending.deliverables ?? base.deliverables,
    ctaLabel: pending.ctaLabel ?? base.ctaLabel,
    image: toImage(image),
  };
}

export async function publishedServiceSlugs() {
  return db.service.findMany({ where: publishedWhere(), select: { slug: true, updatedAt: true } });
}
