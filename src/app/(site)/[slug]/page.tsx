import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ManagedPage } from "@/components/site/ManagedPage";
import { isPreview } from "@/lib/preview";
import { redirectIfMoved } from "@/lib/redirects";
import { pageMetadata } from "@/lib/seo";
import { RESERVED_PAGE_SLUGS, SLUG_PATTERN } from "@/lib/slug";
import { getPagePreview, getPublishedPage } from "@/server/queries/pages";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

function isManagedSlug(slug: string) {
  return SLUG_PATTERN.test(slug) && !RESERVED_PAGE_SLUGS.has(slug);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const page = isManagedSlug(slug) ? await getPublishedPage(slug) : null;
  if (!page) return { title: "Not found", robots: { index: false } };
  return pageMetadata({ title: page.seoTitle || page.title, description: page.seoDescription || page.excerpt, path: `/${page.slug}`, image: page.featuredImage });
}

/** Additional informational pages created in Admin → Pages. */
export default async function ManagedContentPage({ params }: Params) {
  const { slug } = await params;
  if (!isManagedSlug(slug)) notFound();
  const page = (await isPreview()) ? await getPagePreview(slug) : await getPublishedPage(slug);
  if (!page) {
    await redirectIfMoved(`/${slug}`);
    notFound();
  }
  return <ManagedPage page={page} />;
}
