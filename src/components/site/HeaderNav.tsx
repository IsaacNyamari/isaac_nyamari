"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { NavLink } from "@/server/queries/settings";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavAnchor({ link, className, onClick, current }: { link: NavLink; className?: string; onClick?: () => void; current?: boolean }) {
  if (link.external) {
    return (
      <a href={link.href} className={className} onClick={onClick} {...(link.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className} onClick={onClick} aria-current={current ? "page" : undefined}>
      {link.label}
    </Link>
  );
}

export function HeaderNav({ links, ctaLabel, ctaHref }: { links: NavLink[]; ctaLabel: string; ctaHref: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close the menu after navigation (state derived during render, per React guidance).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
        {links.map((l) => (
          <NavAnchor key={l.id} link={l} current={isActive(pathname, l.href)} className="nav-link font-display text-[0.86rem] font-semibold tracking-wide" />
        ))}
        <Link href={ctaHref} className="btn btn-gold !min-h-[42px] !px-5 !py-2">
          {ctaLabel}
        </Link>
      </nav>

      <button
        type="button"
        className="relative -mr-2 flex h-12 w-12 flex-col items-center justify-center gap-[5px] lg:hidden"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "block h-[2px] w-6 rounded bg-white transition-all duration-300",
              open && i === 0 && "translate-y-[7px] rotate-45",
              open && i === 1 && "opacity-0",
              open && i === 2 && "-translate-y-[7px] -rotate-45",
            )}
          />
        ))}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={panelRef}
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-x-0 top-full h-[calc(100dvh-100%)] overflow-y-auto border-t border-white/10 bg-ink px-4 pb-10 pt-2 sm:px-6 lg:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {links.map((l) => (
                <NavAnchor
                  key={l.id}
                  link={l}
                  current={isActive(pathname, l.href)}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "border-b border-white/10 py-4 font-serif text-2xl",
                    isActive(pathname, l.href) ? "text-gold-hi" : "text-white",
                  )}
                />
              ))}
              <Link href={ctaHref} onClick={() => setOpen(false)} className="btn btn-gold mt-8 w-full">
                {ctaLabel}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
