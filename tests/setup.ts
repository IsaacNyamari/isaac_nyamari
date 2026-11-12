import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://isaac:isaac_local_dev@localhost:5544/isaac_test";
process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret-0123";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.SITE_URL = "http://localhost:3000";
process.env.STORAGE_DRIVER = "local";
process.env.LOCAL_STORAGE_DIR = mkdtempSync(path.join(os.tmpdir(), "isaac-media-"));
process.env.EMAIL_DRIVER = "console";
process.env.MEDIA_MAX_UPLOAD_MB = "2";

/** Simulated request context for code that reads headers/cookies/draft mode. */
export const request = ((globalThis as Record<string, unknown>).__testRequest ??= { cookie: "", draft: false }) as {
  cookie: string;
  draft: boolean;
};

vi.mock("next/headers", () => {
  const req = (globalThis as Record<string, unknown>).__testRequest as { cookie: string; draft: boolean };
  return {
    headers: async () => new Headers(req.cookie ? { cookie: req.cookie, host: "localhost:3000" } : { host: "localhost:3000" }),
    cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => undefined, delete: () => undefined, has: () => false }),
    draftMode: async () => ({ isEnabled: req.draft, enable: () => undefined, disable: () => undefined }),
  };
});

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: <T>(fn: T) => fn,
}));

// Silence the console email driver in test output.
vi.spyOn(console, "info").mockImplementation(() => undefined);
