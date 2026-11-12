import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ContactCtaSection } from "@/components/home/Sections";
import { Reveal } from "@/components/site/Motion";
import { EmptyState, PageHero } from "@/components/site/ui";
import { Icon } from "@/lib/icons";
import { pageMetadata } from "@/lib/seo";
import { parseSectionConfig } from "@/lib/validation";
import { listPublishedServices } from "@/server/queries/services";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Services",
    description: "Custom software, websites, business management systems and SaaS, infrastructure, and API integration and consulting.",
    path: "/services",
  });
}

export default async function ServicesPage() {
  const services = await listPublishedServices();
  return (
    <>
      <PageHero image="services"
        eyebrow="Services"
        title="Software, systems and infrastructure — end to end."
        description="I work across the full stack: from understanding the problem and designing the system, to building, integrating, deploying and maintaining it."
      />
      <section className="section">
        <div className="wrap">
          {services.length === 0 ? (
            <EmptyState title="Services are being updated" text="Please check back soon or get in touch directly." />
          ) : (
            <div className="flex flex-col gap-6">
              {services.map((s, i) => (
                <Reveal key={s.id} as="article" className="card card-hover group grid gap-8 p-7 sm:p-10 lg:grid-cols-[auto_1fr_1fr] lg:gap-12">
                  <div className="flex items-center gap-5 lg:flex-col lg:items-start">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ink text-gold-hi">
                      <Icon name={s.icon} className="h-6 w-6" />
                    </span>
                    <span className="font-serif text-4xl font-semibold text-line">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div>
                    <h2 className="h3 !text-[1.7rem]">
                      <Link href={`/services/${s.slug}`} className="hover:text-navy-2">{s.title}</Link>
                    </h2>
                    <p className="mt-4 text-muted">{s.summary}</p>
                    <div className="mt-7 flex flex-wrap gap-4">
                      <Link href={`/services/${s.slug}`} className="link-arrow">
                        Service details <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <Link href={`/contact?service=${s.slug}`} className="link-arrow !text-muted hover:!text-ink">
                        {s.ctaLabel}
                      </Link>
                    </div>
                  </div>
                  {s.deliverables.length > 0 && (
                    <ul className="diamond-list text-[0.97rem] text-[#2a3247]">
                      {s.deliverables.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  )}
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
      <ContactCtaSection config={parseSectionConfig("CONTACT_CTA", { eyebrow: "Not sure which fits?", title: "Describe the problem — I'll suggest the approach.", cta: { label: "Start a conversation", href: "/contact" } })} />
    </>
  );
}
