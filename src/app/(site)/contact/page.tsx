import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { contactChannels, socialLinks } from "@/components/site/ContactIcons";
import { Reveal } from "@/components/site/Motion";
import { PageHero } from "@/components/site/ui";
import { issueFormToken } from "@/lib/form-token";
import { pageMetadata } from "@/lib/seo";
import { listPublishedServices } from "@/server/queries/services";
import { getSettings } from "@/server/queries/settings";
import { ContactForm } from "./ContactForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ title: "Contact", description: "Start a project or ask a question about software, systems or infrastructure.", path: "/contact" });
}

type Props = { searchParams: Promise<{ service?: string }> };

export default async function ContactPage({ searchParams }: Props) {
  const [{ service }, settings, services] = await Promise.all([searchParams, getSettings(), listPublishedServices()]);
  const preselected = services.some((s) => s.slug === service) ? service : undefined;
  const channels = contactChannels(settings);
  const socials = socialLinks(settings);

  return (
    <>
      <PageHero image="contact"
        eyebrow="Contact"
        title={settings.contactCtaTitle || "Let's talk about your project."}
        description={settings.contactCtaText || "Share a few details about what you need and I'll get back to you."}
      />
      <section className="section">
        <div className="wrap grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal>
            <h2 className="h3">Ways to reach me</h2>
            {channels.length > 0 ? (
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {channels.map((c) => (
                  <li key={c.key}>
                    <a href={c.href} className="group flex items-center gap-4 py-5" {...(c.key === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-gold-hi transition-colors group-hover:bg-gold group-hover:text-ink">
                        <c.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-display text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">{c.label}</span>
                        <span className="block text-lg [overflow-wrap:anywhere]">{c.value}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-muted">Use the form to send a project inquiry — I&apos;ll reply by email.</p>
            )}
            {settings.locationText && (
              <p className="mt-6 flex items-center gap-3 text-muted">
                <MapPin className="h-4 w-4 text-gold-lo" aria-hidden="true" /> Based in {settings.locationText}
              </p>
            )}
            {socials.length > 0 && (
              <div className="mt-8">
                <h3 className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">Elsewhere</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {socials.map((s) => (
                    <li key={s.key}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer me" className="chip !px-4 !py-1.5 !text-sm hover:border-ink hover:text-ink">{s.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="h3 mb-6">Project inquiry</h2>
            <ContactForm services={services.map((s) => ({ slug: s.slug, title: s.title }))} defaultService={preselected} token={issueFormToken()} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
