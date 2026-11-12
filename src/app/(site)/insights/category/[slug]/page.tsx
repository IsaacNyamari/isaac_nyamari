import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/site/ui";
import { parsePage, PostListing } from "@/components/site/PostListing";
import { pageMetadata } from "@/lib/seo";
import { getPublicCategories } from "@/server/queries/posts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

async function findCategory(slug: string) {
  return (await getPublicCategories()).find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await findCategory(slug);
  if (!c) return { title: "Not found", robots: { index: false } };
  return pageMetadata({ title: `${c.name} — Insights`, description: c.description || `Articles about ${c.name}.`, path: `/insights/category/${c.slug}` });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await findCategory(slug);
  if (!category) notFound();
  return (
    <>
      <PageHero image="insights" eyebrow="Category" title={category.name} description={category.description} />
      <PostListing query={{ page: parsePage(sp.page), categorySlug: slug }} basePath={`/insights/category/${slug}`} activeCategory={slug} />
    </>
  );
}
