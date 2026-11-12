import { invalidate, TAGS } from "@/lib/cache";
import { UserError } from "@/lib/errors";
import { maxUploadBytes } from "@/lib/media";
import { isSameOrigin } from "@/lib/request";
import { AuthError, requireAdmin } from "@/lib/session";
import { createMedia, replaceMedia } from "@/server/services/media";

export const dynamic = "force-dynamic";

const MAX_FILES = 20;

/**
 * Multipart upload: `files` (one or more) or `file` + `replaceId` to swap an asset's file.
 * Requires a valid admin session and a same-origin request. Every file is validated server-side.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  let admin;
  try {
    admin = await requireAdmin("media:write");
  } catch (err) {
    const status = err instanceof AuthError && err.code === "FORBIDDEN" ? 403 : 401;
    return Response.json({ error: (err as Error).message }, { status });
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxUploadBytes() * MAX_FILES + 1024 * 1024) {
    return Response.json({ error: "Upload is too large." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid upload." }, { status: 400 });
  }

  const replaceId = form.get("replaceId");
  const files = [...form.getAll("files"), ...form.getAll("file")].filter((f): f is File => f instanceof File);
  if (!files.length) return Response.json({ error: "No file received." }, { status: 400 });
  if (files.length > MAX_FILES) return Response.json({ error: `Upload at most ${MAX_FILES} files at a time.` }, { status: 400 });

  const results: { name: string; ok: boolean; id?: string; url?: string; error?: string }[] = [];
  for (const file of files) {
    try {
      if (file.size > maxUploadBytes()) throw new UserError(`The file is larger than the ${Math.round(maxUploadBytes() / 1048576)} MB limit.`);
      const upload = { buffer: Buffer.from(await file.arrayBuffer()), filename: file.name, type: file.type };
      const asset =
        typeof replaceId === "string" && replaceId
          ? await replaceMedia(admin.id, replaceId, upload)
          : await createMedia(admin.id, upload);
      results.push({ name: file.name, ok: true, id: asset.id, url: asset.url });
      if (replaceId) break;
    } catch (err) {
      results.push({ name: file.name, ok: false, error: err instanceof UserError ? err.message : "The file could not be processed." });
      if (!(err instanceof UserError)) console.error("[upload]", err);
    }
  }
  if (results.some((r) => r.ok)) invalidate(TAGS.media, TAGS.posts, TAGS.projects, TAGS.services, TAGS.pages, TAGS.settings);
  const status = results.every((r) => !r.ok) ? 422 : 200;
  return Response.json({ results }, { status });
}
