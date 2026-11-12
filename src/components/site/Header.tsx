import { getNavigation, getSettings } from "@/server/queries/settings";
import { Logo } from "./Logo";
import { HeaderNav } from "./HeaderNav";
import { contactChannels, socialLinks } from "./ContactIcons";

export async function Header() {
  const [settings, links] = await Promise.all([getSettings(), getNavigation("header")]);
  const channels = contactChannels(settings).filter((c) => c.key !== "whatsapp");
  const socials = socialLinks(settings);
  const hasTopBar = channels.length > 0 || socials.length > 0;

  return (
    <>
      {hasTopBar && (
        <div className="hidden border-b border-white/10 bg-deep text-[0.8rem] text-mist md:block">
          <div className="wrap flex h-9 items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {channels.map((c) => (
                <a key={c.key} href={c.href} className="inline-flex items-center gap-2 transition-colors hover:text-gold-hi">
                  <c.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{c.value}</span>
                </a>
              ))}
            </div>
            <div className="flex items-center gap-5">
              {socials.map((s) => (
                <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer me" className="font-medium transition-colors hover:text-gold-hi">
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/[0.94] backdrop-blur-md supports-[backdrop-filter]:bg-ink/[0.86]">
        <div className="wrap relative flex h-[72px] items-center justify-between gap-6">
          <Logo tone="dark" image={settings.logoDark} siteName={settings.siteName} />
          <HeaderNav links={links} ctaLabel="Let's talk" ctaHref="/contact" />
        </div>
      </header>
    </>
  );
}
