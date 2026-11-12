/**
 * Optional in-process scheduler for long-running Node servers (INTERNAL_SCHEDULER=true).
 * It calls the authenticated cron endpoint every minute so publishing and cache invalidation
 * run inside a normal request. Serverless hosts should use an external cron instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.INTERNAL_SCHEDULER !== "true" || !process.env.CRON_SECRET) return;
  const g = globalThis as unknown as { __publishTimer?: NodeJS.Timeout };
  if (g.__publishTimer) return;

  const port = process.env.PORT ?? "3000";
  const target = `http://127.0.0.1:${port}/api/cron/publish`;
  g.__publishTimer = setInterval(() => {
    fetch(target, { method: "POST", headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } })
      .then(async (res) => {
        if (!res.ok) return;
        const body = (await res.json()) as { published?: string[] };
        if (body.published?.length) console.info(`[scheduler] published: ${body.published.join(", ")}`);
      })
      .catch(() => {
        /* server not ready yet or shutting down */
      });
  }, 60_000);
  g.__publishTimer.unref?.();
}
