"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useAction, useUnsavedChanges } from "@/components/admin/hooks";
import { ImageField, type ImageValue } from "@/components/admin/MediaPicker";
import { Button, Card, Field, Input, Textarea, Toggle } from "@/components/admin/ui";
import type { Socials } from "@/lib/validation";
import { SOCIAL_KEYS } from "@/lib/validation";
import { saveSettingsAction } from "./actions";

export type SettingsData = {
  general: { siteName: string; tagline: string; siteDescription: string; siteUrl: string; language: string; timezone: string };
  contact: { email: string; phone: string; whatsapp: string; locationText: string; contactCtaTitle: string; contactCtaText: string; notifyEmail: string; socials: Socials };
  branding: { logoLight: ImageValue; logoDark: ImageValue; favicon: ImageValue; placeholder: ImageValue; primaryColor: string; accentColor: string };
  seo: { seoTitle: string; seoDescription: string; ogImage: ImageValue; allowIndexing: boolean };
  footer: { footerDescription: string; copyrightText: string; footerCtaText: string };
};

type Integrations = {
  email: { driver: string; configured: boolean; from: string };
  storage: { driver: string; maxMb: number };
  scheduler: { cronSecret: boolean; internal: boolean };
};

const TABS = [
  { id: "general", label: "General" },
  { id: "contact", label: "Contact" },
  { id: "branding", label: "Branding" },
  { id: "seo", label: "SEO" },
  { id: "footer", label: "Footer" },
  { id: "integrations", label: "Integrations" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const SOCIAL_LABELS: Record<string, string> = { linkedin: "LinkedIn", github: "GitHub", x: "X (Twitter)", facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok" };

export function SettingsForm({ initial, integrations, initialTab }: { initial: SettingsData; integrations: Integrations; initialTab?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === initialTab) ? (initialTab as TabId) : "general");
  const [d, setD] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const { pending, run, fieldErrors } = useAction();
  const dirty = JSON.stringify(d) !== saved;
  useUnsavedChanges(dirty);
  const err = (path: string) => fieldErrors[path];

  function patch<K extends keyof SettingsData>(group: K, p: Partial<SettingsData[K]>) {
    setD((prev) => ({ ...prev, [group]: { ...prev[group], ...p } }));
  }

  function save() {
    const b = d.branding;
    run(
      () =>
        saveSettingsAction({
          general: d.general,
          contact: d.contact,
          branding: { logoLightId: b.logoLight?.id ?? null, logoDarkId: b.logoDark?.id ?? null, faviconId: b.favicon?.id ?? null, placeholderImageId: b.placeholder?.id ?? null, primaryColor: b.primaryColor, accentColor: b.accentColor },
          seo: { seoTitle: d.seo.seoTitle, seoDescription: d.seo.seoDescription, ogImageId: d.seo.ogImage?.id ?? null, allowIndexing: d.seo.allowIndexing },
          footer: d.footer,
        }),
      { onSuccess: () => { setSaved(JSON.stringify(d)); router.refresh(); } },
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto lg:flex-col">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined} className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm ${tab === t.id ? "bg-ink text-white" : "text-[#3a4258] hover:bg-white"}`}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="space-y-6">
        {tab === "general" && (
          <Card title="General">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Website name" htmlFor="s-name" error={err("general.siteName")} required><Input id="s-name" value={d.general.siteName} onChange={(e) => patch("general", { siteName: e.target.value })} /></Field>
              <Field label="Tagline" htmlFor="s-tag"><Input id="s-tag" value={d.general.tagline} onChange={(e) => patch("general", { tagline: e.target.value })} /></Field>
              <Field label="Website description" htmlFor="s-desc" className="md:col-span-2"><Textarea id="s-desc" rows={3} value={d.general.siteDescription} onChange={(e) => patch("general", { siteDescription: e.target.value })} /></Field>
              <Field label="Site URL" htmlFor="s-url" error={err("general.siteUrl")} help="Canonical address, e.g. https://example.com — used for sitemap and links."><Input id="s-url" type="url" value={d.general.siteUrl} onChange={(e) => patch("general", { siteUrl: e.target.value })} /></Field>
              <Field label="Default language" htmlFor="s-lang" help="e.g. en"><Input id="s-lang" value={d.general.language} onChange={(e) => patch("general", { language: e.target.value })} /></Field>
              <Field label="Time zone" htmlFor="s-tz" help="IANA name, e.g. Africa/Nairobi"><Input id="s-tz" value={d.general.timezone} onChange={(e) => patch("general", { timezone: e.target.value })} /></Field>
            </div>
          </Card>
        )}

        {tab === "contact" && (
          <>
            <Card title="Public contact details" description="Values are shown exactly as entered. Empty channels are hidden on the website.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Email" htmlFor="c-email" error={err("contact.email")}><Input id="c-email" type="email" value={d.contact.email} onChange={(e) => patch("contact", { email: e.target.value })} /></Field>
                <Field label="Phone" htmlFor="c-phone" error={err("contact.phone")} help="Include the country code, e.g. +254…"><Input id="c-phone" type="tel" value={d.contact.phone} onChange={(e) => patch("contact", { phone: e.target.value })} /></Field>
                <Field label="WhatsApp number" htmlFor="c-wa" error={err("contact.whatsapp")} help="International format; used for wa.me links."><Input id="c-wa" type="tel" value={d.contact.whatsapp} onChange={(e) => patch("contact", { whatsapp: e.target.value })} /></Field>
                <Field label="Location text (optional)" htmlFor="c-loc" help="General location only, e.g. Kenya."><Input id="c-loc" value={d.contact.locationText} onChange={(e) => patch("contact", { locationText: e.target.value })} /></Field>
                <Field label="Contact page title" htmlFor="c-ctat"><Input id="c-ctat" value={d.contact.contactCtaTitle} onChange={(e) => patch("contact", { contactCtaTitle: e.target.value })} /></Field>
                <Field label="Contact page introduction" htmlFor="c-ctax"><Input id="c-ctax" value={d.contact.contactCtaText} onChange={(e) => patch("contact", { contactCtaText: e.target.value })} /></Field>
                <Field label="Inquiry notification email" htmlFor="c-notify" error={err("contact.notifyEmail")} help="Private. Where new inquiries are sent. Defaults to the public email."><Input id="c-notify" type="email" value={d.contact.notifyEmail} onChange={(e) => patch("contact", { notifyEmail: e.target.value })} /></Field>
              </div>
            </Card>
            <Card title="Social profiles" description="Full URLs. Leave blank to hide.">
              <div className="grid gap-4 md:grid-cols-2">
                {SOCIAL_KEYS.map((k) => (
                  <Field key={k} label={SOCIAL_LABELS[k]} htmlFor={`soc-${k}`} error={err(`contact.socials.${k}`)}>
                    <Input id={`soc-${k}`} type="url" placeholder="https://…" value={d.contact.socials[k]} onChange={(e) => patch("contact", { socials: { ...d.contact.socials, [k]: e.target.value } })} />
                  </Field>
                ))}
              </div>
            </Card>
          </>
        )}

        {tab === "branding" && (
          <Card title="Branding" description="Without uploaded logos, the built-in Isaac Nyamari wordmark is used.">
            <div className="grid gap-5 md:grid-cols-2">
              <ImageField label="Logo for light backgrounds" value={d.branding.logoLight} onChange={(logoLight) => patch("branding", { logoLight })} aspect="aspect-[3/1]" />
              <ImageField label="Logo for dark backgrounds (header & footer)" value={d.branding.logoDark} onChange={(logoDark) => patch("branding", { logoDark })} aspect="aspect-[3/1]" />
              <ImageField label="Favicon" value={d.branding.favicon} onChange={(favicon) => patch("branding", { favicon })} aspect="aspect-square" help="Square PNG, at least 192×192." />
              <ImageField label="Default placeholder image" value={d.branding.placeholder} onChange={(placeholder) => patch("branding", { placeholder })} />
              <Field label="Primary (dark) colour" htmlFor="b-primary" error={err("branding.primaryColor")} help="Hex, e.g. #0B1222. Blank = brand default.">
                <div className="flex gap-2"><Input id="b-primary" value={d.branding.primaryColor} onChange={(e) => patch("branding", { primaryColor: e.target.value })} placeholder="#0B1222" /><input type="color" aria-label="Pick primary colour" value={d.branding.primaryColor || "#0b1222"} onChange={(e) => patch("branding", { primaryColor: e.target.value })} className="h-[42px] w-12 rounded border border-[#d5d9e2]" /></div>
              </Field>
              <Field label="Accent colour" htmlFor="b-accent" error={err("branding.accentColor")} help="Hex, e.g. #E9B04A. Blank = brand gold.">
                <div className="flex gap-2"><Input id="b-accent" value={d.branding.accentColor} onChange={(e) => patch("branding", { accentColor: e.target.value })} placeholder="#E9B04A" /><input type="color" aria-label="Pick accent colour" value={d.branding.accentColor || "#e9b04a"} onChange={(e) => patch("branding", { accentColor: e.target.value })} className="h-[42px] w-12 rounded border border-[#d5d9e2]" /></div>
              </Field>
            </div>
          </Card>
        )}

        {tab === "seo" && (
          <Card title="Search & sharing">
            <div className="space-y-4">
              <Field label="Default SEO title" htmlFor="seo-t" help={`${d.seo.seoTitle.length}/70 · Used on the homepage and as the fallback title.`}><Input id="seo-t" maxLength={70} value={d.seo.seoTitle} onChange={(e) => patch("seo", { seoTitle: e.target.value })} /></Field>
              <Field label="Default meta description" htmlFor="seo-d" help={`${d.seo.seoDescription.length}/170`}><Textarea id="seo-d" rows={3} maxLength={170} value={d.seo.seoDescription} onChange={(e) => patch("seo", { seoDescription: e.target.value })} /></Field>
              <ImageField label="Default social sharing image" value={d.seo.ogImage} onChange={(ogImage) => patch("seo", { ogImage })} help="1200×630. Without one, a branded card is generated automatically." />
              <Toggle label="Allow search engines to index the site" description="When off, robots.txt disallows everything and pages are marked noindex." checked={d.seo.allowIndexing} onChange={(allowIndexing) => patch("seo", { allowIndexing })} />
              <p className="admin-help">Sitemap: <a href="/sitemap.xml" target="_blank" rel="noopener" className="underline">/sitemap.xml</a> · Robots: <a href="/robots.txt" target="_blank" rel="noopener" className="underline">/robots.txt</a> (only published content is listed).</p>
            </div>
          </Card>
        )}

        {tab === "footer" && (
          <Card title="Footer">
            <div className="space-y-4">
              <Field label="Footer description" htmlFor="f-desc"><Textarea id="f-desc" rows={3} value={d.footer.footerDescription} onChange={(e) => patch("footer", { footerDescription: e.target.value })} /></Field>
              <Field label="Copyright text" htmlFor="f-copy" help="Shown after “© year”."><Input id="f-copy" value={d.footer.copyrightText} onChange={(e) => patch("footer", { copyrightText: e.target.value })} /></Field>
              <Field label="Footer call-to-action" htmlFor="f-cta" help="Leave blank to hide the footer CTA band."><Input id="f-cta" value={d.footer.footerCtaText} onChange={(e) => patch("footer", { footerCtaText: e.target.value })} /></Field>
              <p className="admin-help">Footer links are managed in Navigation → Footer menu. Social links come from the Contact tab.</p>
            </div>
          </Card>
        )}

        {tab === "integrations" && (
          <Card title="Integrations" description="Secrets are configured with server environment variables and are never sent to the browser.">
            <ul className="divide-y divide-[#eef0f4] text-sm">
              <Status ok={integrations.email.configured} title={`Email delivery: ${integrations.email.driver}`} text={integrations.email.driver === "console" ? "Development mode — emails are only written to the server log. Set EMAIL_DRIVER=smtp or resend for production." : `Sending from ${integrations.email.from || "(EMAIL_FROM not set)"}`} />
              <Status ok title={`Media storage: ${integrations.storage.driver}`} text={integrations.storage.driver === "local" ? `Files on the server disk (needs a persistent volume in production). Upload limit ${integrations.storage.maxMb} MB.` : `S3-compatible object storage. Upload limit ${integrations.storage.maxMb} MB.`} />
              <Status ok={integrations.scheduler.cronSecret} title="Scheduled publishing" text={integrations.scheduler.cronSecret ? `CRON_SECRET configured${integrations.scheduler.internal ? " · in-process scheduler running every minute" : " · call /api/cron/publish every minute from your scheduler"}.` : "Set CRON_SECRET (16+ chars) so scheduled posts can be published automatically."} />
            </ul>
          </Card>
        )}

        {tab !== "integrations" && (
          <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-xl bg-white/90 p-3 shadow-md ring-1 ring-[#e3e6ed] backdrop-blur">
            {dirty && <span className="mr-auto text-xs font-medium text-amber-700">● Unsaved changes</span>}
            <Button variant="primary" loading={pending} disabled={!dirty} onClick={save}>Save settings</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Status({ ok, title, text }: { ok: boolean; title: string; text: string }) {
  return (
    <li className="flex gap-3 py-3">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="OK" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label="Needs attention" />}
      <span><span className="block font-medium">{title}</span><span className="text-[#6b7385]">{text}</span></span>
    </li>
  );
}
