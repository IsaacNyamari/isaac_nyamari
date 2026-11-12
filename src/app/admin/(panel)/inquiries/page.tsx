import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { AdminPagination, EmptyState, PageHeader, StatusBadge, Table, Td, Th } from "@/components/admin/ui";
import { formatDateTime, truncate } from "@/lib/utils";
import { listInquiries } from "@/server/services/inquiries";

export const metadata = { title: "Inquiries" };

const STATUS_TABS = [
  { value: "", label: "Open" },
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESPONDED", label: "Responded" },
  { value: "ARCHIVED", label: "Archived" },
];

type SP = { q?: string; status?: string; unread?: string; page?: string };

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 100) ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, totalPages } = await listInquiries({ q, status: sp.status, unread: sp.unread === "1", page });
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, status: sp.status, unread: sp.unread, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/inquiries${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Inquiries" crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Inquiries" }]} description="Messages from the contact form. Internal notes are never shown publicly." />
      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        {STATUS_TABS.map((t) => (
          <Link key={t.value} href={qs({ status: t.value || undefined, page: undefined })} aria-current={(sp.status ?? "") === t.value ? "page" : undefined} className={`rounded-lg px-3 py-1.5 ${(sp.status ?? "") === t.value ? "bg-ink text-white" : "bg-white ring-1 ring-[#e3e6ed] hover:ring-ink"}`}>
            {t.label}
          </Link>
        ))}
      </div>
      <form className="mb-4 flex flex-col gap-2 sm:flex-row" action="/admin/inquiries">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input name="q" defaultValue={q} placeholder="Search name, email, message, service" className="admin-input sm:max-w-sm" aria-label="Search inquiries" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="unread" value="1" defaultChecked={sp.unread === "1"} className="accent-[var(--ink)]" /> Unread only</label>
        <button className="h-[42px] rounded-lg bg-ink px-4 text-sm font-medium text-white">Apply</button>
      </form>

      {items.length === 0 ? (
        <EmptyState title="No inquiries found" text={q ? "Try a different search." : "New messages from the contact form will appear here."} />
      ) : (
        <Table>
          <thead><tr><Th>From</Th><Th>Service</Th><Th>Message</Th><Th>Received</Th><Th>Status</Th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className={`hover:bg-[#fafbfc] ${i.read ? "" : "bg-amber-50/40"}`}>
                <Td>
                  <Link href={`/admin/inquiries/${i.id}`} className={`hover:underline ${i.read ? "" : "font-semibold"}`}>{!i.read && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-gold" aria-label="Unread" />}{i.name}</Link>
                  <p className="text-xs text-[#6b7385]">{i.email}{i.phone ? ` · ${i.phone}` : ""}</p>
                </Td>
                <Td className="text-xs">{i.serviceLabel || "—"}{i.budget && <p className="text-[#6b7385]">{i.budget}</p>}</Td>
                <Td className="max-w-xs text-xs text-[#3a4258]">{truncate(i.message, 110)}</Td>
                <Td className="whitespace-nowrap text-xs text-[#6b7385]">{formatDateTime(i.createdAt)}</Td>
                <Td>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={i.status} />
                    {i.emailStatus === "FAILED" && <span className="inline-flex items-center gap-1 text-[0.68rem] text-danger"><AlertTriangle className="h-3 w-3" /> email failed</span>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <AdminPagination page={page} totalPages={totalPages} prevHref={qs({ page: String(page - 1) })} nextHref={qs({ page: String(page + 1) })} />
    </>
  );
}
