import "server-only";
import type { Prisma } from "@/generated/prisma/client";

export type Tx = Prisma.TransactionClient;
export type SaveIntent = "draft" | "publish" | "schedule";

/**
 * Records that a published URL moved. Existing redirects pointing at the old path are
 * re-pointed so chains never form, and a redirect that would shadow the new path is removed.
 */
export async function recordRedirect(tx: Tx, fromPath: string, toPath: string) {
  if (fromPath === toPath) return;
  await tx.redirect.deleteMany({ where: { fromPath: toPath } });
  await tx.redirect.updateMany({ where: { toPath: fromPath }, data: { toPath } });
  await tx.redirect.upsert({
    where: { fromPath },
    create: { fromPath, toPath, statusCode: 308 },
    update: { toPath },
  });
}

/** Stored as JSON: dates become ISO strings, undefined is dropped. */
export function toJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export const REVISIONS_TO_KEEP = 30;
