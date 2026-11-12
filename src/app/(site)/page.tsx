import type { Metadata } from "next";
import { HomeSections } from "@/components/home/Sections";
import { JsonLd } from "@/components/site/ui";
import { isPreview } from "@/lib/preview";
import { baseUrl, pageMetadata } from "@/lib/seo";
import { getDraftHomeSections, getLiveHomeSections } from "@/server/queries/home";
import { getSettings } from "@/server/queries/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { ...(await pageMetadata({ path: "/" })), title: { absolute: s.seoTitle || s.siteName } };
}

export default async function HomePage() {
  const preview = await isPreview();
  const [sections, s, url] = await Promise.all([preview ? getDraftHomeSections() : getLiveHomeSections(), getSettings(), baseUrl()]);
  const sameAs = Object.values(s.socials).filter(Boolean);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: s.siteName,
          url,
          jobTitle: "Software Engineer",
          description: s.siteDescription,
          ...(s.locationText ? { address: { "@type": "PostalAddress", addressCountry: s.locationText } } : {}),
          ...(s.email ? { email: `mailto:${s.email}` } : {}),
          ...(sameAs.length ? { sameAs } : {}),
        }}
      />
      <HomeSections sections={sections} />
    </>
  );
}
