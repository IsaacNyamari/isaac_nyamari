import "server-only";
import type { Metadata } from "next";
import type { PublicImage } from "@/server/queries/common";
import { getSettings } from "@/server/queries/settings";
import { siteUrl } from "@/lib/utils";

export async function baseUrl() {
  const s = await getSettings();
  return (s.siteUrl || siteUrl()).replace(/\/$/, "");
}

type PageMetaInput = {
  title?: string;
  description?: string;
  path: string;
  image?: PublicImage | null;
  canonical?: string;
  type?: "website" | "article";
  publishedTime?: string | null;
  modifiedTime?: string | null;
  noindex?: boolean;
};

/** Page-level metadata with sensible fallbacks to the site's SEO settings. */
export async function pageMetadata(input: PageMetaInput): Promise<Metadata> {
  const s = await getSettings();
  const url = await baseUrl();
  const description = input.description || s.seoDescription || s.siteDescription;
  // Always emit an og:image: page image, then the site default, then the generated branded card.
  const image: PublicImage | null =
    input.image ?? s.ogImage ?? { id: "generated", url: `${url}/opengraph-image`, alt: s.siteName, width: 1200, height: 630 } as PublicImage;
  const canonical = input.canonical || `${url}${input.path === "/" ? "" : input.path}` || url;
  // An SEO title that already ends with the site name must not get the template suffix twice.
  const suffix = ` | ${s.siteName}`;
  const title = input.title && input.title.endsWith(suffix) ? { absolute: input.title } : input.title;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: input.type ?? "website",
      url: canonical,
      siteName: s.siteName,
      title: input.title ?? s.seoTitle ?? s.siteName,
      description,
      locale: s.language === "en" ? "en_KE" : s.language,
      ...(image ? { images: [{ url: absolute(url, image.url), width: image.width ?? undefined, height: image.height ?? undefined, alt: image.alt }] } : {}),
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      ...(s.twitterHandle ? { site: `@${s.twitterHandle}`, creator: `@${s.twitterHandle}` } : {}),
      title: input.title ?? s.seoTitle ?? s.siteName,
      description,
      ...(image ? { images: [absolute(url, image.url)] } : {}),
    },
    ...(input.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

export function absolute(base: string, path: string) {
  return /^https?:\/\//i.test(path) ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}
