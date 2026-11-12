import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Img } from "@/components/site/Img";
import { Reveal } from "@/components/site/Motion";
import { GridGlow, PageHero, SectionHeading } from "@/components/site/ui";
import { Icon } from "@/lib/icons";
import { isPreview } from "@/lib/preview";
import { RichText } from "@/lib/rich-text/render";
import { pageMetadata } from "@/lib/seo";
import { aboutDataSchema } from "@/lib/validation";
import { getPagePreview, getPublishedPage } from "@/server/queries/pages";
import { getSkillGroups } from "@/server/queries/skills";

export const dynamic = "force-dynamic";

async function load() {
  return (await isPreview()) ? getPagePreview("about") : getPublishedPage("about");
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("about");
  return pageMetadata({ title: page?.seoTitle || page?.title || "About", description: page?.seoDescription || page?.excerpt, path: "/about", image: page?.featuredImage });
}

export default async function AboutPage() {
  const page = await load();
  if (!page) notFound();
  const data = aboutDataSchema.parse(page.data ?? {});
  const groups = data.showSkills ? await getSkillGroups() : [];

  return (
    <>
      <PageHero image="about" eyebrow={page.title} title={data.headline || page.title} description={page.excerpt} />

      <section className="section">
        <div className={`wrap grid gap-12 ${page.featuredImage ? "lg:grid-cols-[0.85fr_1.15fr] lg:gap-16" : ""}`}>
          {page.featuredImage && (
            <Reveal className="relative">
              <div className="absolute -bottom-4 -left-4 hidden h-2/3 w-2/3 rounded-[22px] md:block" style={{ background: "var(--gold-gradient)" }} />
              <div className="relative aspect-[4/5] overflow-hidden rounded-[20px]">
                <Img image={page.featuredImage} priority sizes="(min-width: 1024px) 460px, 100vw" />
              </div>
            </Reveal>
          )}
          <Reveal delay={0.06} className={page.featuredImage ? "" : "mx-auto max-w-3xl"}>
            <RichText doc={page.content} />
          </Reveal>
        </div>
      </section>

      {data.philosophy.length > 0 && (
        <section className="section on-paper-2">
          <div className="wrap">
            <SectionHeading eyebrow="Development philosophy" title="The principles behind how I build." />
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {data.philosophy.map((p, i) => (
                <Reveal key={i} delay={(i % 2) * 0.07} className="card p-7 sm:p-8">
                  <span className="font-serif text-3xl font-semibold text-gold-lo">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="h3 mt-4">{p.title}</h3>
                  <p className="mt-3 text-muted">{p.description}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {data.specializations.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SectionHeading eyebrow="Areas of specialization" title="Where I spend most of my time." />
            <div className="mt-12 grid gap-x-10 gap-y-2 md:grid-cols-2">
              {data.specializations.map((sp, i) => (
                <Reveal key={i} className="border-t border-line py-6">
                  <h3 className="h3">{sp.title}</h3>
                  <p className="mt-2 text-muted">{sp.description}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {(groups.length > 0 || data.interests.length > 0) && (
        <section className="section on-dark relative overflow-hidden">
          <GridGlow />
          <div className="wrap relative">
            <SectionHeading eyebrow="Skills & technologies" title="What I work with." />
            {groups.length > 0 && (
              <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {groups.map((g, i) => (
                  <Reveal key={g.category} delay={i * 0.06} className="card-dark p-6">
                    <h3 className="font-display text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-gold-hi">{g.category}</h3>
                    <ul className="mt-5 space-y-3">
                      {g.skills.map((s) => (
                        <li key={s.id} className="flex items-start gap-3 text-white/90">
                          <Icon name={s.icon || "code"} className="mt-1 h-4 w-4 shrink-0 text-mist" />
                          {s.name}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                ))}
              </div>
            )}
            {data.interests.length > 0 && (
              <Reveal className="mt-14">
                <h3 className="font-display text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-mist">Technical interests</h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {data.interests.map((x) => (
                    <li key={x} className="chip !px-4 !py-1.5 !text-sm">{x}</li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <Reveal className="wrap flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <h2 className="h2">{data.ctaTitle || "Let's work together."}</h2>
            {data.ctaText && <p className="lead mt-4">{data.ctaText}</p>}
          </div>
          <div className="btn-row flex flex-wrap gap-3">
            <Link href="/contact" className="btn btn-gold group">
              Get in touch <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/services" className="btn btn-ghost">View services</Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
