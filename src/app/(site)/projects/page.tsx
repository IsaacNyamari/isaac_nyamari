import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/site/Motion";
import { EmptyState, PageHero, ProjectCard } from "@/components/site/ui";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { getPublicProjectCategories, listPublishedProjects } from "@/server/queries/projects";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ category?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  // Filtered views share the canonical /projects URL.
  return pageMetadata({ title: "Projects", description: "Selected software, systems and infrastructure work.", path: "/projects" });
}

export default async function ProjectsPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const active = typeof category === "string" && /^[a-z0-9-]{1,96}$/.test(category) ? category : undefined;
  const [projects, categories] = await Promise.all([listPublishedProjects(active), getPublicProjectCategories()]);

  return (
    <>
      <PageHero image="projects"
        eyebrow="Projects"
        title="Work that runs in the real world."
        description="Selected applications, systems and infrastructure — the problem each one addressed, how it was solved, and what it was built with."
      />
      <section className="section">
        <div className="wrap">
          {categories.length > 1 && (
            <nav aria-label="Filter projects by category" className="-mx-1 mb-12 flex gap-2 overflow-x-auto px-1 pb-2">
              <FilterLink href="/projects" active={!active} label="All" />
              {categories.map((c) => (
                <FilterLink key={c.slug} href={`/projects?category=${c.slug}`} active={active === c.slug} label={c.name} />
              ))}
            </nav>
          )}
          {projects.length === 0 ? (
            <EmptyState
              title={active ? "No projects in this category yet" : "Projects are on the way"}
              text={active ? "Try another category." : "Case studies are being prepared. In the meantime, feel free to get in touch."}
              action={<Link href={active ? "/projects" : "/contact"} className="btn btn-ink">{active ? "Show all projects" : "Get in touch"}</Link>}
            />
          ) : (
            <div className="grid gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p, i) => (
                <Reveal key={p.id} delay={(i % 3) * 0.07}>
                  <ProjectCard project={p} priority={i < 3} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 font-display text-[0.8rem] font-semibold tracking-wide transition-colors",
        active ? "border-ink bg-ink text-white" : "border-line bg-card text-muted hover:border-ink hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}
