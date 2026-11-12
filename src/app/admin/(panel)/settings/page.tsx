import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { emailStatus } from "@/lib/email";
import { maxUploadBytes, parseVariants } from "@/lib/media";
import { SOCIAL_KEYS } from "@/lib/validation";
import { SettingsForm, type SettingsData } from "./SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const s = await db.siteSettings.findUnique({ where: { id: "site" } });
  const imageIds = s ? [s.logoLightId, s.logoDarkId, s.faviconId, s.ogImageId, s.placeholderImageId].filter(Boolean) as string[] : [];
  const media = await db.mediaAsset.findMany({ where: { id: { in: imageIds } }, select: { id: true, url: true, alt: true, variants: true } });
  const img = (id: string | null | undefined) => {
    const m = media.find((x) => x.id === id);
    return m ? { id: m.id, url: parseVariants(m.variants)[0]?.url ?? m.url, alt: m.alt } : null;
  };
  const socials = (s?.socials ?? {}) as Record<string, string>;
  const data: SettingsData = {
    general: {
      siteName: s?.siteName ?? "Isaac Nyamari",
      tagline: s?.tagline ?? "",
      siteDescription: s?.siteDescription ?? "",
      siteUrl: s?.siteUrl ?? "",
      language: s?.language ?? "en",
      timezone: s?.timezone ?? "Africa/Nairobi",
    },
    contact: {
      email: s?.email ?? "",
      phone: s?.phone ?? "",
      whatsapp: s?.whatsapp ?? "",
      locationText: s?.locationText ?? "",
      contactCtaTitle: s?.contactCtaTitle ?? "",
      contactCtaText: s?.contactCtaText ?? "",
      notifyEmail: s?.notifyEmail ?? "",
      socials: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, typeof socials[k] === "string" ? socials[k] : ""])) as SettingsData["contact"]["socials"],
    },
    branding: {
      logoLight: img(s?.logoLightId),
      logoDark: img(s?.logoDarkId),
      favicon: img(s?.faviconId),
      placeholder: img(s?.placeholderImageId),
      primaryColor: s?.primaryColor ?? "",
      accentColor: s?.accentColor ?? "",
    },
    seo: { seoTitle: s?.seoTitle ?? "", seoDescription: s?.seoDescription ?? "", ogImage: img(s?.ogImageId), allowIndexing: s?.allowIndexing ?? true, keywords: s?.keywords ?? "", googleVerification: s?.googleVerification ?? "", bingVerification: s?.bingVerification ?? "", twitterHandle: s?.twitterHandle ?? "" },
    footer: { footerDescription: s?.footerDescription ?? "", copyrightText: s?.copyrightText ?? "", footerCtaText: s?.footerCtaText ?? "" },
  };
  const email = emailStatus();
  const integrations = {
    email: { driver: email.driver, configured: email.configured, from: email.from },
    storage: { driver: process.env.STORAGE_DRIVER ?? "local", maxMb: Math.round(maxUploadBytes() / 1048576) },
    scheduler: { cronSecret: Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 16), internal: process.env.INTERNAL_SCHEDULER === "true" },
  };
  return (
    <>
      <PageHeader title="Settings" crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Settings" }]} />
      <SettingsForm initial={data} integrations={integrations} initialTab={tab} />
    </>
  );
}
