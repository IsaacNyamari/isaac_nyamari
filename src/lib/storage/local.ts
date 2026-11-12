import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver } from "./index";
import { isSafeKey } from "./index";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".gif": "image/gif", ".avif": "image/avif", ".pdf": "application/pdf",
};

/** Stores files on the local disk. Production use requires a persistent volume. */
export class LocalStorage implements StorageDriver {
  readonly name = "local";
  // Resolved at runtime only; excluded from build-time file tracing.
  private root = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.LOCAL_STORAGE_DIR ?? "./storage/uploads");

  private resolve(key: string) {
    if (!isSafeKey(key)) throw new Error("Invalid storage key");
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  async put(key: string, body: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  }

  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }

  async get(key: string) {
    try {
      const full = this.resolve(key);
      return { body: await readFile(full), contentType: MIME_BY_EXT[path.extname(full).toLowerCase()] };
    } catch {
      return null;
    }
  }

  urlFor(key: string) {
    return `/media/${key}`;
  }
}
