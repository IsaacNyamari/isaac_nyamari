import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { DEFAULT_FOOTER_NAV, DEFAULT_HEADER_NAV } from "@/server/queries/settings";
import { MenuEditor } from "./MenuEditor";

export const metadata = { title: "Navigation" };

export default async function NavigationPage() {
  const [menus, pages] = await Promise.all([
    db.navigationMenu.findMany({ include: { items: { orderBy: { position: "asc" } } } }),
    db.page.findMany({ where: { status: "PUBLISHED" }, select: { title: true, slug: true }, orderBy: { title: "asc" } }),
  ]);
  const itemsFor = (key: "header" | "footer") => {
    const menu = menus.find((m) => m.key === key);
    const source = menu ? menu.items : key === "header" ? DEFAULT_HEADER_NAV.map((d) => ({ ...d, enabled: true })) : DEFAULT_FOOTER_NAV.map((d) => ({ ...d, enabled: true }));
    return source.map((i) => ({ label: i.label, href: i.href, newTab: i.newTab, enabled: i.enabled }));
  };
  const suggestions = [
    { label: "Home", href: "/" }, { label: "About", href: "/about" }, { label: "Services", href: "/services" }, { label: "Projects", href: "/projects" },
    { label: "Insights", href: "/insights" }, { label: "Contact", href: "/contact" }, { label: "Privacy", href: "/privacy" },
    ...pages.filter((p) => !["about", "privacy"].includes(p.slug)).map((p) => ({ label: p.title, href: `/${p.slug}` })),
  ];
  return (
    <>
      <PageHeader title="Navigation" crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Navigation" }]} description="Admin and API addresses can never be linked from public menus." />
      <div className="grid gap-6 xl:grid-cols-2">
        <MenuEditor menuKey="header" title="Header menu" initial={itemsFor("header")} suggestions={suggestions} />
        <MenuEditor menuKey="footer" title="Footer menu" initial={itemsFor("footer")} suggestions={suggestions} />
      </div>
    </>
  );
}
