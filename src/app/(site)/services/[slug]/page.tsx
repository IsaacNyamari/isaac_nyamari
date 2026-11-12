import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Img } from "@/components/site/Img";
import { Reveal } from "@/components/site/Motion";
import { GridGlow, JsonLd } from "@/components/site/ui";
import { HeaderBackdrop, serviceHeaderImage } from "@/components/site/HeaderImage";
import { Icon } from "@/lib/icons";
import { isPreview } from "@/lib/preview";
import { redirectIfMoved } from "@/lib/redirects";
import { RichText } from "@/lib/rich-text/render";
import { baseUrl, pageMetadata } from "@/lib/seo";
import { getPublishedService, getServicePreview, listPublishedServices } from "@/server/queries/services";
import { getSettings } from "@/server/queries/settings";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const s = await getPublishedService(slug);
  if (!s) return { title: "Not found", robots: { index: false } };
  return pageMetadata({ title: s.seoTitle || s.title, description: s.seoDescription || s.summary, path: `/services/${s.slug}`, image: s.image });
}

export default async function ServicePage({ params }: Params) {
  const { slug } = await params;
  const service = (await isPreview()) ? await getServicePreview(slug) : await getPublishedService(slug);
  if (!service) {
    await redirectIfMoved(`/services/${slug}`);
    notFound();
  }
  const [others, settings, url] = await Promise.all([listPublishedServices(), getSettings(), baseUrl()]);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.title,
          description: service.summary,
          url: `${url}/services/${service.slug}`,
          provider: { "@type": "Person", name: settings.siteName },
          areaServed: settings.locationText || undefined,
        }}
      />
      <section className="on-dark relative overflow-hidden">
        <HeaderBackdrop image={serviceHeaderImage(service.slug)} />
        <GridGlow />
        <div className="wrap relative grid gap-12 py-[clamp(64px,9vw,112px)] lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <Link href="/services" className="rise mb-8 inline-flex items-center gap-2 text-sm text-mist hover:text-white">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All services
            </Link>
            <span className="rise mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-gold-hi ring-1 ring-white/10">
              <Icon name={service.icon} className="h-6 w-6" />
            </span>
            <h1 className="h1 rise" style={{ ["--d" as string]: "0.06s" }}>{service.title}</h1>
            <p className="lead rise mt-6 max-w-2xl" style={{ ["--d" as string]: "0.14s" }}>{service.summary}</p>
          </div>
          <div className="rise flex lg:justify-end" style={{ ["--d" as string]: "0.2s" }}>
            <Link href={`/contact?service=${service.slug}`} className="btn btn-gold group">
              {service.ctaLabel} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap grid gap-14 lg:grid-cols-[1.4fr_0.6fr]">
          <div>
            {service.image && (
              <Reveal className="mb-10 aspect-[16/9] overflow-hidden rounded-[18px]">
                <Img image={service.image} priority sizes="(min-width: 1024px) 700px, 100vw" />
              </Reveal>
            )}
            <Reveal>
              <RichText doc={service.content} />
            </Reveal>
          </div>
          <aside className="lg:sticky lg:top-28 lg:self-start">
            {service.deliverables.length > 0 && (
              <Reveal className="card p-7">
                <h2 className="font-display text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-gold-text">What&apos;s included</h2>
                <ul className="diamond-list mt-5 text-[0.97rem]">
                  {service.deliverables.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                <Link href={`/contact?service=${service.slug}`} className="btn btn-ink mt-6 w-full">
                  {service.ctaLabel}
                </Link>
              </Reveal>
            )}
            {others.filter((o) => o.slug !== service.slug).length > 0 && (
              <Reveal className="mt-6 p-2">
                <h2 className="font-display text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-muted">Other services</h2>
                <ul className="mt-3">
                  {others
                    .filter((o) => o.slug !== service.slug)
                    .map((o) => (
                      <li key={o.id}>
                        <Link href={`/services/${o.slug}`} className="group flex items-center justify-between gap-3 border-b border-line py-3 text-[0.96rem] hover:text-navy-2">
                          {o.title}
                          <ArrowRight className="h-4 w-4 shrink-0 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                </ul>
              </Reveal>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
