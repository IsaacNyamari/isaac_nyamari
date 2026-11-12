import { db } from "@/lib/db";
import { consumeRateLimit, hashIdentifier } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

/** Increments an article's view counter: published posts only, once per visitor per post per hour. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return new Response(null, { status: 204 });
  const ip = clientIp(request);
  const { allowed } = await consumeRateLimit(`view:${id}:${hashIdentifier(ip)}`, 1, 3600);
  if (allowed) {
    await db.post.updateMany({ where: { id, status: "PUBLISHED" }, data: { viewCount: { increment: 1 } } });
  }
  return new Response(null, { status: 204 });
}
