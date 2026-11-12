import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";

const PREVIEWABLE = /^\/(?:$|about$|privacy$|insights\/[a-z0-9-]+$|projects\/[a-z0-9-]+$|services\/[a-z0-9-]+$|[a-z0-9-]+$)/;

/** Turns on draft mode for signed-in administrators and opens the requested path. */
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });
  const path = new URL(request.url).searchParams.get("path") ?? "/";
  if (!PREVIEWABLE.test(path)) return new Response("Invalid preview path", { status: 400 });
  (await draftMode()).enable();
  redirect(path);
}
