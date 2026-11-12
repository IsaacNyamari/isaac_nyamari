import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { baseUrl } from "@/lib/seo";
import { publishedWhere } from "@/server/queries/common";
import { publishedPostSlugs } from "@/server/queries/posts";
import { publishedPageSlugs } from "@/server/queries/pages";
import { publishedProjectSlugs } from "@/server/queries/projects";
import { publishedServiceSlugs } from "@/server/queries/services";

export const dynamic = "force-dynamic";

/** Only published content is listed. Drafts, previews and admin routes never appear. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = await baseUrl();
  const [posts, projects, services, pages, categories, tags] = await Promise.all([
    publishedPostSlugs(),
    publishedProjectSlugs(),
    publishedServiceSlugs(),
    publishedPageSlugs(),
    db.category.findMany({ where: { posts: { some: publishedWhere() } }, select: { slug: true } }),
    db.tag.findMany({ where: { posts: { some: { post: publishedWhere() } } }, select: { slug: true } }),
  ]);
  const latest = posts[0]?.updatedAt ?? new Date();
  return [
    { url: `${url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${url}/services`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${url}/projects`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${url}/insights`, lastModified: latest, changeFrequency: "weekly", priority: 0.8 },
    { url: `${url}/contact`, changeFrequency: "yearly", priority: 0.6 },
    ...pages.map((p) => ({ url: `${url}/${p.slug}`, lastModified: p.updatedAt, priority: p.slug === "about" ? 0.8 : 0.4 })),
    ...services.map((s) => ({ url: `${url}/services/${s.slug}`, lastModified: s.updatedAt, priority: 0.7 })),
    ...projects.map((p) => ({ url: `${url}/projects/${p.slug}`, lastModified: p.updatedAt, priority: 0.7 })),
    ...posts.map((p) => ({ url: `${url}/insights/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
    ...categories.map((c) => ({ url: `${url}/insights/category/${c.slug}`, priority: 0.4 })),
    ...tags.map((t) => ({ url: `${url}/insights/tag/${t.slug}`, priority: 0.3 })),
  ];
}
