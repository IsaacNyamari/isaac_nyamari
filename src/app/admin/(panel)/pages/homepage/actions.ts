"use server";

import { runAction } from "@/lib/action";
import { invalidate, TAGS } from "@/lib/cache";
import { requireAdmin } from "@/lib/session";
import { publishHome, resetHomeDraft, saveHomeDraft } from "@/server/services/site";

export async function saveHomeDraftAction(sections: unknown) {
  return runAction(async () => {
    await requireAdmin("content:write");
    await saveHomeDraft(sections);
    return null;
  }, "Draft saved — preview it before publishing");
}

export async function publishHomeAction(sections: unknown) {
  return runAction(async () => {
    await requireAdmin("content:publish");
    await saveHomeDraft(sections);
    await publishHome();
    invalidate(TAGS.home);
    return null;
  }, "Homepage published");
}

export async function resetHomeDraftAction() {
  return runAction(async () => {
    await requireAdmin("content:write");
    return resetHomeDraft();
  }, "Draft reset to the live homepage");
}
