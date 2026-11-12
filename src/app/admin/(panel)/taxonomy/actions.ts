"use server";

import { runAction } from "@/lib/action";
import { invalidate, TAGS } from "@/lib/cache";
import { requireAdmin } from "@/lib/session";
import { deleteCategory, deleteTag, saveCategory, saveTag } from "@/server/services/taxonomy";

export async function saveCategoryAction(id: string | null, data: unknown) {
  return runAction(async () => {
    await requireAdmin("content:write");
    const c = await saveCategory(id, data);
    invalidate(TAGS.taxonomy, TAGS.posts);
    return { id: c.id };
  }, "Category saved");
}

export async function deleteCategoryAction(id: string) {
  return runAction(async () => {
    await requireAdmin("content:publish");
    await deleteCategory(id);
    invalidate(TAGS.taxonomy, TAGS.posts);
    return null;
  }, "Category deleted");
}

export async function saveTagAction(id: string | null, data: unknown) {
  return runAction(async () => {
    await requireAdmin("content:write");
    const t = await saveTag(id, data);
    invalidate(TAGS.taxonomy, TAGS.posts);
    return { id: t.id };
  }, "Tag saved");
}

export async function deleteTagAction(id: string) {
  return runAction(async () => {
    await requireAdmin("content:publish");
    await deleteTag(id);
    invalidate(TAGS.taxonomy, TAGS.posts);
    return null;
  }, "Tag deleted");
}
