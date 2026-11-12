import { Plus } from "lucide-react";
import { OrderedList } from "@/components/admin/OrderedList";
import { ButtonLink, EmptyState, PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { reorderServicesAction } from "./actions";

export const metadata = { title: "Services" };

export default async function ServicesAdminPage() {
  const services = await db.service.findMany({
    orderBy: [{ position: "asc" }, { title: "asc" }],
    select: { id: true, title: true, slug: true, status: true, featured: true, pendingChanges: true, summary: true },
  });
  return (
    <>
      <PageHeader
        title="Services"
        crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Services" }]}
        description="Order here is the order on the website. Unpublished services are hidden publicly."
        actions={<ButtonLink href="/admin/services/new" variant="primary"><Plus className="h-4 w-4" /> New service</ButtonLink>}
      />
      {services.length === 0 ? (
        <EmptyState title="No services" action={<ButtonLink href="/admin/services/new" variant="primary">Add a service</ButtonLink>} />
      ) : (
        <OrderedList
          key={services.map((s) => `${s.id}:${s.status}`).join()}
          editBase="/admin/services"
          onSaveOrder={reorderServicesAction}
          rows={services.map((s) => ({ id: s.id, title: s.title, subtitle: `/services/${s.slug}`, status: s.status, featured: s.featured, pending: s.pendingChanges !== null, previewPath: `/services/${s.slug}` }))}
        />
      )}
    </>
  );
}
