import { getStorage, isSafeKey } from "@/lib/storage";

/** Serves files from the local storage driver. (With S3 storage, files are served by the bucket/CDN.) */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params;
  const key = parts.join("/");
  if (!isSafeKey(key)) return new Response("Not found", { status: 404 });
  const file = await getStorage().get(key);
  if (!file) return new Response("Not found", { status: 404 });
  const headers: Record<string, string> = {
    "Content-Type": file.contentType ?? "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  };
  if (file.contentType === "application/pdf") headers["Content-Disposition"] = "inline";
  return new Response(new Uint8Array(file.body), { headers });
}
