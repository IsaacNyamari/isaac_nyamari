"use server";

import { z } from "zod";
import { runAction } from "@/lib/action";
import { invalidate, TAGS } from "@/lib/cache";
import { requireAdmin } from "@/lib/session";
import { deleteSkill, reorderSkills, saveSkill } from "@/server/services/site";

export async function saveSkillAction(id: string | null, data: unknown) {
  return runAction(async () => {
    await requireAdmin("content:write");
    const s = await saveSkill(id, data);
    invalidate(TAGS.skills);
    return { id: s.id };
  }, "Skill saved");
}

export async function deleteSkillAction(id: string) {
  return runAction(async () => {
    await requireAdmin("content:write");
    await deleteSkill(id);
    invalidate(TAGS.skills);
    return null;
  }, "Skill deleted");
}

export async function reorderSkillsAction(ids: string[]) {
  return runAction(async () => {
    await requireAdmin("content:write");
    await reorderSkills(z.array(z.string().min(1)).max(500).parse(ids));
    invalidate(TAGS.skills);
    return null;
  }, "Order saved");
}
