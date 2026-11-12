import Link from "next/link";
import { Eye, Home, Lock, Plus } from "lucide-react";
import { ButtonLink, PageHeader, StatusBadge, Table, Td, Th } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Pages" };

export default async function PagesAdminPage() {
  const pages = await db.page.findMany({
    orderBy: [{ system: "desc" }, { title: "asc" }],
    select: { id: true, title: true, slug: true, status: true, system: true, showInNav: true, updatedAt: true, pendingChanges: true, template: true },
  });
  return (
    <>
      <PageHeader
        title="Pages"
        crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Pages" }]}
        description="About and Privacy are system pages: their addresses are fixed and they can't be deleted."
        actions={<ButtonLink href="/admin/pages/new" variant="primary"><Plus className="h-4 w-4" /> New page</ButtonLink>}
      />
      <Link href="/admin/pages/homepage" className="admin-card mb-4 flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-gold-hi"><Home className="h-5 w-5" /></span>
        <span>
          <span className="block font-medium">Homepage</span>
          <span className="block text-xs text-[#6b7385]">Edit hero, sections, order and visibility</span>
        </span>
      </Link>
      <Table>
        <thead><tr><Th>Title</Th><Th>Address</Th><Th>Status</Th><Th>Updated</Th><Th className="text-right">Actions</Th></tr></thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.id} className="hover:bg-[#fafbfc]">
              <Td>
                <Link href={`/admin/pages/${p.id}`} className="inline-flex items-center gap-1.5 font-medium hover:underline">
                  {p.system && <Lock className="h-3.5 w-3.5 text-[#9aa1b1]" aria-label="System page" />}
                  {p.title}
                </Link>
                {p.showInNav && <p className="text-xs text-[#6b7385]">In navigation</p>}
              </Td>
              <Td className="text-xs text-[#6b7385]">/{p.slug}</Td>
              <Td>
                <StatusBadge status={p.status} />
                {p.pendingChanges !== null && <span className="ml-1 text-[0.68rem] text-sky-700">unpublished edits</span>}
              </Td>
              <Td className="text-xs text-[#6b7385]">{formatDateTime(p.updatedAt)}</Td>
              <Td className="text-right">
                <div className="flex justify-end gap-1">
                  <a href={`/api/preview?path=/${p.slug}`} target="_blank" rel="noopener" className="rounded p-2 text-[#6b7385] hover:bg-[#eef0f4]" aria-label={`Preview ${p.title}`}><Eye className="h-4 w-4" /></a>
                  <ButtonLink href={`/admin/pages/${p.id}`} size="sm">Edit</ButtonLink>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
