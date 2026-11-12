import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Gallery } from "@/components/site/Gallery";
import { Img } from "@/components/site/Img";
import { Reveal } from "@/components/site/Motion";
import { GridGlow, JsonLd, ProjectCard } from "@/components/site/ui";
import { HeaderBackdrop } from "@/components/site/HeaderImage";
import { isPreview } from "@/lib/preview";
import { redirectIfMoved } from "@/lib/redirects";
import { extractText } from "@/lib/rich-text/model";
import { RichText } from "@/lib/rich-text/render";
import { baseUrl, pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import { getFeaturedProjects, getProjectPreview, getPublishedProject } from "@/server/queries/projects";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublishedProject(slug);
  if (!p) return { title: "Not found", robots: { index: false } };
  return pageMetadata({ title: p.seoTitle || p.title, description: p.seoDescription || p.summary, path: `/projects/${p.slug}`, image: p.ogImage ?? p.cover });
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const project = (await isPreview()) ? await getProjectPreview(slug) : await getPublishedProject(slug);
  if (!project) {
    await redirectIfMoved(`/projects/${slug}`);
    notFound();
  }
  const [more, url] = await Promise.all([getFeaturedProjects(4, []), baseUrl()]);
  const others = more.filter((p) => p.id !== project.id).slice(0, 3);
  const period = [project.startDate, project.endDate].filter(Boolean).map((d) => formatDate(d, { month: "short", year: "numeric" }));
  const hasCaseStudy = extractText(project.content).trim().length > 0;
  const facts = [
    project.clientName && { k: "Client", v: project.clientName },
    project.role && { k: "Role", v: project.role },
    period.length > 0 && { k: "Timeline", v: period.join(" – ") },
    project.categories.length > 0 && { k: "Category", v: project.categories.map((c) => c.name).join(", ") },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: project.title,
          description: project.summary,
          url: `${url}/projects/${project.slug}`,
          ...(project.cover ? { image: project.cover.url.startsWith("http") ? project.cover.url : `${url}${project.cover.url}` } : {}),
          keywords: project.technologies.join(", "),
        }}
      />
      <section className="on-dark relative overflow-hidden">
        <HeaderBackdrop image="projects" />
        <GridGlow />
        <div className="wrap relative pb-14 pt-[clamp(56px,8vw,96px)]">
          <Link href="/projects" className="rise mb-8 inline-flex items-center gap-2 text-sm text-mist hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All projects
          </Link>
          <h1 className="h1 rise max-w-4xl" style={{ ["--d" as string]: "0.05s" }}>{project.title}</h1>
          {project.summary && <p className="lead rise mt-6 max-w-2xl" style={{ ["--d" as string]: "0.12s" }}>{project.summary}</p>}
          <div className="rise mt-8 flex flex-wrap gap-3" style={{ ["--d" as string]: "0.18s" }}>
            {project.externalUrl && (
              <a href={project.externalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-gold">
                Visit project <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
            {project.repositoryUrl && (
              <a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Source code <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </section>

      {project.cover && (
        <div className="bg-gradient-to-b from-ink from-50% to-paper to-50%">
          <div className="wrap">
            <div className="rise aspect-[16/9] overflow-hidden rounded-[20px] shadow-[0_40px_80px_-40px_rgba(11,18,34,0.5)]" style={{ ["--d" as string]: "0.2s" }}>
              <Img image={project.cover} priority sizes="(min-width: 1180px) 1132px, 100vw" />
            </div>
          </div>
        </div>
      )}

      <section className="section">
        <div className="wrap grid gap-14 lg:grid-cols-[0.62fr_1.38fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            {facts.length > 0 && (
              <dl className="divide-y divide-line border-y border-line">
                {facts.map((f) => (
                  <div key={f.k} className="py-4">
                    <dt className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">{f.k}</dt>
                    <dd className="mt-1">{f.v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {project.technologies.length > 0 && (
              <div className="mt-6">
                <h2 className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">Technologies</h2>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {project.technologies.map((t) => (
                    <li key={t} className="chip">{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
          <div>
            {(project.problem || project.solution) && (
              <div className="grid gap-6 md:grid-cols-2">
                {project.problem && (
                  <Reveal className="card p-7">
                    <span className="eyebrow !mb-3">The problem</span>
                    <p className="whitespace-pre-line text-[#2a3247]">{project.problem}</p>
                  </Reveal>
                )}
                {project.solution && (
                  <Reveal delay={0.06} className="card border-ink bg-ink p-7 text-white on-dark">
                    <span className="eyebrow !mb-3">The solution</span>
                    <p className="whitespace-pre-line text-white/85">{project.solution}</p>
                  </Reveal>
                )}
              </div>
            )}
            {hasCaseStudy && (
              <Reveal className="mt-12">
                <RichText doc={project.content} />
              </Reveal>
            )}
            {project.gallery.length > 0 && (
              <div className="mt-14">
                <h2 className="h3 mb-6">Gallery</h2>
                <Gallery items={project.gallery} />
              </div>
            )}
          </div>
        </div>
      </section>

      {others.length > 0 && (
        <section className="section on-paper-2">
          <div className="wrap">
            <h2 className="h2">More projects</h2>
            <div className="mt-10 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
