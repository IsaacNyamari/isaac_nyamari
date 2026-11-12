import "server-only";
import { invalidate, TAGS } from "@/lib/cache";
import { publishDueScheduledPosts } from "@/server/services/posts";

/** Publishes due scheduled posts and refreshes affected public pages. */
export async function runScheduledPublishing(now = new Date()) {
  const published = await publishDueScheduledPosts(now);
  if (published.length) invalidate(TAGS.posts, TAGS.home);
  return published;
}
