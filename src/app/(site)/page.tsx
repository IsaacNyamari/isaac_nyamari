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
          "@graph": [
            { "@type": "WebSite", "@id": `${url}/#website`, url, name: s.siteName, description: s.siteDescription, inLanguage: s.language || "en", publisher: { "@id": `${url}/#person` } },
            { "@type": "WebPage", "@id": `${url}/#webpage`, url, name: s.seoTitle || s.siteName, isPartOf: { "@id": `${url}/#website` }, about: { "@id": `${url}/#person` }, primaryImageOfPage: s.ogImage ? s.ogImage.url : `${url}/opengraph-image` },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          "@id": `${url}/#person`,
          name: s.siteName,
          url,
          image: s.ogImage ? s.ogImage.url : `${url}/opengraph-image`,
          jobTitle: "Software Engineer",
          knowsAbout: ["Web development", "Software engineering", "SaaS", "APIs", "Business systems"],
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
