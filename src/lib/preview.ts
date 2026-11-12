import "server-only";
import { draftMode } from "next/headers";
import { getAdmin } from "@/lib/session";

/**
 * Draft content is shown only when Next's draft-mode cookie is present AND the request
 * carries a valid administrator session. The cookie alone never exposes drafts.
 */
export async function isPreview() {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return false;
  return Boolean(await getAdmin());
}
