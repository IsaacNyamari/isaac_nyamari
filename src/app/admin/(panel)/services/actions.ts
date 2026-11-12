"use server";

import { z } from "zod";
import { runAction } from "@/lib/action";
import { invalidate, TAGS } from "@/lib/cache";
import { requireAdmin } from "@/lib/session";
import { deleteService, discardServiceChanges, reorderServices, saveService, type SaveServiceArgs, unpublishService } from "@/server/services/services";

export async function saveServiceAction(args: SaveServiceArgs) {
  return runAction(async () => {
    const admin = await requireAdmin(args.intent === "publish" ? "content:publish" : "content:write");
    const r = await saveService(admin.id, args);
    invalidate(TAGS.services, TAGS.home, TAGS.redirects);
    return r;
  }, args.intent === "publish" ? "Published" : "Draft saved");
}

export async function unpublishServiceAction(id: string) {
  return runAction(async () => {
    const admin = await requireAdmin("content:publish");
    await unpublishService(admin.id, id);
    invalidate(TAGS.services, TAGS.home);
    return null;
  }, "Unpublished");
}

export async function discardServiceChangesAction(id: string) {
  return runAction(async () => {
    await requireAdmin("content:write");
    await discardServiceChanges(id);
    return null;
  }, "Unpublished changes discarded");
}

export async function deleteServiceAction(id: string) {
  return runAction(async () => {
    await requireAdmin("content:publish");
    await deleteService(id);
    invalidate(TAGS.services, TAGS.home);
    return null;
  }, "Service deleted");
}

export async function reorderServicesAction(order: string[]) {
  return runAction(async () => {
    await requireAdmin("content:write");
    await reorderServices(z.array(z.string().min(1)).max(100).parse(order));
    invalidate(TAGS.services, TAGS.home);
    return null;
  }, "Order saved");
}
