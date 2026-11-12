import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ManagedPage } from "@/components/site/ManagedPage";
import { isPreview } from "@/lib/preview";
import { pageMetadata } from "@/lib/seo";
import { getPagePreview, getPublishedPage } from "@/server/queries/pages";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("privacy");
  return pageMetadata({ title: page?.seoTitle || page?.title || "Privacy Policy", description: page?.seoDescription || page?.excerpt, path: "/privacy" });
}

export default async function PrivacyPage() {
  const page = (await isPreview()) ? await getPagePreview("privacy") : await getPublishedPage("privacy");
  if (!page) notFound();
  return <ManagedPage page={page} showUpdated />;
}
