import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Icon } from "@/lib/icons";
import { cn, formatDate } from "@/lib/utils";
import type { PostCard as PostCardDTO } from "@/server/queries/posts";
import type { ProjectCard as ProjectCardDTO } from "@/server/queries/projects";
import type { ServiceCard as ServiceCardDTO } from "@/server/queries/services";
import { HeaderBackdrop, type HeaderImageKey } from "./HeaderImage";
import { Img } from "./Img";
import { Monogram } from "./Logo";
import { Reveal } from "./Motion";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <Reveal className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", align === "center" && "items-center text-center md:flex-col md:items-center", className)}>
      <div className={cn(align === "center" && "flex flex-col items-center")}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="h2 max-w-3xl">{title}</h2>
        {description && <p className="lead mt-5">{description}</p>}
      </div>
      {action}
    </Reveal>
  );
}

/** Dark intro band used at the top of inner pages. */
export function PageHero({
  eyebrow,
  title,
  description,
  image = "default",
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  image?: HeaderImageKey;
  children?: React.ReactNode;
}) {
  return (
    <section className="on-dark relative overflow-hidden">
      <HeaderBackdrop image={image} />
      <GridGlow />
      <div className="wrap relative py-[clamp(64px,10vw,124px)]">
        {eyebrow && <span className="eyebrow rise">{eyebrow}</span>}
        <h1 className="h1 rise max-w-4xl" style={{ ["--d" as string]: "0.06s" }}>{title}</h1>
        {description && (
          <p className="lead rise mt-6 max-w-2xl" style={{ ["--d" as string]: "0.14s" }}>
            {description}
          </p>
        )}
        {children && <div className="rise mt-8" style={{ ["--d" as string]: "0.22s" }}>{children}</div>}
      </div>
    </section>
  );
}

/** Decorative engineering grid with a soft gold glow, used behind dark bands. */
export function GridGlow() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 70% at 70% 30%, #000 30%, transparent 75%)",
        }}
      />
      <div className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-gold/15 blur-[120px]" />
    </div>
  );
}

export function ServiceCard({ service, index }: { service: ServiceCardDTO; index: number }) {
  return (
    <Link href={`/services/${service.slug}`} className="card card-hover group flex h-full flex-col p-7 sm:p-8">
      <div className="flex items-start justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink text-gold-hi transition-colors group-hover:bg-navy-2">
          <Icon name={service.icon} className="h-5 w-5" />
        </span>
        <span className="font-serif text-3xl font-semibold text-line transition-colors group-hover:text-gold">{String(index + 1).padStart(2, "0")}</span>
      </div>
      <h3 className="h3 mt-6">{service.title}</h3>
      <p className="mt-3 flex-1 text-[0.97rem] text-muted">{service.summary}</p>
      <span className="link-arrow mt-6">
        Learn more <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  );
}

export function ProjectCard({ project, priority }: { project: ProjectCardDTO; priority?: boolean }) {
  return (
    <Link href={`/projects/${project.slug}`} className="group block">
      <div className="img-zoom relative aspect-[4/3] overflow-hidden rounded-[18px] bg-navy">
        {project.cover ? (
          <Img image={project.cover} sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" priority={priority} />
        ) : (
          <Placeholder label={project.title} />
        )}
        <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink opacity-0 transition-all duration-300 group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-5">
        {project.categories.length > 0 && (
          <p className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-gold-text">
            {project.categories.map((c) => c.name).join(" · ")}
          </p>
        )}
        <h3 className="h3 mt-2 transition-colors group-hover:text-navy-2">{project.title}</h3>
        {project.summary && <p className="mt-2 line-clamp-2 text-[0.96rem] text-muted">{project.summary}</p>}
        {project.technologies.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">
            {project.technologies.slice(0, 5).map((t) => (
              <li key={t} className="chip">{t}</li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}

export function PostCard({ post, priority }: { post: PostCardDTO; priority?: boolean }) {
  return (
    <Link href={`/insights/${post.slug}`} className="card card-hover group flex h-full flex-col overflow-hidden">
      <div className="img-zoom aspect-[16/9] bg-navy">
        {post.cover ? (
          <Img image={post.cover} sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" priority={priority} />
        ) : (
          <Placeholder label={post.title} />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem] text-muted">
          {post.category && <span className="font-display font-semibold uppercase tracking-[0.12em] text-gold-text">{post.category.name}</span>}
          {post.publishedAt && <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>}
        </div>
        <h3 className="mt-3 font-serif text-[1.3rem] font-semibold leading-snug">{post.title}</h3>
        {post.excerpt && <p className="mt-3 line-clamp-3 flex-1 text-[0.95rem] text-muted">{post.excerpt}</p>}
        <div className="mt-5 flex items-center justify-between text-[0.8rem] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {post.readingMinutes} min read
          </span>
          <span className="link-arrow">
            Read <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function Placeholder({ label }: { label?: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-navy-2 to-ink">
      <GridGlow />
      <Monogram className="relative h-16 w-16 opacity-90" tone="dark" />
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}

export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (p: number) => string }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="btn btn-ghost !min-h-[42px] !px-3" aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-muted">…</span>}
          <Link
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn("grid h-[42px] min-w-[42px] place-items-center rounded-[10px] border px-3 font-display text-sm font-semibold", p === page ? "border-ink bg-ink text-white" : "border-line hover:border-ink")}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className="btn btn-ghost !min-h-[42px] !px-3" aria-label="Next page">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="card mx-auto max-w-xl p-10 text-center">
      <h2 className="h3">{title}</h2>
      {text && <p className="mt-3 text-muted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  // JSON.stringify output with "<" escaped cannot break out of the script element.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
