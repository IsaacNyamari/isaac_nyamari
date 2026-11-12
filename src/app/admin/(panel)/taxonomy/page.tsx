import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { TaxonomyManager } from "./TaxonomyManager";

export const metadata = { title: "Categories & tags" };

export default async function TaxonomyPage() {
  const [categories, tags] = await Promise.all([
    db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, description: true, _count: { select: { posts: true } } },
    }),
    db.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, _count: { select: { posts: true } } } }),
  ]);
  return (
    <>
      <PageHeader title="Categories & tags" crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Categories & tags" }]} description="Items that are still assigned to posts cannot be deleted, so public pages never break silently." />
      <TaxonomyManager
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, count: c._count.posts }))}
        tags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug, description: "", count: t._count.posts }))}
      />
    </>
  );
}
