import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/seo";
import { getSettings } from "@/server/queries/settings";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const [s, url] = await Promise.all([getSettings(), baseUrl()]);
  if (!s.allowIndexing) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/search"] },
    sitemap: `${url}/sitemap.xml`,
    host: url,
  };
}
