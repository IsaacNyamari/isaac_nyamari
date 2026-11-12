import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { parseVariants } from "@/lib/media";
import { getEditableHomeSections, homeHasUnpublishedChanges } from "@/server/services/site";
import { HomeBuilder } from "./HomeBuilder";

export const metadata = { title: "Homepage" };

export default async function HomepageAdminPage() {
  const sections = await getEditableHomeSections();
  const imageIds = sections.flatMap((s) => [s.config.imageId, s.config.backgroundImageId]).filter((x): x is string => typeof x === "string");
  const [services, projects, posts, media, unpublished] = await Promise.all([
    db.service.findMany({ orderBy: { position: "asc" }, select: { id: true, title: true, status: true } }),
    db.project.findMany({ orderBy: { position: "asc" }, select: { id: true, title: true, status: true } }),
    db.post.findMany({ orderBy: { publishedAt: { sort: "desc", nulls: "last" } }, take: 100, select: { id: true, title: true, status: true } }),
    db.mediaAsset.findMany({ where: { id: { in: imageIds } }, select: { id: true, url: true, variants: true, alt: true } }),
    homeHasUnpublishedChanges(),
  ]);
  const images = Object.fromEntries(media.map((m) => [m.id, { id: m.id, url: parseVariants(m.variants)[1]?.url ?? m.url, alt: m.alt }]));
  return (
    <>
      <PageHeader
        title="Homepage"
        crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Pages", href: "/admin/pages" }, { label: "Homepage" }]}
        description="Edit, reorder and hide sections. Changes stay in a private draft until you publish."
      />
      <HomeBuilder initial={sections} images={images} services={services} projects={projects} posts={posts} unpublished={unpublished} />
    </>
  );
}
