"use server";

import { z } from "zod";
import { runAction } from "@/lib/action";
import { invalidate, TAGS } from "@/lib/cache";
import { requireAdmin } from "@/lib/session";
import {
  deleteProject, deleteProjectCategory, discardProjectChanges, reorderProjects, saveProject, saveProjectCategory, type SaveProjectArgs,
  unpublishProject,
} from "@/server/services/projects";

const ids = z.array(z.string().min(1)).max(500);

export async function saveProjectAction(args: SaveProjectArgs) {
  return runAction(async () => {
    const admin = await requireAdmin(args.intent === "publish" ? "content:publish" : "content:write");
    const r = await saveProject(admin.id, args);
    invalidate(TAGS.projects, TAGS.home, TAGS.redirects);
    return r;
  }, args.intent === "publish" ? "Published" : "Draft saved");
}

export async function unpublishProjectAction(id: string) {
  return runAction(async () => {
    const admin = await requireAdmin("content:publish");
    await unpublishProject(admin.id, id);
    invalidate(TAGS.projects, TAGS.home);
    return null;
  }, "Unpublished");
}

export async function discardProjectChangesAction(id: string) {
  return runAction(async () => {
    await requireAdmin("content:write");
    await discardProjectChanges(id);
    return null;
  }, "Unpublished changes discarded");
}

export async function deleteProjectAction(id: string) {
  return runAction(async () => {
    await requireAdmin("content:publish");
    await deleteProject(id);
    invalidate(TAGS.projects, TAGS.home);
    return null;
  }, "Project deleted");
}

export async function reorderProjectsAction(order: string[]) {
  return runAction(async () => {
    await requireAdmin("content:write");
    await reorderProjects(ids.parse(order));
    invalidate(TAGS.projects, TAGS.home);
    return null;
  }, "Order saved");
}

export async function saveProjectCategoryAction(id: string | null, data: unknown) {
  return runAction(async () => {
    await requireAdmin("content:write");
    await saveProjectCategory(id, data);
    invalidate(TAGS.projects);
    return null;
  }, "Category saved");
}

export async function deleteProjectCategoryAction(id: string) {
  return runAction(async () => {
    await requireAdmin("content:publish");
    await deleteProjectCategory(id);
    invalidate(TAGS.projects);
    return null;
  }, "Category deleted");
}
