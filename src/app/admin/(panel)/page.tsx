import Link from "next/link";
import { AlertTriangle, CalendarClock, FilePen, FolderKanban, Home, ImagePlus, Inbox, Newspaper, PenSquare, Wrench, Image as ImageIcon } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Overview" };

export default async function OverviewPage() {
  const [published, drafts, scheduled, projects, services, media, newInquiries, recentPosts, recentProjects, inquiries, settings, failedEmails] = await Promise.all([
    db.post.count({ where: { status: "PUBLISHED" } }),
    db.post.count({ where: { status: "DRAFT" } }),
    db.post.count({ where: { status: "SCHEDULED" } }),
    db.project.count(),
    db.service.count({ where: { status: "PUBLISHED" } }),
    db.mediaAsset.count(),
    db.contactInquiry.count({ where: { status: "NEW" } }),
    db.post.findMany({ orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, title: true, status: true, updatedAt: true, scheduledAt: true } }),
    db.project.findMany({ orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, title: true, status: true, updatedAt: true } }),
    db.contactInquiry.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, serviceLabel: true, createdAt: true, read: true, status: true } }),
    db.siteSettings.findUnique({ where: { id: "site" }, select: { email: true, phone: true, whatsapp: true } }),
    db.contactInquiry.count({ where: { emailStatus: "FAILED" } }),
  ]);

  const stats = [
    { label: "Published posts", value: published, href: "/admin/posts?status=PUBLISHED", icon: Newspaper },
    { label: "Draft posts", value: drafts, href: "/admin/posts?status=DRAFT", icon: FilePen },
    { label: "Scheduled posts", value: scheduled, href: "/admin/posts?status=SCHEDULED", icon: CalendarClock },
    { label: "Projects", value: projects, href: "/admin/projects", icon: FolderKanban },
    { label: "Published services", value: services, href: "/admin/services", icon: Wrench },
    { label: "Media files", value: media, href: "/admin/media", icon: ImageIcon },
    { label: "New inquiries", value: newInquiries, href: "/admin/inquiries?status=NEW", icon: Inbox, highlight: newInquiries > 0 },
  ];
  const missingContact = !settings || (!settings.email && !settings.phone && !settings.whatsapp);

  return (
    <>
      <PageHeader title="Overview" description="Content and activity across your website." />

      {missingContact && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            No public contact details are configured, so email, phone and WhatsApp links are hidden on the website.{" "}
            <Link href="/admin/settings?tab=contact" className="font-semibold underline">Add them in Settings</Link>.
          </p>
        </div>
      )}
      {failedEmails > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            {failedEmails} inquiry notification{failedEmails === 1 ? "" : "s"} failed to send. The inquiries are saved —{" "}
            <Link href="/admin/inquiries" className="font-semibold underline">review them</Link>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`admin-card group p-4 transition-shadow hover:shadow-md ${s.highlight ? "ring-2 ring-gold" : ""}`}>
            <s.icon className="h-4 w-4 text-[#8a92a6] group-hover:text-ink" aria-hidden="true" />
            <p className="mt-3 font-serif text-3xl font-semibold leading-none">{s.value}</p>
            <p className="mt-1.5 text-xs text-[#6b7385]">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/admin/posts/new", label: "Write a post", icon: PenSquare },
          { href: "/admin/projects/new", label: "Add a project", icon: FolderKanban },
          { href: "/admin/media", label: "Upload media", icon: ImagePlus },
          { href: "/admin/pages/homepage", label: "Edit homepage", icon: Home },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="flex items-center gap-3 rounded-xl border border-dashed border-[#cfd4de] bg-white px-4 py-3 text-sm font-medium transition-colors hover:border-ink">
            <q.icon className="h-4 w-4 text-gold-lo" aria-hidden="true" /> {q.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Widget title="Recent posts" href="/admin/posts" empty="No posts yet.">
          {recentPosts.map((p) => (
            <Row key={p.id} href={`/admin/posts/${p.id}`} title={p.title} meta={p.status === "SCHEDULED" && p.scheduledAt ? `Scheduled ${formatDateTime(p.scheduledAt)}` : `Updated ${formatDateTime(p.updatedAt)}`} status={p.status} />
          ))}
        </Widget>
        <Widget title="Recently updated projects" href="/admin/projects" empty="No projects yet.">
          {recentProjects.map((p) => (
            <Row key={p.id} href={`/admin/projects/${p.id}`} title={p.title} meta={`Updated ${formatDateTime(p.updatedAt)}`} status={p.status} />
          ))}
        </Widget>
        <Widget title="Latest inquiries" href="/admin/inquiries" empty="No inquiries yet.">
          {inquiries.map((i) => (
            <Row key={i.id} href={`/admin/inquiries/${i.id}`} title={`${i.read ? "" : "● "}${i.name}`} meta={`${i.serviceLabel || "General"} · ${formatDateTime(i.createdAt)}`} status={i.status} />
          ))}
        </Widget>
      </div>
    </>
  );
}

function Widget({ title, href, empty, children }: { title: string; href: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="admin-card">
      <div className="flex items-center justify-between border-b border-[#eef0f4] px-5 py-3.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Link href={href} className="text-xs font-medium text-[#6b7385] hover:text-ink">View all</Link>
      </div>
      {children.length ? <ul className="divide-y divide-[#eef0f4]">{children}</ul> : <p className="px-5 py-8 text-center text-sm text-[#6b7385]">{empty}</p>}
    </section>
  );
}

function Row({ href, title, meta, status }: { href: string; title: string; meta: string; status: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#f8f9fb]">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-[#6b7385]">{meta}</span>
        </span>
        <StatusBadge status={status} />
      </Link>
    </li>
  );
}
