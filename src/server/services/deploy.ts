import "server-only";
import { execFile, spawn } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { UserError } from "@/lib/errors";

const run = promisify(execFile);

const APP_DIR = process.env.APP_DIR || process.cwd();
const STATE_DIR = process.env.DEPLOY_STATE_DIR || "/var/www/isaac-data/deploy";
const BRANCH = process.env.DEPLOY_BRANCH || "main";
const STALE_MS = 30 * 60 * 1000;

export type DeployState = "idle" | "running" | "success" | "failed";
export type DeployCommit = { hash: string; subject: string; author: string; date: string };
export type DeployHistoryItem = { at: string; state: string; from: string; to: string; trigger: string; message: string };
export type DeployInfo = {
  enabled: boolean;
  webhook: boolean;
  branch: string;
  state: DeployState;
  step: string;
  message: string;
  started: string;
  trigger: string;
  current: DeployCommit | null;
  pending: DeployCommit[];
  fetchError: string | null;
  log: string;
  history: DeployHistoryItem[];
};

export function deployEnabled() {
  return process.env.DEPLOY_ENABLED === "true";
}

function git(args: string[], timeout = 20000) {
  return run("git", args, { cwd: APP_DIR, timeout }).then((r) => r.stdout.trim());
}

function parseKv(file: string): Record<string, string> {
  try {
    const out: Record<string, string> = {};
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const i = line.indexOf("=");
      if (i > 0) out[line.slice(0, i)] = line.slice(i + 1);
    }
    return out;
  } catch {
    return {};
  }
}

function tail(file: string, maxChars = 12000) {
  try {
    const s = readFileSync(file, "utf8");
    return s.length > maxChars ? s.slice(-maxChars) : s;
  } catch {
    return "";
  }
}

function commits(raw: string): DeployCommit[] {
  return raw
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [hash, subject, author, date] = l.split("\u001f");
      return { hash, subject, author, date };
    });
}

function lockActive() {
  const lock = join(STATE_DIR, "lock");
  if (!existsSync(lock)) return false;
  // A crashed deploy must not block forever.
  return Date.now() - statSync(lock).mtimeMs < STALE_MS;
}

/** Light-weight status (no git fetch) — used for polling while a deploy runs. */
export function readDeployStatus(): Pick<DeployInfo, "state" | "step" | "message" | "started" | "trigger" | "log"> {
  const kv = parseKv(join(STATE_DIR, "status"));
  let state = (kv.state as DeployState) || "idle";
  if (state === "running" && !lockActive()) state = "failed";
  return { state, step: kv.step ?? "", message: kv.message ?? "", started: kv.started ?? "", trigger: kv.trigger ?? "", log: tail(join(STATE_DIR, "deploy.log")) };
}

function readHistory(): DeployHistoryItem[] {
  return tail(join(STATE_DIR, "history.log"), 20000)
    .split("\n")
    .filter(Boolean)
    .slice(-10)
    .reverse()
    .map((l) => {
      const [at, state, from, to, trigger, ...msg] = l.split("|");
      return { at, state, from, to, trigger, message: msg.join("|") };
    });
}

export async function getDeployInfo(): Promise<DeployInfo> {
  const status = readDeployStatus();
  const base: DeployInfo = { enabled: deployEnabled(), webhook: (process.env.DEPLOY_WEBHOOK_SECRET ?? "").length >= 16, branch: BRANCH, ...status, current: null, pending: [], fetchError: null, history: readHistory() };
  if (!base.enabled) return base;
  const fmt = "--format=%h%x1f%s%x1f%an%x1f%cI";
  try {
    base.current = commits(await git(["log", "-1", fmt, "HEAD"]))[0] ?? null;
  } catch {
    /* not a git checkout */
  }
  if (status.state !== "running") {
    try {
      await git(["fetch", "--quiet", "origin", BRANCH], 25000);
      base.pending = commits(await git(["log", "-30", fmt, `HEAD..origin/${BRANCH}`]));
    } catch {
      base.fetchError = "Could not reach GitHub to check for new changes.";
    }
  }
  return base;
}

/** Starts scripts/deploy.sh detached from this process, so it survives the service restart. */
export function startDeploy(triggeredBy: string) {
  if (!deployEnabled()) throw new UserError("Deploys are disabled on this server (DEPLOY_ENABLED is not set).");
  if (lockActive()) throw new UserError("A deploy is already running.");
  const script = join(APP_DIR, "scripts", "deploy.sh");
  if (!existsSync(script)) throw new UserError("scripts/deploy.sh was not found.");
  const fd = openSync("/dev/null", "w");
  try {
    const child = spawn("bash", [script], {
      cwd: APP_DIR,
      detached: true,
      stdio: ["ignore", fd, fd],
      env: { ...process.env, APP_DIR, DEPLOY_STATE_DIR: STATE_DIR, DEPLOY_BRANCH: BRANCH, DEPLOY_TRIGGER: triggeredBy.slice(0, 60).replace(/[|\n]/g, " ") },
    });
    child.unref();
  } finally {
    closeSync(fd);
  }
}
