import type { Metadata } from "next";
import Link from "next/link";
import { HeaderBackdrop } from "@/components/site/HeaderImage";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { Img } from "@/components/site/Img";
import { Reveal } from "@/components/site/Motion";
import { ShareLinks } from "@/components/site/ShareLinks";
import { JsonLd, PostCard } from "@/components/site/ui";
import { ViewTracker } from "@/components/site/ViewTracker";
import { Monogram } from "@/components/site/Logo";
import { isPreview } from "@/lib/preview";
import { redirectIfMoved } from "@/lib/redirects";
import { extractToc } from "@/lib/rich-text/model";
import { RichText } from "@/lib/rich-text/render";
import { absolute, baseUrl, pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import { getPostPreview, getPublishedPost, getRelatedPosts } from "@/server/queries/posts";
import { getSettings } from "@/server/queries/settings";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Not found", robots: { index: false } };
  return pageMetadata({
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    path: `/insights/${post.slug}`,
    canonical: post.canonicalUrl || undefined,
    image: post.ogImage ?? post.cover,
    type: "article",
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
  });
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const preview = await isPreview();
  const post = preview ? await getPostPreview(slug) : await getPublishedPost(slug);
  if (!post) {
    await redirectIfMoved(`/insights/${slug}`);
    notFound();
  }
  const [related, settings, url] = await Promise.all([
    getRelatedPosts(post.id, post.relatedIds, post.categoryId, post.tagIds),
    getSettings(),
    baseUrl(),
  ]);
  const toc = post.showToc ? extractToc(post.content) : [];
  const articleUrl = `${url}/insights/${post.slug}`;
  const author = post.authorName || settings.siteName;

  return (
    <>
      {!preview && <ViewTracker postId={post.id} />}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          url: articleUrl,
          mainEntityOfPage: articleUrl,
          datePublished: post.publishedAt ?? undefined,
          dateModified: post.updatedAt,
          author: { "@type": "Person", name: author, url },
          publisher: { "@type": "Person", name: settings.siteName },
          ...(post.cover ? { image: absolute(url, post.cover.url) } : {}),
          ...(post.tags.length ? { keywords: post.tags.map((t) => t.name).join(", ") } : {}),
        }}
      />
      <article>
        <header className="on-dark relative overflow-hidden">
          <HeaderBackdrop image="insights" />
          <div className="wrap relative max-w-[860px] pb-14 pt-[clamp(48px,7vw,88px)]">
            <Link href="/insights" className="rise mb-8 inline-flex items-center gap-2 text-sm text-mist hover:text-white">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All insights
            </Link>
            {post.category && (
              <Link href={`/insights/category/${post.category.slug}`} className="eyebrow rise hover:text-white">
                {post.category.name}
              </Link>
            )}
            <h1 className="h1 rise" style={{ ["--d" as string]: "0.05s" }}>{post.title}</h1>
            {post.excerpt && <p className="lead rise mt-6 !max-w-none" style={{ ["--d" as string]: "0.12s" }}>{post.excerpt}</p>}
            <div className="rise mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-mist" style={{ ["--d" as string]: "0.18s" }}>
              <span className="flex items-center gap-3">
                <Monogram className="h-9 w-9" tone="dark" />
                <span>
                  <span className="block font-semibold text-white">{author}</span>
                  {post.publishedAt ? <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> : <span>Not yet published</span>}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" /> {post.readingMinutes} min read
              </span>
            </div>
          </div>
        </header>

        {post.cover && (
          <div className="bg-gradient-to-b from-ink from-50% to-paper to-50%">
            <div className="wrap max-w-[1040px]">
              <figure className="rise overflow-hidden rounded-[20px]" style={{ ["--d" as string]: "0.2s" }}>
                <div className="aspect-[16/9]">
                  <Img image={post.cover} priority sizes="(min-width: 1040px) 992px, 100vw" />
                </div>
              </figure>
            </div>
          </div>
        )}

        <div className="wrap section !pt-14">
          <div className={toc.length ? "mx-auto grid max-w-[1040px] gap-12 lg:grid-cols-[minmax(0,1fr)_220px]" : "mx-auto max-w-[760px]"}>
            <div className="min-w-0">
              {toc.length > 0 && (
                <details className="card mb-10 p-5 lg:hidden">
                  <summary className="cursor-pointer font-display text-sm font-semibold">On this page</summary>
                  <TocList toc={toc} />
                </details>
              )}
              <RichText doc={post.content} />
              <footer className="mt-14 flex flex-col gap-6 border-t border-line pt-8">
                {post.tags.length > 0 && (
                  <ul className="flex flex-wrap gap-2" aria-label="Tags">
                    {post.tags.map((t) => (
                      <li key={t.slug}>
                        <Link href={`/insights/tag/${t.slug}`} className="chip hover:border-ink hover:text-ink">#{t.name}</Link>
                      </li>
                    ))}
                  </ul>
                )}
                <ShareLinks url={articleUrl} title={post.title} />
              </footer>
            </div>
            {toc.length > 0 && (
              <aside className="hidden lg:block">
                <nav aria-label="Table of contents" className="sticky top-28">
                  <p className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">On this page</p>
                  <TocList toc={toc} />
                </nav>
              </aside>
            )}
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="section on-paper-2">
          <div className="wrap">
            <h2 className="h2">Related reading</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.07} className="h-full">
                  <PostCard post={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function TocList({ toc }: { toc: { id: string; text: string; level: number }[] }) {
  return (
    <ol className="mt-3 space-y-2 border-l border-line text-[0.9rem]">
      {toc.map((t) => (
        <li key={t.id} className={t.level === 3 ? "pl-7" : "pl-4"}>
          <a href={`#${t.id}`} className="text-muted transition-colors hover:text-ink">{t.text}</a>
        </li>
      ))}
    </ol>
  );
}
