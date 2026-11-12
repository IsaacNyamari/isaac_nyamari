import { notFound } from "next/navigation";
import { loadServiceEditor } from "../load";
import { ServiceEditor } from "../ServiceEditor";

export const metadata = { title: "Edit service" };

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadServiceEditor(id);
  if (!data) notFound();
  return <ServiceEditor key={`${data.id}:${data.version}`} data={data} />;
}
