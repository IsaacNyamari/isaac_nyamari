export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Top-level paths that managed pages may never claim. */
export const RESERVED_PAGE_SLUGS = new Set([
  "admin", "api", "media", "insights", "projects", "services", "contact", "about", "privacy",
  "search", "preview", "sitemap.xml", "robots.txt", "_next", "favicon.ico", "icon", "apple-icon",
  "opengraph-image", "login", "logout", "static", "brand",
]);
