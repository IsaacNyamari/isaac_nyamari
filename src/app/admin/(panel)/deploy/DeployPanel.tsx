"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Rocket, XCircle } from "lucide-react";
import { useAction } from "@/components/admin/hooks";
import { Button, Card } from "@/components/admin/ui";
import type { DeployInfo } from "@/server/services/deploy";
import { deployStatusAction, startDeployAction } from "./actions";

const STEPS = [
  { id: "fetch", label: "Fetch" },
  { id: "update", label: "Update code" },
  { id: "install", label: "Install" },
  { id: "migrate", label: "Migrate DB" },
  { id: "build", label: "Build" },
  { id: "restart", label: "Restart" },
];

type Live = Pick<DeployInfo, "state" | "step" | "message" | "started" | "trigger" | "log">;

export function DeployPanel({ initial }: { initial: DeployInfo }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [live, setLive] = useState<Live>(initial);
  const [offline, setOffline] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);
  const watched = useRef(initial.state === "running");

  const running = live.state === "running";

  useEffect(() => {
    if (!running) return;
    watched.current = true;
    const t = setInterval(async () => {
      try {
        const res = await deployStatusAction();
        if (res.ok) {
          setLive(res.data);
          setOffline(false);
        }
      } catch {
        // The service restarts at the end of a deploy; keep polling until it is back.
        setOffline(true);
      }
    }, 2000);
    return () => clearInterval(t);
  }, [running]);

  // When a deploy we watched has finished, refresh version / pending changes / history.
  useEffect(() => {
    if (!running && watched.current && live.state !== "idle") {
      watched.current = false;
      router.refresh();
    }
  }, [running, live.state, router]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [live.log]);

  function deploy() {
    if (!window.confirm("Deploy the latest changes to the live website now?")) return;
    run(() => startDeployAction(), { onSuccess: () => setLive((l) => ({ ...l, state: "running", step: "fetch", message: "Starting…", log: "" })) });
  }

  if (!initial.enabled) {
    return (
      <Card title="Deploys are disabled">
        <p className="text-sm text-[#6b7385]">Set <code>DEPLOY_ENABLED=true</code> in the server environment (production only) to enable one-click deploys.</p>
      </Card>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === live.step);
  const pendingCount = initial.pending.length;
  const title = running ? "Deploying…" : live.state === "success" ? "Last deploy succeeded" : live.state === "failed" ? "Last deploy failed" : "Last deploy";

  return (
    <div className="grid max-w-5xl gap-6">
      <Card
        title="Live site"
        description={`Branch: ${initial.branch}`}
        actions={
          <Button variant="primary" loading={pending} disabled={running || pending} onClick={deploy}>
            <Rocket className="h-4 w-4" aria-hidden="true" />
            {running ? "Deploying…" : pendingCount ? `Deploy ${pendingCount} change${pendingCount > 1 ? "s" : ""}` : "Redeploy"}
          </Button>
        }
      >
        <p className="text-sm">
          {initial.current ? (<>Running <code>{initial.current.hash}</code> — {initial.current.subject}</>) : "Current version unknown."}
        </p>
        {initial.fetchError && <p className="mt-2 text-sm text-danger">{initial.fetchError}</p>}
        {!initial.fetchError && !running && (
          <p className="mt-2 text-sm text-[#6b7385]">{pendingCount ? `${pendingCount} new commit${pendingCount > 1 ? "s" : ""} on GitHub waiting to be deployed.` : "Up to date with GitHub."}</p>
        )}
      </Card>

      {!running && pendingCount > 0 && (
        <Card title="Changes to be deployed">
          <ul className="divide-y divide-[#eef0f4] text-sm">
            {initial.pending.map((c) => (
              <li key={c.hash} className="flex items-baseline gap-3 py-2">
                <code className="shrink-0 text-xs text-[#6b7385]">{c.hash}</code>
                <span className="min-w-0 flex-1 truncate">{c.subject}</span>
                <span className="shrink-0 text-xs text-[#6b7385]">{c.author} · {new Date(c.date).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(running || live.log) && (
        <Card title={title} description={live.message}>
          <ol className="mb-4 flex flex-wrap gap-2 text-xs">
            {STEPS.map((s, i) => {
              const done = live.state === "success" || stepIndex > i;
              const active = running && stepIndex === i;
              const failed = live.state === "failed" && stepIndex === i;
              return (
                <li key={s.id} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${done ? "border-success/40 text-success" : active ? "border-ink text-ink" : failed ? "border-danger/40 text-danger" : "border-[#d5d9e2] text-[#6b7385]"}`}>
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : failed ? <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  {s.label}
                </li>
              );
            })}
          </ol>
          {offline && <p className="mb-2 text-xs text-amber-700">Server is restarting — reconnecting…</p>}
          <pre ref={logRef} className="max-h-80 overflow-auto rounded-lg bg-ink p-3 text-xs leading-relaxed text-white/90" aria-label="Deploy log">{live.log || "Waiting for output…"}</pre>
        </Card>
      )}

      <Card title="Auto-deploy on push" description="GitHub webhook → /api/deploy/webhook">
        <p className="text-sm text-[#6b7385]">
          {initial.webhook
            ? `Enabled: every push to ${initial.branch} deploys automatically. If a push arrives while a deploy is running it is skipped — click Deploy afterwards.`
            : "Disabled. Set DEPLOY_WEBHOOK_SECRET (16+ characters) on the server and add a GitHub push webhook to enable it."}
        </p>
      </Card>

      <Card title="History">
        {initial.history.length === 0 ? (
          <p className="text-sm text-[#6b7385]">No deploys yet.</p>
        ) : (
          <ul className="divide-y divide-[#eef0f4] text-sm">
            {initial.history.map((h, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                {h.state === "success" ? <CheckCircle2 className="h-4 w-4 text-success" aria-label="Succeeded" /> : <XCircle className="h-4 w-4 text-danger" aria-label="Failed" />}
                <span>{h.message}</span>
                <code className="text-xs text-[#6b7385]">{h.from} → {h.to}</code>
                <span className="ml-auto text-xs text-[#6b7385]">{new Date(h.at).toLocaleString()} · {h.trigger}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
