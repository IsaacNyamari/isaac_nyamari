import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Img } from "./Img";
import { Reveal } from "./Motion";
import { EmptyState, Pagination, PostCard } from "./ui";
import { cn, formatDate } from "@/lib/utils";
import { getPublicCategories, listPublishedPosts, type PostListQuery } from "@/server/queries/posts";

/** Shared article index used by /insights, category and tag archives. */
export async function PostListing({
  query,
  basePath,
  activeCategory,
  showFeatured,
}: {
  query: PostListQuery;
  basePath: string;
  activeCategory?: string;
  showFeatured?: boolean;
}) {
  const [{ items, page, totalPages, total }, categories] = await Promise.all([listPublishedPosts(query), getPublicCategories()]);
  const featured = showFeatured && page === 1 && !query.q ? items.find((p) => p.featured) : undefined;
  const rest = featured ? items.filter((p) => p.id !== featured.id) : items;
  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  return (
    <section className="section !pt-12">
      <div className="wrap">
        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Categories" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <CatLink href="/insights" label="All" active={!activeCategory} />
            {categories
              .filter((c) => c.count > 0)
              .map((c) => (
                <CatLink key={c.slug} href={`/insights/category/${c.slug}`} label={c.name} active={activeCategory === c.slug} />
              ))}
          </nav>
          <form action="/insights" method="get" role="search" className="relative w-full lg:w-80">
            <label htmlFor="post-search" className="sr-only">Search articles</label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              id="post-search"
              name="q"
              type="search"
              defaultValue={query.q ?? ""}
              placeholder="Search articles…"
              maxLength={100}
              className="h-12 w-full rounded-[10px] border border-line bg-card pl-10 pr-4 text-[0.95rem] outline-none transition focus:border-ink"
            />
          </form>
        </div>

        {query.q && (
          <p className="mb-8 text-muted" aria-live="polite">
            {total} result{total === 1 ? "" : "s"} for <strong className="text-ink">“{query.q}”</strong> ·{" "}
            <Link href={basePath} className="underline underline-offset-2">Clear search</Link>
          </p>
        )}

        {featured && (
          <Reveal className="mb-14">
            <Link href={`/insights/${featured.slug}`} className="card card-hover group grid overflow-hidden lg:grid-cols-[1.15fr_0.85fr]">
              <div className="img-zoom aspect-[16/10] bg-navy lg:aspect-auto lg:min-h-[380px]">
                {featured.cover ? <Img image={featured.cover} priority sizes="(min-width: 1024px) 640px, 100vw" /> : <div className="h-full min-h-[200px] bg-gradient-to-br from-navy-2 to-ink" />}
              </div>
              <div className="flex flex-col justify-center p-8 sm:p-10">
                <span className="eyebrow">Featured{featured.category ? ` · ${featured.category.name}` : ""}</span>
                <h2 className="h2 !text-[clamp(1.7rem,3vw,2.3rem)]">{featured.title}</h2>
                {featured.excerpt && <p className="mt-4 line-clamp-3 text-muted">{featured.excerpt}</p>}
                <p className="mt-6 text-sm text-muted">
                  {featured.publishedAt && <time dateTime={featured.publishedAt}>{formatDate(featured.publishedAt)}</time>} · {featured.readingMinutes} min read
                </p>
                <span className="link-arrow mt-6">Read article <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
              </div>
            </Link>
          </Reveal>
        )}

        {items.length === 0 ? (
          <EmptyState
            title={query.q ? "No articles match your search" : "No articles published yet"}
            text={query.q ? "Try different keywords." : "New writing is on the way."}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 0.07} className="h-full">
                <PostCard post={p} priority={!featured && i < 3} />
              </Reveal>
            ))}
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
      </div>
    </section>
  );
}

function CatLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 font-display text-[0.8rem] font-semibold tracking-wide transition-colors",
        active ? "border-ink bg-ink text-white" : "border-line bg-card text-muted hover:border-ink hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}

export function parsePage(value: string | string[] | undefined) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1;
}

export function parseQuery(value: string | string[] | undefined) {
  const v = (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 100);
  return v || undefined;
}
