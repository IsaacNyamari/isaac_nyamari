import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

export const TAGS = {
  posts: "posts",
  taxonomy: "taxonomy",
  projects: "projects",
  services: "services",
  pages: "pages",
  home: "home",
  settings: "settings",
  nav: "nav",
  skills: "skills",
  media: "media",
  redirects: "redirects",
} as const;

export type CacheTag = (typeof TAGS)[keyof typeof TAGS];

/**
 * Expire cached public data immediately after a mutation and re-render public routes.
 * Safe to call outside a request (e.g. from tests or the in-process scheduler).
 */
export function invalidate(...tags: CacheTag[]) {
  try {
    for (const tag of new Set(tags)) revalidateTag(tag, { expire: 0 });
    revalidatePath("/", "layout");
  } catch (err) {
    if (process.env.NODE_ENV !== "test") console.warn("[cache] invalidate skipped:", (err as Error).message);
  }
}
