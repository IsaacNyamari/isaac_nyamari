import "server-only";
import { permanentRedirect } from "next/navigation";
import { db } from "@/lib/db";

/** If a published URL moved (slug change), redirect permanently instead of returning 404. */
export async function redirectIfMoved(path: string) {
  const r = await db.redirect.findUnique({ where: { fromPath: path }, select: { toPath: true } });
  if (r && r.toPath !== path) permanentRedirect(r.toPath);
}
