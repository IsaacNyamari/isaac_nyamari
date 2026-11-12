"use server";

import { z } from "zod";
import { runAction } from "@/lib/action";
import { invalidate, TAGS } from "@/lib/cache";
import { requireAdmin } from "@/lib/session";
import { saveNavigation } from "@/server/services/site";

export async function saveNavigationAction(key: "header" | "footer", data: unknown) {
  return runAction(async () => {
    await requireAdmin("navigation:write");
    await saveNavigation(z.enum(["header", "footer"]).parse(key), data);
    invalidate(TAGS.nav);
    return null;
  }, "Navigation saved");
}
