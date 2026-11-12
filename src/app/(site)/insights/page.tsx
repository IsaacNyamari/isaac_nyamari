import type { Metadata } from "next";
import { PageHero } from "@/components/site/ui";
import { parsePage, parseQuery, PostListing } from "@/components/site/PostListing";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ page?: string; q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const meta = await pageMetadata({
    title: "Insights",
    description: "Writing on software engineering, business systems, infrastructure and integrations.",
    path: "/insights",
    noindex: Boolean(sp.q),
  });
  return meta;
}

export default async function InsightsPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <>
      <PageHero image="insights"
        eyebrow="Insights"
        title="Notes on building software that works."
        description="Practical writing on software engineering, business systems, infrastructure and integrations."
      />
      <PostListing query={{ page: parsePage(sp.page), q: parseQuery(sp.q) }} basePath="/insights" showFeatured />
    </>
  );
}
