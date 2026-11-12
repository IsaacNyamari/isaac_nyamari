import { Plus } from "lucide-react";
import { OrderedList } from "@/components/admin/OrderedList";
import { ButtonLink, EmptyState, PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { parseVariants } from "@/lib/media";
import { reorderProjectsAction } from "./actions";
import { ProjectCategories } from "./ProjectCategories";

export const metadata = { title: "Projects" };

export default async function ProjectsAdminPage() {
  const [projects, categories] = await Promise.all([
    db.project.findMany({
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      select: {
        id: true, title: true, slug: true, status: true, featured: true, pendingChanges: true, technologies: true, updatedAt: true,
        coverImage: { select: { url: true, variants: true } },
        categories: { select: { name: true } },
      },
    }),
    db.projectCategory.findMany({ orderBy: { position: "asc" }, include: { _count: { select: { projects: true } } } }),
  ]);

  return (
    <>
      <PageHeader
        title="Projects"
        crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Projects" }]}
        description="Drag rows or use the arrows to set the order shown on the public portfolio."
        actions={<ButtonLink href="/admin/projects/new" variant="primary"><Plus className="h-4 w-4" /> New project</ButtonLink>}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {projects.length === 0 ? (
          <EmptyState title="No projects yet" text="Add case studies of your work. Nothing is published until you choose to." action={<ButtonLink href="/admin/projects/new" variant="primary">Add a project</ButtonLink>} />
        ) : (
          <OrderedList
            key={projects.map((p) => `${p.id}:${p.status}`).join()}
            editBase="/admin/projects"
            onSaveOrder={reorderProjectsAction}
            rows={projects.map((p) => ({
              id: p.id,
              title: p.title,
              subtitle: [p.categories.map((c) => c.name).join(", "), p.technologies.slice(0, 4).join(", ")].filter(Boolean).join(" · ") || `/projects/${p.slug}`,
              status: p.status,
              featured: p.featured,
              pending: p.pendingChanges !== null,
              thumb: p.coverImage ? parseVariants(p.coverImage.variants)[0]?.url ?? p.coverImage.url : null,
              previewPath: `/projects/${p.slug}`,
            }))}
          />
        )}
        <ProjectCategories items={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c._count.projects }))} />
      </div>
    </>
  );
}
