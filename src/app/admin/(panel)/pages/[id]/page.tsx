import { notFound } from "next/navigation";
import { loadPageEditor } from "../load";
import { PageEditor } from "../PageEditor";

export const metadata = { title: "Edit page" };

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadPageEditor(id);
  if (!data) notFound();
  return <PageEditor key={`${data.id}:${data.version}`} data={data} />;
}
