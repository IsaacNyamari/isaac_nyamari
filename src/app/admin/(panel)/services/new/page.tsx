import { loadServiceEditor } from "../load";
import { ServiceEditor } from "../ServiceEditor";

export const metadata = { title: "New service" };

export default async function NewServicePage() {
  const data = await loadServiceEditor(null);
  return <ServiceEditor data={data!} />;
}
