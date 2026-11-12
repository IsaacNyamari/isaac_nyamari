"use server";

import { runAction } from "@/lib/action";
import { invalidate, TAGS } from "@/lib/cache";
import { requireAdmin } from "@/lib/session";
import { ensureTags } from "@/server/services/taxonomy";
import {
  deletePost, discardPostChanges, restorePostRevision, savePost, type SavePostArgs, setPostStatus,
} from "@/server/services/posts";

export async function savePostAction(args: SavePostArgs) {
  return runAction(async () => {
    const admin = await requireAdmin(args.intent === "draft" ? "content:write" : "content:publish");
    const result = await savePost(admin.id, args);
    invalidate(TAGS.posts, TAGS.home, TAGS.taxonomy, TAGS.redirects);
    return result;
  }, args.intent === "publish" ? "Published" : args.intent === "schedule" ? "Scheduled" : "Draft saved");
}

export async function setPostStatusAction(id: string, status: "DRAFT" | "ARCHIVED") {
  return runAction(async () => {
    const admin = await requireAdmin("content:publish");
    await setPostStatus(admin.id, id, status);
    invalidate(TAGS.posts, TAGS.home);
    return null;
  }, status === "ARCHIVED" ? "Archived" : "Unpublished");
}

export async function discardPostChangesAction(id: string) {
  return runAction(async () => {
    await requireAdmin("content:write");
    await discardPostChanges(id);
    return null;
  }, "Unpublished changes discarded");
}

export async function deletePostAction(id: string) {
  return runAction(async () => {
    await requireAdmin("content:publish");
    await deletePost(id);
    invalidate(TAGS.posts, TAGS.home, TAGS.taxonomy);
    return null;
  }, "Post deleted");
}

export async function restorePostRevisionAction(revisionId: string) {
  return runAction(async () => {
    const admin = await requireAdmin("content:write");
    return restorePostRevision(admin.id, revisionId);
  }, "Revision restored as a draft");
}

export async function createTagsAction(names: string[]) {
  return runAction(async () => {
    await requireAdmin("content:write");
    const tags = await ensureTags(names.slice(0, 10));
    invalidate(TAGS.taxonomy);
    return tags.map((t) => ({ id: t.id, name: t.name }));
  });
}
