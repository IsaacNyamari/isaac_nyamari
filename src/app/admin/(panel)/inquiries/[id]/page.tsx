import { notFound } from "next/navigation";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Card, PageHeader, StatusBadge } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatDateTime, phoneDigits, whatsappLink } from "@/lib/utils";
import { InquiryControls } from "./InquiryControls";

export const metadata = { title: "Inquiry" };

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let inquiry = await db.contactInquiry.findUnique({
    where: { id },
    include: { notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } }, service: { select: { slug: true } } },
  });
  if (!inquiry) notFound();
  if (!inquiry.read) {
    // Opening an inquiry marks it as read (it can be marked unread again below).
    await db.contactInquiry.update({ where: { id }, data: { read: true } });
    inquiry = { ...inquiry, read: true };
  }
  const subject = encodeURIComponent(`Re: your project inquiry${inquiry.serviceLabel ? ` (${inquiry.serviceLabel})` : ""}`);

  return (
    <>
      <PageHeader title={inquiry.name} crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Inquiries", href: "/admin/inquiries" }, { label: inquiry.name }]} description={`Received ${formatDateTime(inquiry.createdAt)}`} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card title="Message">
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-[#1f2638]">{inquiry.message}</p>
          </Card>
          <InquiryControls
            id={inquiry.id}
            status={inquiry.status}
            read={inquiry.read}
            emailStatus={inquiry.emailStatus}
            emailError={inquiry.emailError}
            notes={inquiry.notes.map((n) => ({ id: n.id, body: n.body, author: n.author?.name ?? "Admin", createdAt: n.createdAt.toISOString() }))}
          />
        </div>
        <div className="space-y-6">
          <Card title="Contact">
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-[#6b7385]">Email</dt><dd className="break-all">{inquiry.email}</dd></div>
              {inquiry.phone && <div><dt className="text-xs text-[#6b7385]">Phone</dt><dd>{inquiry.phone}</dd></div>}
              <div><dt className="text-xs text-[#6b7385]">Service</dt><dd>{inquiry.serviceLabel || "Not specified"}</dd></div>
              <div><dt className="text-xs text-[#6b7385]">Budget</dt><dd>{inquiry.budget || "Not specified"}</dd></div>
              <div><dt className="text-xs text-[#6b7385]">Consent given</dt><dd>{inquiry.consent ? "Yes" : "No"}</dd></div>
              <div><dt className="text-xs text-[#6b7385]">Status</dt><dd><StatusBadge status={inquiry.status} /></dd></div>
            </dl>
            <div className="mt-4 flex flex-col gap-2">
              <a href={`mailto:${inquiry.email}?subject=${subject}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-ink text-sm font-medium text-white hover:bg-navy-2"><Mail className="h-4 w-4" /> Reply by email</a>
              {inquiry.phone && phoneDigits(inquiry.phone) && (
                <>
                  <a href={`tel:${phoneDigits(inquiry.phone)}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d5d9e2] bg-white text-sm font-medium hover:border-ink"><Phone className="h-4 w-4" /> Call</a>
                  <a href={whatsappLink(inquiry.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d5d9e2] bg-white text-sm font-medium hover:border-ink"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
