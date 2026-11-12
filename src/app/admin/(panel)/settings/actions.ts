"use server";

import { runAction } from "@/lib/action";
import { invalidate, TAGS } from "@/lib/cache";
import { requireAdmin } from "@/lib/session";
import { updateSettings } from "@/server/services/site";

export async function saveSettingsAction(data: unknown) {
  return runAction(async () => {
    const admin = await requireAdmin("settings:write");
    await updateSettings(admin.id, data);
    invalidate(TAGS.settings, TAGS.nav);
    return null;
  }, "Settings saved");
}
