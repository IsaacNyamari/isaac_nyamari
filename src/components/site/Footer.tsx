import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getNavigation, getSettings } from "@/server/queries/settings";
import { listPublishedServices } from "@/server/queries/services";
import { Logo } from "./Logo";
import { contactChannels, socialLinks } from "./ContactIcons";

export async function Footer() {
  const [s, links, services] = await Promise.all([getSettings(), getNavigation("footer"), listPublishedServices()]);
  const channels = contactChannels(s);
  const socials = socialLinks(s);
  const year = new Date().getFullYear();

  return (
    <footer className="bg-deep text-mist">
      {s.footerCtaText && (
        <div className="border-b border-white/10">
          <div className="wrap flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center">
            <p className="max-w-2xl font-serif text-2xl text-white md:text-3xl">{s.footerCtaText}</p>
            <Link href="/contact" className="btn btn-gold group">
              Start a conversation <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
      <div className="wrap grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.8fr_1.3fr_1.5fr]">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo tone="dark" image={s.logoDark} siteName={s.siteName} />
          {s.footerDescription && <p className="mt-5 max-w-sm text-[0.93rem] leading-relaxed text-mist/80">{s.footerDescription}</p>}
          {socials.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Social profiles">
              {socials.map((x) => (
                <li key={x.key}>
                  <a
                    href={x.url}
                    target="_blank"
                    rel="noopener noreferrer me"
                    className="inline-block rounded-full border border-white/15 px-3.5 py-1.5 text-[0.8rem] transition-colors hover:border-gold hover:text-gold-hi"
                  >
                    {x.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <FooterCol title="Explore">
          {links.map((l) =>
            l.external ? (
              <a key={l.id} href={l.href} {...(l.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="footer-link">
                {l.label}
              </a>
            ) : (
              <Link key={l.id} href={l.href} className="footer-link">
                {l.label}
              </Link>
            ),
          )}
        </FooterCol>

        {services.length > 0 && (
          <FooterCol title="Services">
            {services.map((sv) => (
              <Link key={sv.id} href={`/services/${sv.slug}`} className="footer-link">
                {sv.title}
              </Link>
            ))}
          </FooterCol>
        )}

        <FooterCol title="Get in touch">
          {channels.length === 0 && (
            <Link href="/contact" className="footer-link">
              Send a project inquiry
            </Link>
          )}
          {channels.map((c) => (
            <a key={c.key} href={c.href} className="group flex gap-3 py-1.5 text-[0.92rem]" {...(c.key === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              <span className="w-[4.6rem] shrink-0 pt-[3px] font-display text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-gold-hi">{c.label}</span>
              <span className={`min-w-0 transition-colors [overflow-wrap:anywhere] group-hover:text-white ${c.key === "email" ? "" : "whitespace-nowrap"}`}>{c.value}</span>
            </a>
          ))}
          {s.locationText && (
            <p className="flex gap-3 py-1.5 text-[0.92rem]">
              <span className="w-[4.6rem] shrink-0 pt-[3px] font-display text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-gold-hi">Based in</span>
              <span>{s.locationText}</span>
            </p>
          )}
        </FooterCol>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap flex flex-col gap-3 py-6 text-[0.82rem] text-mist/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {s.copyrightText || s.siteName}
          </p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-gold-hi">Privacy</Link>
            <Link href="/contact" className="hover:text-gold-hi">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 font-display text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white">{title}</h2>
      <div className="flex flex-col [&_.footer-link]:py-1.5 [&_.footer-link]:text-[0.92rem] [&_.footer-link]:transition-colors [&_.footer-link:hover]:text-gold-hi">
        {children}
      </div>
    </div>
  );
}
