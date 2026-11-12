import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const MIN_FILL_MS = 2500;
const MAX_AGE_MS = 1000 * 60 * 60 * 24;

function sign(value: string) {
  return createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "dev-secret").update(`form:${value}`).digest("base64url");
}

/** Issued when the form renders; proves the submission came from a recently loaded page. */
export function issueFormToken(now = Date.now()) {
  const ts = String(now);
  return `${ts}.${sign(ts)}`;
}

export function checkFormToken(token: unknown, now = Date.now()): "ok" | "invalid" | "too-fast" | "expired" {
  if (typeof token !== "string") return "invalid";
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return "invalid";
  const expected = Buffer.from(sign(ts));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "invalid";
  const age = now - Number(ts);
  if (!Number.isFinite(age) || age < 0) return "invalid";
  if (age < MIN_FILL_MS) return "too-fast";
  if (age > MAX_AGE_MS) return "expired";
  return "ok";
}
