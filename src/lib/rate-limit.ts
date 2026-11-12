import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export function hashIdentifier(value: string) {
  return createHash("sha256").update(`${process.env.BETTER_AUTH_SECRET ?? ""}:${value}`).digest("hex").slice(0, 32);
}

/** Fixed-window limiter stored in PostgreSQL so it works across server instances. */
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limit_buckets ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN rate_limit_buckets."resetAt" <= ${now} THEN 1 ELSE rate_limit_buckets."count" + 1 END,
      "resetAt" = CASE WHEN rate_limit_buckets."resetAt" <= ${now} THEN ${resetAt} ELSE rate_limit_buckets."resetAt" END
    RETURNING "count"`;
  const count = rows[0]?.count ?? 1;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
