import "server-only";
import { db } from "@/lib/db";
import { TAGS } from "@/lib/cache";
import { SOCIAL_KEYS, type Socials } from "@/lib/validation";
import { cached, imageSelect, toImage, type PublicImage } from "./common";

export type PublicSettings = {
  siteName: string;
  tagline: string;
  siteDescription: string;
  siteUrl: string;
  language: string;
  timezone: string;
  seoTitle: string;
  seoDescription: string;
  allowIndexing: boolean;
  keywords: string[];
  googleVerification: string;
  bingVerification: string;
  twitterHandle: string;
  email: string;
  phone: string;
  whatsapp: string;
  locationText: string;
  socials: Partial<Socials>;
  contactCtaTitle: string;
  contactCtaText: string;
  footerDescription: string;
  copyrightText: string;
  footerCtaText: string;
  primaryColor: string;
  accentColor: string;
  logoLight: PublicImage | null;
  logoDark: PublicImage | null;
  favicon: PublicImage | null;
  ogImage: PublicImage | null;
  placeholder: PublicImage | null;
};

export const DEFAULT_SETTINGS: PublicSettings = {
  siteName: "Isaac Nyamari",
  tagline: "Software Engineer · Full-Stack Developer · Systems Builder",
  siteDescription: "",
  siteUrl: "",
  language: "en",
  timezone: "Africa/Nairobi",
  seoTitle: "",
  seoDescription: "",
  allowIndexing: true,
  keywords: [],
  googleVerification: "",
  bingVerification: "",
  twitterHandle: "",
  email: "",
  phone: "",
  whatsapp: "",
  locationText: "Kenya",
  socials: {},
  contactCtaTitle: "",
  contactCtaText: "",
  footerDescription: "",
  copyrightText: "",
  footerCtaText: "",
  primaryColor: "",
  accentColor: "",
  logoLight: null,
  logoDark: null,
  favicon: null,
  ogImage: null,
  placeholder: null,
};

async function loadSettings(): Promise<PublicSettings> {
  const s = await db.siteSettings.findUnique({ where: { id: "site" } });
  if (!s) return DEFAULT_SETTINGS;
  const ids = [s.logoLightId, s.logoDarkId, s.faviconId, s.ogImageId, s.placeholderImageId].filter(Boolean) as string[];
  const media = ids.length ? await db.mediaAsset.findMany({ where: { id: { in: ids } }, select: imageSelect }) : [];
  const img = (mid: string | null) => toImage(media.find((m) => m.id === mid));
  const rawSocials = (s.socials ?? {}) as Record<string, unknown>;
  const socials: Partial<Socials> = {};
  for (const key of SOCIAL_KEYS) {
    const v = rawSocials[key];
    if (typeof v === "string" && /^https?:\/\//i.test(v)) socials[key] = v;
  }
  return {
    siteName: s.siteName,
    tagline: s.tagline,
    siteDescription: s.siteDescription,
    siteUrl: s.siteUrl,
    language: s.language,
    timezone: s.timezone,
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    allowIndexing: s.allowIndexing,
    keywords: s.keywords.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 30),
    googleVerification: s.googleVerification,
    bingVerification: s.bingVerification,
    twitterHandle: s.twitterHandle,
    email: s.email,
    phone: s.phone,
    whatsapp: s.whatsapp,
    locationText: s.locationText,
    socials,
    contactCtaTitle: s.contactCtaTitle,
    contactCtaText: s.contactCtaText,
    footerDescription: s.footerDescription,
    copyrightText: s.copyrightText,
    footerCtaText: s.footerCtaText,
    primaryColor: s.primaryColor,
    accentColor: s.accentColor,
    logoLight: img(s.logoLightId),
    logoDark: img(s.logoDarkId),
    favicon: img(s.faviconId),
    ogImage: img(s.ogImageId),
    placeholder: img(s.placeholderImageId),
  };
}

export const getSettings = cached(loadSettings, "settings", [TAGS.settings, TAGS.media]);

export type NavLink = { id: string; label: string; href: string; external: boolean; newTab: boolean };

export const DEFAULT_HEADER_NAV: NavLink[] = [
  { id: "d-home", label: "Home", href: "/", external: false, newTab: false },
  { id: "d-about", label: "About", href: "/about", external: false, newTab: false },
  { id: "d-services", label: "Services", href: "/services", external: false, newTab: false },
  { id: "d-projects", label: "Projects", href: "/projects", external: false, newTab: false },
  { id: "d-insights", label: "Insights", href: "/insights", external: false, newTab: false },
  { id: "d-contact", label: "Contact", href: "/contact", external: false, newTab: false },
];

export const DEFAULT_FOOTER_NAV: NavLink[] = [
  ...DEFAULT_HEADER_NAV.slice(1),
  { id: "d-privacy", label: "Privacy", href: "/privacy", external: false, newTab: false },
];

async function loadNavigation(key: string): Promise<NavLink[] | null> {
  const menu = await db.navigationMenu.findUnique({
    where: { key },
    include: { items: { where: { enabled: true }, orderBy: { position: "asc" } } },
  });
  if (!menu) return null;
  return menu.items
    .filter((i) => !/^\/(admin|api)(\/|$)/i.test(i.href))
    .map((i) => ({ id: i.id, label: i.label, href: i.href, external: i.external, newTab: i.newTab }));
}

const loadNavigationCached = cached(loadNavigation, "nav", [TAGS.nav]);

export async function getNavigation(key: "header" | "footer") {
  const items = await loadNavigationCached(key);
  if (items && items.length) return items;
  return key === "header" ? DEFAULT_HEADER_NAV : DEFAULT_FOOTER_NAV;
}
