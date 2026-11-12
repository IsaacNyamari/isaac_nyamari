import { notFound } from "next/navigation";
import { loadProjectEditor } from "../load";
import { ProjectEditor } from "../ProjectEditor";

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadProjectEditor(id);
  if (!data) notFound();
  return <ProjectEditor key={`${data.id}:${data.version}`} data={data} />;
}
