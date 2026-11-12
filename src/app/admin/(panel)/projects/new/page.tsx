import { loadProjectEditor } from "../load";
import { ProjectEditor } from "../ProjectEditor";

export const metadata = { title: "New project" };

export default async function NewProjectPage() {
  const data = await loadProjectEditor(null);
  return <ProjectEditor data={data!} />;
}
