import "server-only";
import { randomBytes } from "node:crypto";
import type { Metadata, Sharp, SharpOptions } from "sharp";
import { UserError } from "@/lib/errors";
import { getStorage } from "@/lib/storage";

type SharpFactory = (input?: Buffer, options?: SharpOptions) => Sharp;
let sharpModule: SharpFactory | null = null;

/**
 * The native image library is loaded only when an upload is processed, so a host where it
 * cannot load still serves every page; uploads then fail with a clear message instead.
 */
async function loadSharp(): Promise<SharpFactory> {
  if (sharpModule) return sharpModule;
  try {
    sharpModule = (await import("sharp")).default as unknown as SharpFactory;
    return sharpModule;
  } catch (err) {
    console.error("[media] sharp failed to load:", (err as Error).message);
    throw new UserError("Image processing is unavailable on this server (the image library could not load). See the deployment guide's troubleshooting section.");
  }
}

export type MediaVariant = { width: number; height: number; key: string; url: string; size: number };

const IMAGE_FORMATS: Record<string, { mime: string; exts: string[] }> = {
  jpeg: { mime: "image/jpeg", exts: ["jpg", "jpeg"] },
  png: { mime: "image/png", exts: ["png"] },
  webp: { mime: "image/webp", exts: ["webp"] },
  gif: { mime: "image/gif", exts: ["gif"] },
  heif: { mime: "image/avif", exts: ["avif"] },
};
const ALLOWED_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "pdf"]);
export const VARIANT_WIDTHS = [320, 768, 1280, 1920];
const MAX_PIXELS = 50_000_000;

export function maxUploadBytes() {
  const mb = Number(process.env.MEDIA_MAX_UPLOAD_MB ?? 10);
  return (Number.isFinite(mb) && mb > 0 ? mb : 10) * 1024 * 1024;
}

export type ValidatedUpload =
  | { kind: "IMAGE"; ext: string; mime: string; width: number; height: number; animated: boolean }
  | { kind: "DOCUMENT"; ext: "pdf"; mime: "application/pdf" };

/**
 * Validates uploaded bytes. The client-supplied MIME type is never trusted: the file
 * extension must be allowed, the decoded content must match it, and size/dimension limits apply.
 */
export async function validateUpload(buffer: Buffer, filename: string, declaredType?: string): Promise<ValidatedUpload> {
  if (!buffer.length) throw new UserError("The file is empty.");
  if (buffer.length > maxUploadBytes()) {
    throw new UserError(`The file is larger than the ${Math.round(maxUploadBytes() / 1048576)} MB limit.`);
  }
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  if (ext === "svg" || declaredType === "image/svg+xml" || /<svg[\s>]/i.test(buffer.subarray(0, 1024).toString("utf8"))) {
    throw new UserError("SVG uploads are disabled because they can contain executable script.");
  }
  if (!ALLOWED_EXTS.has(ext)) throw new UserError(`Files of type .${ext || "unknown"} are not supported.`);

  if (ext === "pdf") {
    if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") throw new UserError("The file is not a valid PDF.");
    return { kind: "DOCUMENT", ext: "pdf", mime: "application/pdf" };
  }

  const sharp = await loadSharp();
  let meta: Metadata;
  try {
    meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw new UserError("The file could not be read as an image.");
  }
  const format = meta.format === "heif" && meta.compression === "av1" ? "heif" : meta.format;
  const info = format ? IMAGE_FORMATS[format] : undefined;
  if (!info || !info.exts.includes(ext)) {
    throw new UserError("The file content does not match its extension.");
  }
  if (declaredType && declaredType !== "application/octet-stream" && declaredType !== info.mime && !(info.mime === "image/jpeg" && declaredType === "image/jpg")) {
    throw new UserError("The declared file type does not match its content.");
  }
  if (!meta.width || !meta.height) throw new UserError("The image has no dimensions.");
  return {
    kind: "IMAGE",
    ext,
    mime: info.mime,
    width: meta.width,
    height: meta.autoOrient?.height ?? meta.height,
    animated: (meta.pages ?? 1) > 1,
  };
}

function newBaseKey() {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}/${month}/${randomBytes(10).toString("hex")}`;
}

export type StoredMedia = {
  kind: "IMAGE" | "DOCUMENT";
  storageKey: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  variants: MediaVariant[];
};

/** Writes the validated file (EXIF stripped, auto-oriented) and responsive WebP variants. */
export async function storeUpload(buffer: Buffer, v: ValidatedUpload): Promise<StoredMedia> {
  const storage = getStorage();
  const base = newBaseKey();

  if (v.kind === "DOCUMENT") {
    const key = `${base}.pdf`;
    await storage.put(key, buffer, v.mime);
    return { kind: "DOCUMENT", storageKey: key, url: storage.urlFor(key), mimeType: v.mime, size: buffer.length, width: null, height: null, variants: [] };
  }

  const sharp = await loadSharp();
  const key = `${base}.${v.ext === "jpeg" ? "jpg" : v.ext}`;
  // Re-encoding drops metadata (EXIF/GPS) and anything that is not image data.
  const pipeline = sharp(buffer, { animated: v.animated, limitInputPixels: MAX_PIXELS }).rotate();
  const original =
    v.mime === "image/png" ? await pipeline.png().toBuffer({ resolveWithObject: true })
    : v.mime === "image/webp" ? await pipeline.webp({ quality: 90 }).toBuffer({ resolveWithObject: true })
    : v.mime === "image/gif" ? await pipeline.gif().toBuffer({ resolveWithObject: true })
    : v.mime === "image/avif" ? await pipeline.avif({ quality: 70 }).toBuffer({ resolveWithObject: true })
    : await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  await storage.put(key, original.data, v.mime);

  const width = original.info.width;
  const height = v.animated ? (original.info.pageHeight ?? original.info.height) : original.info.height;
  const variants: MediaVariant[] = [];
  const widths = VARIANT_WIDTHS.filter((w, i) => w < width || i === 0);
  for (const w of widths) {
    const out = await sharp(buffer, { limitInputPixels: MAX_PIXELS })
      .rotate()
      .resize({ width: Math.min(w, width), withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    const vKey = `${base}-w${w}.webp`;
    await storage.put(vKey, out.data, "image/webp");
    variants.push({ width: out.info.width, height: out.info.height, key: vKey, url: storage.urlFor(vKey), size: out.data.length });
  }

  return { kind: "IMAGE", storageKey: key, url: storage.urlFor(key), mimeType: v.mime, size: original.data.length, width, height, variants };
}

export async function deleteStoredFiles(storageKey: string, variants: unknown) {
  const storage = getStorage();
  const keys = [storageKey, ...parseVariants(variants).map((x) => x.key)];
  await Promise.allSettled(keys.map((k) => storage.delete(k)));
}

export function parseVariants(value: unknown): MediaVariant[] {
  return Array.isArray(value) ? (value as MediaVariant[]).filter((x) => x && typeof x.url === "string") : [];
}
