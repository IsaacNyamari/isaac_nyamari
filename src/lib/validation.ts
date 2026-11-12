import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/slug";

// ─── Primitives ─────────────────────────────────────────────────────────────

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(96, "Too long")
  .regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens");

const id = z.string().min(1).max(64);
export const optionalId = id.nullable().optional().transform((v) => v || null);
const text = (max: number) => z.string().trim().max(max, `At most ${max} characters`);

/** Internal paths, fragments, http(s), mailto and tel only. Admin/API paths are never linkable. */
export const hrefSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === "" || /^\/(?!\/)/.test(v) || v.startsWith("#") || /^(https?:\/\/|mailto:|tel:)/i.test(v),
    "Use a path like /contact, a full https:// URL, mailto: or tel:",
  )
  .refine((v) => !/^\/(admin|api)(\/|$|\?)/i.test(v), "Links to admin or API routes are not allowed");

export const urlOrEmpty = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Must be a full http(s) URL");

const MAX_DOC_BYTES = 800_000;
export const richTextSchema = z
  .object({ type: z.literal("doc"), content: z.array(z.any()).optional() })
  .passthrough()
  .refine((d) => JSON.stringify(d).length < MAX_DOC_BYTES, "Content is too large");

const isoDate = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Invalid date")
  .optional()
  .nullable()
  .transform((v) => (v ? new Date(v) : null));

const seo = {
  seoTitle: text(70).default(""),
  seoDescription: text(170).default(""),
};

// ─── Content ────────────────────────────────────────────────────────────────

export const postInputSchema = z.object({
  title: text(160).min(1, "Title is required"),
  slug: slugSchema,
  excerpt: text(400).default(""),
  content: richTextSchema,
  coverImageId: optionalId,
  ogImageId: optionalId,
  categoryId: optionalId,
  tagIds: z.array(id).max(30).default([]),
  relatedIds: z.array(id).max(6).default([]),
  featured: z.boolean().default(false),
  showToc: z.boolean().default(false),
  canonicalUrl: urlOrEmpty.default(""),
  ...seo,
});
export type PostInput = z.infer<typeof postInputSchema>;

export const saveIntentSchema = z.enum(["draft", "publish", "schedule"]);

export const projectInputSchema = z.object({
  title: text(160).min(1, "Title is required"),
  slug: slugSchema,
  summary: text(500).default(""),
  problem: text(4000).default(""),
  solution: text(4000).default(""),
  content: richTextSchema,
  role: text(160).default(""),
  clientName: text(160).default(""),
  technologies: z.array(text(60).min(1)).max(40).default([]),
  categoryIds: z.array(id).max(20).default([]),
  startDate: isoDate,
  endDate: isoDate,
  externalUrl: urlOrEmpty.default(""),
  repositoryUrl: urlOrEmpty.default(""),
  featured: z.boolean().default(false),
  coverImageId: optionalId,
  ogImageId: optionalId,
  gallery: z
    .array(z.object({ mediaId: id, caption: text(300).default("") }))
    .max(40)
    .default([]),
  ...seo,
});
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const serviceInputSchema = z.object({
  title: text(120).min(1, "Title is required"),
  slug: slugSchema,
  summary: text(500).default(""),
  content: richTextSchema,
  icon: text(40).default("code"),
  deliverables: z.array(text(160).min(1)).max(30).default([]),
  ctaLabel: text(60).default("Discuss your project"),
  featured: z.boolean().default(true),
  imageId: optionalId,
  ...seo,
});
export type ServiceInput = z.infer<typeof serviceInputSchema>;

export const aboutDataSchema = z.object({
  headline: text(200).default(""),
  philosophy: z.array(z.object({ title: text(120), description: text(600) })).max(12).default([]),
  interests: z.array(text(120)).max(30).default([]),
  specializations: z.array(z.object({ title: text(120), description: text(600) })).max(12).default([]),
  ctaTitle: text(160).default(""),
  ctaText: text(400).default(""),
  showSkills: z.boolean().default(true),
});
export type AboutData = z.infer<typeof aboutDataSchema>;

export const pageInputSchema = z.object({
  title: text(160).min(1, "Title is required"),
  slug: slugSchema,
  excerpt: text(400).default(""),
  content: richTextSchema,
  featuredImageId: optionalId,
  showInNav: z.boolean().default(false),
  data: z.record(z.string(), z.unknown()).default({}),
  ...seo,
});
export type PageInput = z.infer<typeof pageInputSchema>;

// ─── Taxonomy ───────────────────────────────────────────────────────────────

export const categoryInputSchema = z.object({
  name: text(80).min(1, "Name is required"),
  slug: slugSchema,
  description: text(400).default(""),
});
export const tagInputSchema = z.object({ name: text(60).min(1, "Name is required"), slug: slugSchema });
export const projectCategoryInputSchema = z.object({ name: text(80).min(1, "Name is required"), slug: slugSchema });

// ─── Skills & navigation ────────────────────────────────────────────────────

export const skillInputSchema = z.object({
  name: text(80).min(1, "Name is required"),
  category: text(60).min(1, "Category is required"),
  description: text(300).default(""),
  icon: text(40).default(""),
  visible: z.boolean().default(true),
});

export const navItemSchema = z.object({
  id: z.string().optional(),
  label: text(60).min(1, "Label is required"),
  href: hrefSchema.refine((v) => v !== "", "Destination is required"),
  newTab: z.boolean().default(false),
  enabled: z.boolean().default(true),
});
export const navMenuSchema = z.object({ items: z.array(navItemSchema).max(30) });

// ─── Settings ───────────────────────────────────────────────────────────────

const socialsSchema = z.object({
  linkedin: urlOrEmpty.default(""),
  github: urlOrEmpty.default(""),
  x: urlOrEmpty.default(""),
  facebook: urlOrEmpty.default(""),
  instagram: urlOrEmpty.default(""),
  youtube: urlOrEmpty.default(""),
  tiktok: urlOrEmpty.default(""),
});
export type Socials = z.infer<typeof socialsSchema>;
export const SOCIAL_KEYS = ["linkedin", "github", "x", "facebook", "instagram", "youtube", "tiktok"] as const;

const hexColor = z.string().trim().refine((v) => v === "" || /^#[0-9a-f]{6}$/i.test(v), "Use a hex colour like #E3A93D");
const phoneLike = text(40).refine((v) => v === "" || /^[+\d\s().-]{6,40}$/.test(v), "Enter a valid phone number");

export const settingsSchema = z.object({
  general: z.object({
    siteName: text(80).min(1),
    tagline: text(160).default(""),
    siteDescription: text(400).default(""),
    siteUrl: urlOrEmpty.default(""),
    language: text(10).default("en"),
    timezone: text(60).default("Africa/Nairobi"),
  }),
  contact: z.object({
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).default(""),
    phone: phoneLike.default(""),
    whatsapp: phoneLike.default(""),
    locationText: text(160).default(""),
    contactCtaTitle: text(160).default(""),
    contactCtaText: text(400).default(""),
    notifyEmail: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).default(""),
    socials: socialsSchema,
  }),
  branding: z.object({
    logoLightId: optionalId,
    logoDarkId: optionalId,
    faviconId: optionalId,
    placeholderImageId: optionalId,
    primaryColor: hexColor.default(""),
    accentColor: hexColor.default(""),
  }),
  seo: z.object({
    seoTitle: text(70).default(""),
    seoDescription: text(170).default(""),
    ogImageId: optionalId,
    allowIndexing: z.boolean().default(true),
    googleVerification: text(120).default(""),
    bingVerification: text(120).default(""),
    twitterHandle: text(40).default("").transform((v) => v.replace(/^@/, "")),
  }),
  footer: z.object({
    footerDescription: text(400).default(""),
    copyrightText: text(160).default(""),
    footerCtaText: text(200).default(""),
  }),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

// ─── Homepage sections ──────────────────────────────────────────────────────

const cta = z.object({ label: text(60).default(""), href: hrefSchema.default("") });
const heading = { eyebrow: text(80).default(""), title: text(200).default(""), description: text(600).default("") };

export const sectionConfigSchemas = {
  HERO: z.object({
    eyebrow: text(120).default(""),
    title: text(200).default(""),
    highlight: text(200).default(""),
    subtitle: text(600).default(""),
    primaryCta: cta.default({ label: "", href: "" }),
    secondaryCta: cta.default({ label: "", href: "" }),
    imageId: optionalId,
    backgroundImageId: optionalId,
    stats: z.array(z.object({ value: text(20), label: text(60) })).max(4).default([]),
  }),
  INTRO: z.object({ ...heading, body: text(3000).default(""), imageId: optionalId, cta: cta.default({ label: "", href: "" }) }),
  SERVICES: z.object({ ...heading, serviceIds: z.array(id).max(12).default([]) }),
  PROJECTS: z.object({ ...heading, projectIds: z.array(id).max(12).default([]), limit: z.number().int().min(1).max(12).default(3) }),
  SKILLS: z.object({ ...heading }),
  PROCESS: z.object({ ...heading, steps: z.array(z.object({ title: text(80), description: text(400) })).max(8).default([]) }),
  INSIGHTS: z.object({ ...heading, postIds: z.array(id).max(9).default([]), limit: z.number().int().min(1).max(9).default(3) }),
  CONTACT_CTA: z.object({ ...heading, cta: cta.default({ label: "", href: "" }), showContactMethods: z.boolean().default(true) }),
} as const;

export type SectionType = keyof typeof sectionConfigSchemas;
export type SectionConfig<T extends SectionType> = z.infer<(typeof sectionConfigSchemas)[T]>;

export const SECTION_TYPES = Object.keys(sectionConfigSchemas) as SectionType[];

export function parseSectionConfig<T extends SectionType>(type: T, config: unknown): SectionConfig<T> {
  const parsed = sectionConfigSchemas[type].safeParse(config ?? {});
  return (parsed.success ? parsed.data : sectionConfigSchemas[type].parse({})) as SectionConfig<T>;
}

export const homeSectionsInputSchema = z.array(
  z.object({
    key: z.string().min(1).max(40),
    type: z.enum(SECTION_TYPES as [SectionType, ...SectionType[]]),
    visible: z.boolean(),
    config: z.unknown(),
  }),
).max(20);

// ─── Public contact form ────────────────────────────────────────────────────

export const BUDGET_OPTIONS = [
  "Not sure yet",
  "Under KES 100,000",
  "KES 100,000 – 300,000",
  "KES 300,000 – 750,000",
  "KES 750,000 – 1,500,000",
  "Above KES 1,500,000",
] as const;

export const inquirySchema = z.object({
  name: text(120).min(2, "Please enter your name"),
  email: z.string().trim().max(200).email("Please enter a valid email address"),
  phone: phoneLike.default(""),
  service: text(96).default(""),
  budget: z.union([z.literal(""), z.enum(BUDGET_OPTIONS)]).default(""),
  message: text(5000).min(20, "Please describe your project in at least 20 characters"),
  consent: z.literal(true, { message: "Please confirm we may use these details to reply" }),
});
export type InquiryInput = z.infer<typeof inquirySchema>;

export const inquiryStatusSchema = z.enum(["NEW", "IN_PROGRESS", "RESPONDED", "ARCHIVED"]);
