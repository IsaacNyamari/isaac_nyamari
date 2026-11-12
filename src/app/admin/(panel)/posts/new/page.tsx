import { loadPostEditor } from "../load";
import { PostEditor } from "../PostEditor";

export const metadata = { title: "New post" };

export default async function NewPostPage() {
  const data = await loadPostEditor(null);
  return <PostEditor data={data!} />;
}
