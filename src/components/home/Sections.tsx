import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Img } from "@/components/site/Img";
import { Reveal } from "@/components/site/Motion";
import { GridGlow, PostCard, ProjectCard, SectionHeading, ServiceCard } from "@/components/site/ui";
import { contactChannels } from "@/components/site/ContactIcons";
import { Icon } from "@/lib/icons";
import type { SectionConfig, SectionType } from "@/lib/validation";
import type { HomeSectionDTO } from "@/server/queries/home";
import { getImagesById } from "@/server/queries/home";
import { getRecentPosts } from "@/server/queries/posts";
import { getFeaturedProjects } from "@/server/queries/projects";
import { listPublishedServices } from "@/server/queries/services";
import { getSettings } from "@/server/queries/settings";
import { getSkillGroups } from "@/server/queries/skills";
import { TerminalCard } from "./TerminalCard";

type Props<T extends SectionType> = { config: SectionConfig<T> };

function d(seconds: number) {
  return { ["--d" as string]: `${seconds}s` };
}

function CtaLink({ href, label, variant }: { href: string; label: string; variant: "gold" | "ghost" }) {
  if (!href || !label) return null;
  const external = /^(https?:|mailto:|tel:)/i.test(href);
  const cls = `btn ${variant === "gold" ? "btn-gold" : "btn-ghost"} group`;
  const inner = (
    <>
      {label}
      {variant === "gold" && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
    </>
  );
  return external ? (
    <a href={href} className={cls} {...(/^https?:/i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{inner}</a>
  ) : (
    <Link href={href} className={cls}>{inner}</Link>
  );
}

async function HeroSection({ config }: Props<"HERO">) {
  const images = await getImagesById([config.imageId, config.backgroundImageId].filter(Boolean) as string[]);
  const portrait = config.imageId ? images[config.imageId] : null;
  const background = config.backgroundImageId ? images[config.backgroundImageId] : null;
  return (
    <section className="on-dark relative overflow-hidden">
      {background ? (
        <div aria-hidden="true" className="absolute inset-0 opacity-20">
          <Img image={background} alt="" priority />
        </div>
      ) : null}
      <GridGlow />
      <div className="wrap relative grid items-center gap-14 py-[clamp(72px,10vw,128px)] lg:grid-cols-[1.08fr_0.92fr]">
        <div>
          {config.eyebrow && <span className="eyebrow rise">{config.eyebrow}</span>}
          <h1 className="h-display rise" style={d(0.08)}>
            {config.title}
            {config.highlight && (
              <span className="mt-3 block bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, #F5C861, #D9952B)" }}>
                {config.highlight}
              </span>
            )}
          </h1>
          {config.subtitle && (
            <p className="lead rise mt-7 !max-w-[46ch] text-[1.15rem] sm:text-[1.22rem]" style={d(0.18)}>
              {config.subtitle}
            </p>
          )}
          <div className="btn-row rise mt-9 flex flex-wrap gap-3.5" style={d(0.28)}>
            <CtaLink href={config.primaryCta.href} label={config.primaryCta.label} variant="gold" />
            <CtaLink href={config.secondaryCta.href} label={config.secondaryCta.label} variant="ghost" />
          </div>
          {config.stats.length > 0 && (
            <dl className="rise mt-12 flex flex-wrap gap-x-10 gap-y-6" style={d(0.36)}>
              {config.stats.map((s, i) => (
                <div key={i}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-serif text-4xl font-semibold leading-none text-gold-hi">{s.value}</dd>
                  <dd className="mt-2 text-[0.83rem] tracking-wide text-mist">{s.label}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="rise mx-auto w-full max-w-[520px] lg:max-w-none" style={d(0.2)}>
          {portrait ? (
            <div className="relative">
              <div className="absolute -bottom-4 -right-4 hidden h-[70%] w-[70%] rounded-[22px] md:block" style={{ background: "var(--gold-gradient)" }} />
              <div className="relative z-10 aspect-[4/5] overflow-hidden rounded-[20px]">
                <Img image={portrait} priority sizes="(min-width: 1024px) 520px, 90vw" />
              </div>
            </div>
          ) : (
            <TerminalCard />
          )}
        </div>
      </div>
    </section>
  );
}

async function IntroSection({ config }: Props<"INTRO">) {
  const images = config.imageId ? await getImagesById([config.imageId]) : {};
  const image = config.imageId ? images[config.imageId] : null;
  if (!config.title && !config.body) return null;
  return (
    <section className="section">
      <div className={`wrap grid items-center gap-12 ${image ? "lg:grid-cols-2 lg:gap-16" : "lg:grid-cols-[0.9fr_1.1fr]"}`}>
        {image ? (
          <Reveal className="aspect-[4/5] overflow-hidden rounded-[18px] lg:order-none">
            <Img image={image} sizes="(min-width: 1024px) 540px, 100vw" />
          </Reveal>
        ) : (
          <Reveal>
            {config.eyebrow && <span className="eyebrow">{config.eyebrow}</span>}
            <h2 className="h2">{config.title}</h2>
          </Reveal>
        )}
        <Reveal delay={0.08}>
          {image && (
            <>
              {config.eyebrow && <span className="eyebrow">{config.eyebrow}</span>}
              <h2 className="h2 mb-6">{config.title}</h2>
            </>
          )}
          {config.body.split(/\n{2,}/).map((p, i) => (
            <p key={i} className={`text-[1.08rem] leading-[1.8] text-[#2a3247] ${i ? "mt-5" : ""}`}>{p}</p>
          ))}
          {config.cta.label && config.cta.href && (
            <div className="mt-8">
              <Link href={config.cta.href} className="link-arrow text-base">
                {config.cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

async function ServicesSection({ config }: Props<"SERVICES">) {
  const all = await listPublishedServices();
  const services = config.serviceIds.length
    ? config.serviceIds.map((id) => all.find((s) => s.id === id)).filter((s): s is (typeof all)[number] => Boolean(s))
    : all.filter((s) => s.featured);
  if (!services.length) return null;
  return (
    <section className="section on-paper-2">
      <div className="wrap">
        <SectionHeading
          eyebrow={config.eyebrow}
          title={config.title || "Services"}
          description={config.description}
          action={<Link href="/services" className="link-arrow shrink-0">All services <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 0.07} className="h-full">
              <ServiceCard service={s} index={i} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

async function ProjectsSection({ config }: Props<"PROJECTS">) {
  const projects = await getFeaturedProjects(config.limit, config.projectIds);
  if (!projects.length) return null;
  return (
    <section className="section">
      <div className="wrap">
        <SectionHeading
          eyebrow={config.eyebrow}
          title={config.title || "Projects"}
          description={config.description}
          action={<Link href="/projects" className="link-arrow shrink-0">View all work <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
        />
        <div className="mt-12 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <Reveal key={p.id} delay={(i % 3) * 0.08}>
              <ProjectCard project={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

async function SkillsSection({ config }: Props<"SKILLS">) {
  const groups = await getSkillGroups();
  if (!groups.length) return null;
  return (
    <section className="section on-dark relative overflow-hidden">
      <GridGlow />
      <div className="wrap relative">
        <SectionHeading eyebrow={config.eyebrow} title={config.title || "Technical expertise"} description={config.description} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((g, i) => (
            <Reveal key={g.category} delay={i * 0.07} className="card-dark p-6">
              <h3 className="font-display text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-gold-hi">{g.category}</h3>
              <ul className="mt-5 space-y-3.5">
                {g.skills.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 text-[0.97rem] text-white/90">
                    <Icon name={s.icon || "code"} className="mt-1 h-4 w-4 shrink-0 text-mist" />
                    <span>
                      {s.name}
                      {s.description && <span className="block text-[0.83rem] text-mist">{s.description}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessSection({ config }: Props<"PROCESS">) {
  if (!config.steps.length) return null;
  return (
    <section className="section">
      <div className="wrap">
        <SectionHeading eyebrow={config.eyebrow} title={config.title || "Process"} description={config.description} />
        <ol className="mt-14 grid gap-px overflow-hidden rounded-[18px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {config.steps.map((s, i) => (
            <Reveal as="li" key={i} delay={i * 0.08} className="group relative bg-card p-7 transition-colors hover:bg-paper">
              <span className="font-serif text-5xl font-semibold leading-none text-transparent [-webkit-text-stroke:1px_var(--gold-lo)] transition-colors group-hover:text-gold/25">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="h3 mt-6">{s.title}</h3>
              <p className="mt-3 text-[0.96rem] text-muted">{s.description}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

async function InsightsSection({ config }: Props<"INSIGHTS">) {
  const posts = await getRecentPosts(config.limit, config.postIds);
  if (!posts.length) return null;
  return (
    <section className="section on-paper-2">
      <div className="wrap">
        <SectionHeading
          eyebrow={config.eyebrow}
          title={config.title || "Insights"}
          description={config.description}
          action={<Link href="/insights" className="link-arrow shrink-0">All articles <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <Reveal key={p.id} delay={(i % 3) * 0.08} className="h-full">
              <PostCard post={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function ContactCtaSection({ config }: Props<"CONTACT_CTA">) {
  const s = await getSettings();
  const channels = config.showContactMethods ? contactChannels(s) : [];
  return (
    <section className="section on-dark relative overflow-hidden">
      <GridGlow />
      <div className="wrap relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          {config.eyebrow && <span className="eyebrow">{config.eyebrow}</span>}
          <h2 className="h2">{config.title || s.contactCtaTitle || "Let's work together."}</h2>
          {(config.description || s.contactCtaText) && <p className="lead mt-5">{config.description || s.contactCtaText}</p>}
          <div className="btn-row mt-8 flex flex-wrap gap-3.5">
            <CtaLink href={config.cta.href || "/contact"} label={config.cta.label || "Start a project"} variant="gold" />
          </div>
        </Reveal>
        {channels.length > 0 && (
          <Reveal delay={0.1}>
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {channels.map((c) => (
                <li key={c.key}>
                  <a
                    href={c.href}
                    className="group flex items-center gap-5 py-5"
                    {...(c.key === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 text-gold-hi transition-colors group-hover:border-gold group-hover:bg-gold group-hover:text-ink">
                      <c.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-display text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-mist">{c.label}</span>
                      <span className="block text-lg text-white [overflow-wrap:anywhere]">{c.value}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/** Controlled registry: administrators choose from these section types only — no arbitrary components or code. */
const REGISTRY: { [K in SectionType]: (p: Props<K>) => React.ReactNode | Promise<React.ReactNode> } = {
  HERO: HeroSection,
  INTRO: IntroSection,
  SERVICES: ServicesSection,
  PROJECTS: ProjectsSection,
  SKILLS: SkillsSection,
  PROCESS: ProcessSection,
  INSIGHTS: InsightsSection,
  CONTACT_CTA: ContactCtaSection,
};

export function HomeSections({ sections }: { sections: HomeSectionDTO[] }) {
  return (
    <>
      {sections
        .filter((s) => s.visible)
        .map((s) => {
          const Cmp = REGISTRY[s.type] as (p: { config: unknown }) => React.ReactNode;
          return <Cmp key={s.key} config={s.config} />;
        })}
    </>
  );
}
