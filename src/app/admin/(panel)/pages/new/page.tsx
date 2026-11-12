import { loadPageEditor } from "../load";
import { PageEditor } from "../PageEditor";

export const metadata = { title: "New page" };

export default async function NewPagePage() {
  const data = await loadPageEditor(null);
  return <PageEditor data={data!} />;
}
