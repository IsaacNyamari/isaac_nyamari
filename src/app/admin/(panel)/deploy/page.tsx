import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/session";
import { getDeployInfo } from "@/server/services/deploy";
import { DeployPanel } from "./DeployPanel";

export const metadata = { title: "Deploy" };
export const dynamic = "force-dynamic";

export default async function DeployPage() {
  await requireAdmin("deploy:run");
  const info = await getDeployInfo();
  return (
    <>
      <PageHeader title="Deploy" description="Pull the latest code from GitHub, migrate the database, rebuild and restart the site." crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Deploy" }]} />
      <DeployPanel initial={info} />
    </>
  );
}
