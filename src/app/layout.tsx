import type { Metadata, Viewport } from "next";
import { Inter, Montserrat, Newsreader } from "next/font/google";
import { connection } from "next/server";
import { getSettings } from "@/server/queries/settings";
import { siteUrl } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", weight: ["500", "600"], style: ["normal", "italic"], display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["500", "600", "800"], display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const s = await getSettings();
  const base = (s.siteUrl || siteUrl()).replace(/\/$/, "");
  const title = s.seoTitle || s.siteName;
  return {
    metadataBase: new URL(base),
    title: { default: title, template: `%s | ${s.siteName}` },
    description: s.seoDescription || s.siteDescription,
    applicationName: s.siteName,
    ...(s.keywords.length ? { keywords: s.keywords } : {}),
    authors: [{ name: s.siteName }],
    robots: s.allowIndexing
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
      : { index: false, follow: false },
    verification: {
      ...(s.googleVerification ? { google: s.googleVerification } : {}),
      ...(s.bingVerification ? { other: { "msvalidate.01": s.bingVerification } } : {}),
    },
    openGraph: { type: "website", siteName: s.siteName, locale: s.language === "en" ? "en_KE" : s.language, images: [{ url: s.ogImage?.url ?? "/opengraph-image", width: 1200, height: 630, alt: s.siteName }] },
    twitter: { card: "summary_large_image", ...(s.twitterHandle ? { site: `@${s.twitterHandle}`, creator: `@${s.twitterHandle}` } : {}) },
    icons: s.favicon
      ? { icon: s.favicon.url, apple: s.favicon.url }
      : {
          icon: [
            { url: "/brand/logo-mark-32.png", sizes: "32x32", type: "image/png" },
            { url: "/brand/logo-mark-192.png", sizes: "192x192", type: "image/png" },
          ],
          apple: { url: "/brand/logo-mark-180.png", sizes: "180x180" },
        },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b1222",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // All content is database-driven, so render at request time (data itself is cached and tag-invalidated).
  await connection();
  const s = await getSettings();
  return (
    <html lang={s.language || "en"} suppressHydrationWarning className={`${inter.variable} ${newsreader.variable} ${montserrat.variable}`}>
      <body>
        {/* Marks JS as available so scroll-reveal styles only apply when they can be undone. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {children}
      </body>
    </html>
  );
}
