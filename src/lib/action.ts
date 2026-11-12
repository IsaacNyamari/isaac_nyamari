import "server-only";
import { ZodError } from "zod";
import { AuthError } from "@/lib/session";
import { UserError } from "@/lib/errors";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function prismaCode(err: unknown): string | undefined {
  return typeof err === "object" && err && "code" in err && typeof (err as { code: unknown }).code === "string"
    ? (err as { code: string }).code
    : undefined;
}

/** Wraps a server action body so every failure becomes a typed, displayable result. */
export async function runAction<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message };
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path.join(".") || "_";
        fieldErrors[key] ??= issue.message;
      }
      const first = Object.entries(fieldErrors)[0];
      return { ok: false, error: first ? `${first[0]}: ${first[1]}` : "Invalid input.", fieldErrors };
    }
    if (err instanceof AuthError) return { ok: false, error: err.message };
    if (err instanceof UserError) return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
    const code = prismaCode(err);
    if (code === "P2002") return { ok: false, error: "That value is already in use (the slug must be unique).", fieldErrors: { slug: "Already in use" } };
    if (code === "P2003") return { ok: false, error: "This item is still referenced by other content and cannot be removed." };
    if (code === "P2025") return { ok: false, error: "The item no longer exists." };
    // Redirect/notFound control-flow errors must propagate
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("[action]", err);
    return { ok: false, error: "Something went wrong while saving. Nothing was changed." };
  }
}
