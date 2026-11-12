import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/site/ui";
import { parsePage, PostListing } from "@/components/site/PostListing";
import { pageMetadata } from "@/lib/seo";
import { getPublicTag } from "@/server/queries/posts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getPublicTag(slug);
  if (!tag) return { title: "Not found", robots: { index: false } };
  return pageMetadata({ title: `#${tag.name} — Insights`, description: `Articles tagged ${tag.name}.`, path: `/insights/tag/${tag.slug}` });
}

export default async function TagPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const tag = await getPublicTag(slug);
  if (!tag) notFound();
  return (
    <>
      <PageHero image="insights" eyebrow="Tag" title={`#${tag.name}`} />
      <PostListing query={{ page: parsePage(sp.page), tagSlug: slug }} basePath={`/insights/tag/${slug}`} />
    </>
  );
}
