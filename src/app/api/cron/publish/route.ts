import { timingSafeEqual } from "node:crypto";
import { runScheduledPublishing } from "@/server/scheduler";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get("authorization") ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Called by an external scheduler (Vercel Cron, system cron, uptime monitor) every minute. */
async function handle(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const published = await runScheduledPublishing();
  return Response.json({ published: published.map((p) => p.slug), at: new Date().toISOString() });
}

export const GET = handle;
export const POST = handle;
