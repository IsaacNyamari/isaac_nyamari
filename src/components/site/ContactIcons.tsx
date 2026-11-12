import { Mail, MessageCircle, Phone } from "lucide-react";
import type { PublicSettings } from "@/server/queries/settings";
import { phoneDigits, whatsappLink } from "@/lib/utils";

export const SOCIAL_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  x: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
};

export type ContactChannel = { key: "email" | "phone" | "whatsapp"; label: string; value: string; href: string; icon: typeof Mail };

/** Builds clickable contact channels from settings. Display values are shown exactly as configured. */
export function contactChannels(s: Pick<PublicSettings, "email" | "phone" | "whatsapp" | "siteName">, whatsappText?: string): ContactChannel[] {
  const out: ContactChannel[] = [];
  if (s.email) out.push({ key: "email", label: "Email", value: s.email, href: `mailto:${s.email}`, icon: Mail });
  if (s.phone && phoneDigits(s.phone)) out.push({ key: "phone", label: "Phone", value: s.phone, href: `tel:${phoneDigits(s.phone)}`, icon: Phone });
  if (s.whatsapp && whatsappLink(s.whatsapp)) {
    out.push({
      key: "whatsapp",
      label: "WhatsApp",
      value: s.whatsapp,
      href: whatsappLink(s.whatsapp, whatsappText ?? `Hi ${s.siteName.split(" ")[0]}, I'd like to discuss a project.`),
      icon: MessageCircle,
    });
  }
  return out;
}

export function socialLinks(s: Pick<PublicSettings, "socials">) {
  return Object.entries(s.socials)
    .filter(([, url]) => Boolean(url))
    .map(([key, url]) => ({ key, label: SOCIAL_LABELS[key] ?? key, url: url as string }));
}
