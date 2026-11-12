import { notFound } from "next/navigation";
import { loadPostEditor } from "../load";
import { PostEditor } from "../PostEditor";

export const metadata = { title: "Edit post" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadPostEditor(id);
  if (!data) notFound();
  // Keyed by version so the editor resets cleanly after restore/discard.
  return <PostEditor key={`${data.id}:${data.version}`} data={data} />;
}
