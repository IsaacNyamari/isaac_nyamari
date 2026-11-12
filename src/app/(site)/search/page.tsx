import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHero, PostCard, ProjectCard } from "@/components/site/ui";
import { parseQuery } from "@/components/site/PostListing";
import { listPublishedPosts } from "@/server/queries/posts";
import { listPublishedProjects } from "@/server/queries/projects";
import { listPublishedServices } from "@/server/queries/services";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const q = parseQuery((await searchParams).q);
  const needle = q?.toLowerCase() ?? "";
  const [posts, projects, services] = q
    ? await Promise.all([listPublishedPosts({ q, perPage: 6 }), listPublishedProjects(undefined), listPublishedServices()])
    : [null, [], []];
  const projectHits = projects.filter((p) => [p.title, p.summary, ...p.technologies].join(" ").toLowerCase().includes(needle));
  const serviceHits = services.filter((s) => [s.title, s.summary, ...s.deliverables].join(" ").toLowerCase().includes(needle));
  const total = (posts?.total ?? 0) + projectHits.length + serviceHits.length;

  return (
    <>
      <PageHero image="search" eyebrow="Search" title={q ? `Results for “${q}”` : "Search the site"}>
        <form action="/search" method="get" role="search" className="relative max-w-xl">
          <label htmlFor="site-search" className="sr-only">Search</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input id="site-search" name="q" type="search" defaultValue={q} maxLength={100} placeholder="Services, projects, articles…" className="h-14 w-full rounded-xl border-0 bg-white pl-12 pr-4 text-ink outline-none ring-gold focus:ring-4" />
        </form>
      </PageHero>
      {q && (
        <section className="section">
          <div className="wrap space-y-16">
            <p className="text-muted" aria-live="polite">{total} result{total === 1 ? "" : "s"}</p>
            {serviceHits.length > 0 && (
              <div>
                <h2 className="h3 mb-6">Services</h2>
                <ul className="divide-y divide-line border-y border-line">
                  {serviceHits.map((s) => (
                    <li key={s.id} className="py-4">
                      <Link href={`/services/${s.slug}`} className="font-serif text-xl font-semibold hover:text-navy-2">{s.title}</Link>
                      <p className="mt-1 text-muted">{s.summary}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {projectHits.length > 0 && (
              <div>
                <h2 className="h3 mb-6">Projects</h2>
                <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                  {projectHits.slice(0, 6).map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>
              </div>
            )}
            {posts && posts.items.length > 0 && (
              <div>
                <div className="mb-6 flex items-end justify-between">
                  <h2 className="h3">Articles</h2>
                  {posts.total > posts.items.length && <Link href={`/insights?q=${encodeURIComponent(q)}`} className="link-arrow">All {posts.total} articles</Link>}
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.items.map((p) => <PostCard key={p.id} post={p} />)}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
