import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AdminShell } from "@/components/admin/Shell";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/session";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Dashboard" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** Every dashboard page is rendered only after the session is validated against the database. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const unread = await db.contactInquiry.count({ where: { read: false, status: { not: "ARCHIVED" } } });
  return (
    <AdminShell user={{ name: admin.name, email: admin.email }} unread={unread}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </AdminShell>
  );
}
