import "server-only";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";

export interface StorageDriver {
  readonly name: string;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  get(key: string): Promise<{ body: Buffer; contentType?: string } | null>;
  /** Public URL used in rendered pages. */
  urlFor(key: string): string;
}

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (driver) return driver;
  const kind = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();
  driver = kind === "s3" ? new S3Storage() : new LocalStorage();
  return driver;
}

/** Keys are generated server-side and never contain user-controlled path segments. */
export function isSafeKey(key: string) {
  return /^[a-z0-9][a-z0-9/_.-]*$/i.test(key) && !key.includes("..") && !key.includes("//");
}
