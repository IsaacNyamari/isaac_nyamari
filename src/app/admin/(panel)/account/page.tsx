import { Card, PageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const admin = await requireAdminPage();
  return (
    <>
      <PageHeader title="Account" crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Account" }]} />
      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <Card title="Signed in as">
          <dl className="space-y-2 text-sm">
            <div><dt className="text-xs text-[#6b7385]">Name</dt><dd>{admin.name}</dd></div>
            <div><dt className="text-xs text-[#6b7385]">Email</dt><dd>{admin.email}</dd></div>
            <div><dt className="text-xs text-[#6b7385]">Role</dt><dd>{admin.role.toLowerCase()}</dd></div>
          </dl>
          <p className="admin-help mt-4">Forgotten password? An administrator with server access can run <code>npm run admin:reset-password</code> (see README).</p>
        </Card>
        <ChangePasswordForm />
      </div>
    </>
  );
}
