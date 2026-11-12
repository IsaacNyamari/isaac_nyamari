"use server";

import { runAction } from "@/lib/action";
import { invalidate, TAGS } from "@/lib/cache";
import { requireAdmin } from "@/lib/session";
import { deletePage, discardPageChanges, restorePageRevision, savePage, type SavePageArgs, unpublishPage } from "@/server/services/pages";

export async function savePageAction(args: SavePageArgs) {
  return runAction(async () => {
    const admin = await requireAdmin(args.intent === "publish" ? "content:publish" : "content:write");
    const r = await savePage(admin.id, args);
    invalidate(TAGS.pages, TAGS.nav, TAGS.redirects);
    return r;
  }, args.intent === "publish" ? "Published" : "Draft saved");
}

export async function unpublishPageAction(id: string) {
  return runAction(async () => {
    const admin = await requireAdmin("content:publish");
    await unpublishPage(admin.id, id);
    invalidate(TAGS.pages, TAGS.nav);
    return null;
  }, "Unpublished");
}

export async function discardPageChangesAction(id: string) {
  return runAction(async () => {
    await requireAdmin("content:write");
    await discardPageChanges(id);
    return null;
  }, "Unpublished changes discarded");
}

export async function deletePageAction(id: string) {
  return runAction(async () => {
    await requireAdmin("content:publish");
    await deletePage(id);
    invalidate(TAGS.pages, TAGS.nav);
    return null;
  }, "Page deleted");
}

export async function restorePageRevisionAction(revisionId: string) {
  return runAction(async () => {
    const admin = await requireAdmin("content:write");
    return restorePageRevision(admin.id, revisionId);
  }, "Revision restored as a draft");
}
