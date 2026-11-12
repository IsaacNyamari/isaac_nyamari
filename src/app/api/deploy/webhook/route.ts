import { createHmac, timingSafeEqual } from "node:crypto";
import { UserError } from "@/lib/errors";
import { deployEnabled, startDeploy } from "@/server/services/deploy";

export const dynamic = "force-dynamic";

function validSignature(body: string, header: string | null) {
  const secret = process.env.DEPLOY_WEBHOOK_SECRET;
  if (!secret || secret.length < 16 || !header) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(body).digest("hex")}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * GitHub webhook (Settings → Webhooks, content type application/json, event "push").
 * A push to the deploy branch starts scripts/deploy.sh. Requests are authenticated by the HMAC signature.
 */
export async function POST(request: Request) {
  const body = await request.text();
  if (!validSignature(body, request.headers.get("x-hub-signature-256"))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  const event = request.headers.get("x-github-event");
  if (event === "ping") return Response.json({ ok: true, pong: true });
  if (event !== "push") return Response.json({ ok: true, skipped: `ignored ${event} event` });

  let payload: { ref?: string; pusher?: { name?: string }; deleted?: boolean };
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "Bad payload" }, { status: 400 });
  }
  const branch = process.env.DEPLOY_BRANCH || "main";
  if (payload.ref !== `refs/heads/${branch}` || payload.deleted) {
    return Response.json({ ok: true, skipped: `not a push to ${branch}` });
  }
  if (!deployEnabled()) return Response.json({ ok: true, skipped: "deploys disabled" });
  try {
    startDeploy(`GitHub push by ${payload.pusher?.name ?? "unknown"}`);
    return Response.json({ ok: true, started: true }, { status: 202 });
  } catch (err) {
    if (err instanceof UserError) return Response.json({ ok: true, skipped: err.message }, { status: 202 });
    console.error("[deploy-webhook]", err);
    return Response.json({ error: "Could not start deploy" }, { status: 500 });
  }
}
