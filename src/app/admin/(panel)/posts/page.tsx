import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { AdminPagination, ButtonLink, EmptyState, PageHeader, StatusBadge, Table, Td, Th } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { parseVariants } from "@/lib/media";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Posts" };

const PER_PAGE = 20;
const SORTS: Record<string, Prisma.PostOrderByWithRelationInput> = {
  updated: { updatedAt: "desc" },
  created: { createdAt: "desc" },
  published: { publishedAt: { sort: "desc", nulls: "last" } },
  title: { title: "asc" },
  views: { viewCount: "desc" },
};
const STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;

type SP = { q?: string; status?: string; category?: string; sort?: string; page?: string };

export default async function PostsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 100) ?? "";
  const status = STATUSES.find((s) => s === sp.status);
  const sort = sp.sort && SORTS[sp.sort] ? sp.sort : "updated";
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.PostWhereInput = {
    ...(status ? { status } : {}),
    ...(sp.category ? { categoryId: sp.category } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }, { excerpt: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [posts, total, categories, counts] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: SORTS[sort],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, title: true, slug: true, status: true, createdAt: true, updatedAt: true, scheduledAt: true, publishedAt: true, viewCount: true,
        pendingChanges: true, featured: true,
        author: { select: { name: true } },
        category: { select: { name: true } },
        coverImage: { select: { url: true, variants: true, alt: true } },
      },
    }),
    db.post.count({ where }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.post.groupBy({ by: ["status"], _count: true }),
  ]);
  const countFor = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { q, status, category: sp.category, sort, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "sort" && v === "updated")) p.set(k, String(v));
    const s = p.toString();
    return `/admin/posts${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Posts"
        crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Posts" }]}
        actions={<ButtonLink href="/admin/posts/new" variant="primary"><Plus className="h-4 w-4" /> New post</ButtonLink>}
      />
      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        <FilterTab href={qs({ status: undefined, page: undefined })} active={!status} label={`All (${counts.reduce((a, c) => a + c._count, 0)})`} />
        {STATUSES.map((s) => (
          <FilterTab key={s} href={qs({ status: s, page: undefined })} active={status === s} label={`${s[0] + s.slice(1).toLowerCase()} (${countFor(s)})`} />
        ))}
      </div>
      <form className="mb-4 flex flex-col gap-2 sm:flex-row" action="/admin/posts">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="Search title, slug or excerpt" className="admin-input sm:max-w-xs" aria-label="Search posts" />
        <select name="category" defaultValue={sp.category ?? ""} className="admin-input sm:w-48" aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="sort" defaultValue={sort} className="admin-input sm:w-44" aria-label="Sort by">
          <option value="updated">Last updated</option>
          <option value="created">Newest</option>
          <option value="published">Publish date</option>
          <option value="title">Title A–Z</option>
          <option value="views">Most viewed</option>
        </select>
        <button className="h-[42px] rounded-lg bg-ink px-4 text-sm font-medium text-white">Apply</button>
      </form>

      {posts.length === 0 ? (
        <EmptyState title={q || status ? "No posts match these filters" : "No posts yet"} action={<ButtonLink href="/admin/posts/new" variant="primary">Write your first post</ButtonLink>} />
      ) : (
        <Table>
          <thead>
            <tr><Th className="w-16" /><Th>Title</Th><Th>Category</Th><Th>Status</Th><Th>Dates</Th><Th className="text-right">Views</Th><Th className="text-right">Actions</Th></tr>
          </thead>
          <tbody>
            {posts.map((p) => {
              const thumb = p.coverImage ? parseVariants(p.coverImage.variants)[0]?.url ?? p.coverImage.url : null;
              return (
                <tr key={p.id} className="hover:bg-[#fafbfc]">
                  <Td>
                    <div className="h-10 w-14 overflow-hidden rounded bg-[#eef0f4]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
                    </div>
                  </Td>
                  <Td>
                    <Link href={`/admin/posts/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                    <p className="text-xs text-[#6b7385]">/{p.slug} · {p.author?.name ?? "—"}{p.featured ? " · ★ featured" : ""}</p>
                  </Td>
                  <Td className="text-[#3a4258]">{p.category?.name ?? "—"}</Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={p.status} />
                      {p.pendingChanges !== null && <span className="text-[0.68rem] text-sky-700">unpublished edits</span>}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-[#6b7385]">
                    <div>Created {formatDateTime(p.createdAt)}</div>
                    {p.status === "SCHEDULED" && p.scheduledAt && <div className="text-sky-700">Goes live {formatDateTime(p.scheduledAt)}</div>}
                    <div>Updated {formatDateTime(p.updatedAt)}</div>
                  </Td>
                  <Td className="text-right tabular-nums">{p.viewCount}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <a href={`/api/preview?path=/insights/${p.slug}`} target="_blank" rel="noopener" className="rounded p-2 text-[#6b7385] hover:bg-[#eef0f4] hover:text-ink" title="Preview" aria-label={`Preview ${p.title}`}><Eye className="h-4 w-4" /></a>
                      <ButtonLink href={`/admin/posts/${p.id}`} size="sm">Edit</ButtonLink>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <AdminPagination page={page} totalPages={Math.max(1, Math.ceil(total / PER_PAGE))} prevHref={qs({ page: String(page - 1) })} nextHref={qs({ page: String(page + 1) })} />
    </>
  );
}

function FilterTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`rounded-lg px-3 py-1.5 ${active ? "bg-ink text-white" : "bg-white text-[#3a4258] ring-1 ring-[#e3e6ed] hover:ring-ink"}`}>
      {label}
    </Link>
  );
}
