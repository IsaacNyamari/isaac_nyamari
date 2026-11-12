export type MediaItem = {
  id: string;
  url: string;
  thumbUrl: string;
  filename: string;
  alt: string;
  caption: string;
  description: string;
  width: number | null;
  height: number | null;
  size: number;
  mimeType: string;
  kind: "IMAGE" | "DOCUMENT";
  createdAt: string;
};

export type UploadResult = { name: string; ok: boolean; id?: string; url?: string; error?: string };

/** Uploads through the authenticated route handler (multipart; server validates every file). */
export async function uploadFiles(files: File[], replaceId?: string): Promise<UploadResult[]> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  if (replaceId) form.append("replaceId", replaceId);
  const res = await fetch("/api/admin/media", { method: "POST", body: form });
  let body: { results?: UploadResult[]; error?: string } = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON error */
  }
  if (body.results) return body.results;
  return files.map((f) => ({ name: f.name, ok: false, error: body.error ?? `Upload failed (${res.status}).` }));
}

export const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf,.jpg,.jpeg,.png,.webp,.gif,.avif,.pdf";
