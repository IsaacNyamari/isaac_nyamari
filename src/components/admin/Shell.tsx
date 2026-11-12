"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ExternalLink, FileText, FolderKanban, Gauge, Home, Image as ImageIcon, Inbox, LayoutList, LogOut, Menu, Navigation,
  Newspaper, Rocket, Settings, Sparkles, Tags, UserRound, Wrench, X,
} from "lucide-react";
import { Monogram } from "@/components/site/Logo";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV = [
  { group: "", items: [{ href: "/admin", label: "Overview", icon: Gauge, exact: true }] },
  {
    group: "Content",
    items: [
      { href: "/admin/posts", label: "Posts", icon: Newspaper },
      { href: "/admin/taxonomy", label: "Categories & tags", icon: Tags },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban },
      { href: "/admin/services", label: "Services", icon: Wrench },
      { href: "/admin/pages/homepage", label: "Homepage", icon: Home, exact: true },
      { href: "/admin/pages", label: "Pages", icon: FileText, excludes: ["/admin/pages/homepage"] },
      { href: "/admin/skills", label: "Skills", icon: Sparkles },
      { href: "/admin/media", label: "Media library", icon: ImageIcon },
    ],
  },
  {
    group: "Site",
    items: [
      { href: "/admin/inquiries", label: "Inquiries", icon: Inbox, badge: "inquiries" },
      { href: "/admin/navigation", label: "Navigation", icon: Navigation },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/deploy", label: "Deploy", icon: Rocket },
      { href: "/admin/account", label: "Account", icon: UserRound },
    ],
  },
] as const;

function isActive(pathname: string, item: { href: string; exact?: boolean; excludes?: readonly string[] }) {
  if (item.excludes?.some((x) => pathname.startsWith(x))) return false;
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminShell({ children, user, unread }: { children: React.ReactNode; user: { name: string; email: string }; unread: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Close the menu after navigation (state derived during render, per React guidance).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  async function signOut() {
    await authClient.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const sidebar = (
    <nav aria-label="Dashboard" className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <Monogram className="h-8 w-8" tone="dark" />
        <span className="font-display text-[0.8rem] font-semibold tracking-[0.12em] text-white">DASHBOARD</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((g) => (
          <div key={g.group || "main"} className="mb-5">
            {g.group && <p className="mb-1.5 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-mist/60">{g.group}</p>}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-[0.88rem] transition-colors",
                        active ? "bg-white/10 font-medium text-white" : "text-mist hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <item.icon className={cn("h-4 w-4", active && "text-gold-hi")} aria-hidden="true" />
                      <span className="flex-1">{item.label}</span>
                      {"badge" in item && unread > 0 && (
                        <span className="rounded-full bg-gold px-1.5 text-[0.7rem] font-bold text-ink" aria-label={`${unread} unread`}>{unread}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 p-3">
        <a href="/" target="_blank" rel="noopener" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[0.88rem] text-mist hover:bg-white/5 hover:text-white">
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> View website
        </a>
        <button type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[0.88rem] text-mist hover:bg-white/5 hover:text-white">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 bg-ink lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Dashboard menu">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-ink shadow-2xl">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded p-1.5 text-mist hover:text-white" aria-label="Close menu">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#e3e6ed] bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setOpen(true)} className="-ml-1 rounded-lg p-2 hover:bg-[#eef0f4] lg:hidden" aria-label="Open menu" aria-expanded={open}>
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <form action="/admin/posts" className="hidden sm:block">
              <label htmlFor="admin-search" className="sr-only">Search posts</label>
              <input id="admin-search" name="q" type="search" placeholder="Search posts…" className="admin-input !h-9 !min-h-0 w-64" />
            </form>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/posts/new" className="hidden h-9 items-center gap-2 rounded-lg bg-ink px-3 text-[0.82rem] font-medium text-white hover:bg-navy-2 sm:inline-flex">
              <LayoutList className="h-4 w-4" aria-hidden="true" /> New post
            </Link>
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="hidden text-xs text-[#6b7385] sm:block">{user.email}</p>
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
