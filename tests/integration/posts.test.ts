import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { savePostAction } from "@/app/admin/(panel)/posts/actions";
import {
  getPostPreview, getPublicCategories, getPublishedPost, getRecentPosts, getRelatedPosts, listPublishedPosts,
} from "@/server/queries/posts";
import { deletePost, discardPostChanges, publishDueScheduledPosts, restorePostRevision, savePost, setPostStatus } from "@/server/services/posts";
import { createAdmin, doc, postData, resetDb, signIn } from "../helpers";

let adminId: string;

beforeEach(async () => {
  await resetDb();
  adminId = await createAdmin();
});

describe("post lifecycle", () => {
  it("keeps drafts out of every public query", async () => {
    await savePost(adminId, { intent: "draft", data: postData() });
    expect(await getPublishedPost("building-reliable-billing-systems")).toBeNull();
    expect((await listPublishedPosts({})).total).toBe(0);
    expect((await listPublishedPosts({ q: "billing" })).total).toBe(0);
    expect(await getRecentPosts(3, [])).toHaveLength(0);
    // ...but the admin preview can see it
    expect((await getPostPreview("building-reliable-billing-systems"))?.title).toBe("Building reliable billing systems");
  });

  it("creates, publishes, edits, unpublishes and deletes", async () => {
    const created = await savePost(adminId, { intent: "draft", data: postData() });
    const published = await savePost(adminId, { id: created.id, version: created.version, intent: "publish", data: postData() });
    expect(published.status).toBe("PUBLISHED");
    const live = await getPublishedPost("building-reliable-billing-systems");
    expect(live?.title).toBe("Building reliable billing systems");
    expect(live?.readingMinutes).toBeGreaterThanOrEqual(1);

    const updated = await savePost(adminId, { id: created.id, version: published.version, intent: "publish", data: postData({ title: "Updated title" }) });
    expect((await getPublishedPost("building-reliable-billing-systems"))?.title).toBe("Updated title");

    await setPostStatus(adminId, created.id, "DRAFT");
    expect(await getPublishedPost("building-reliable-billing-systems")).toBeNull();

    await setPostStatus(adminId, created.id, "ARCHIVED");
    expect((await db.post.findUnique({ where: { id: created.id } }))?.status).toBe("ARCHIVED");
    expect(updated.version).toBeGreaterThan(published.version);

    await deletePost(created.id);
    expect(await db.post.count()).toBe(0);
  });

  it("stores draft edits of a live post privately until 'Update live'", async () => {
    const p = await savePost(adminId, { intent: "publish", data: postData() });
    const draft = await savePost(adminId, { id: p.id, version: p.version, intent: "draft", data: postData({ title: "Secret new title" }) });
    expect(draft.pending).toBe(true);
    expect((await getPublishedPost("building-reliable-billing-systems"))?.title).toBe("Building reliable billing systems");
    expect((await getPostPreview("building-reliable-billing-systems"))?.title).toBe("Secret new title");

    await discardPostChanges(p.id);
    expect((await getPostPreview("building-reliable-billing-systems"))?.title).toBe("Building reliable billing systems");
  });

  it("rejects stale saves instead of silently overwriting", async () => {
    const p = await savePost(adminId, { intent: "draft", data: postData() });
    await savePost(adminId, { id: p.id, version: p.version, intent: "draft", data: postData({ title: "First editor" }) });
    await expect(savePost(adminId, { id: p.id, version: p.version, intent: "draft", data: postData({ title: "Second editor" }) })).rejects.toThrow(/changed elsewhere/);
    expect((await db.post.findUnique({ where: { id: p.id } }))?.title).toBe("First editor");
  });

  it("enforces unique slugs with a readable error", async () => {
    await signIn();
    expect((await savePostAction({ intent: "draft", data: postData() })).ok).toBe(true);
    const dup = await savePostAction({ intent: "draft", data: postData({ title: "Another" }) });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.fieldErrors?.slug).toBeTruthy();
  });

  it("validates input and rejects invalid slugs and missing titles", async () => {
    await signIn();
    const r = await savePostAction({ intent: "draft", data: postData({ title: "", slug: "Bad Slug!" }) });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors?.title).toBeTruthy();
      expect(r.fieldErrors?.slug).toBeTruthy();
    }
  });

  it("redirects the old URL when a published slug changes", async () => {
    const p = await savePost(adminId, { intent: "publish", data: postData() });
    await savePost(adminId, { id: p.id, version: p.version, intent: "publish", data: postData({ slug: "new-slug" }) });
    const r = await db.redirect.findUnique({ where: { fromPath: "/insights/building-reliable-billing-systems" } });
    expect(r?.toPath).toBe("/insights/new-slug");
  });

  it("restores revisions as drafts without touching the live article", async () => {
    const p = await savePost(adminId, { intent: "publish", data: postData({ title: "Version one" }) });
    const p2 = await savePost(adminId, { id: p.id, version: p.version, intent: "publish", data: postData({ title: "Version two" }) });
    const first = await db.postRevision.findFirst({ where: { postId: p.id, title: "Version one" } });
    await restorePostRevision(adminId, first!.id);
    expect((await getPublishedPost("building-reliable-billing-systems"))?.title).toBe("Version two");
    expect((await getPostPreview("building-reliable-billing-systems"))?.title).toBe("Version one");
    expect(p2.version).toBeGreaterThan(p.version);
  });
});

describe("taxonomy", () => {
  it("associates categories and tags and lists by them", async () => {
    const cat = await db.category.create({ data: { name: "Infrastructure", slug: "infrastructure" } });
    const tag = await db.tag.create({ data: { name: "Linux", slug: "linux" } });
    await savePost(adminId, { intent: "publish", data: postData({ categoryId: cat.id, tagIds: [tag.id] }) });
    await savePost(adminId, { intent: "draft", data: postData({ slug: "draft-one", categoryId: cat.id, tagIds: [tag.id] }) });

    const byCat = await listPublishedPosts({ categorySlug: "infrastructure" });
    const byTag = await listPublishedPosts({ tagSlug: "linux" });
    expect(byCat.total).toBe(1);
    expect(byTag.total).toBe(1);
    const detail = await getPublishedPost("building-reliable-billing-systems");
    expect(detail?.category?.slug).toBe("infrastructure");
    expect(detail?.tags.map((t) => t.slug)).toEqual(["linux"]);
    // Counts exclude drafts
    expect((await getPublicCategories()).find((c) => c.slug === "infrastructure")?.count).toBe(1);
  });

  it("never suggests unpublished posts as related", async () => {
    const cat = await db.category.create({ data: { name: "Systems", slug: "systems" } });
    const a = await savePost(adminId, { intent: "publish", data: postData({ categoryId: cat.id }) });
    await savePost(adminId, { intent: "draft", data: postData({ slug: "hidden-draft", title: "Hidden", categoryId: cat.id }) });
    const b = await savePost(adminId, { intent: "publish", data: postData({ slug: "visible", title: "Visible", categoryId: cat.id }) });
    const related = await getRelatedPosts(a.id, [], cat.id, []);
    expect(related.map((r) => r.id)).toEqual([b.id]);
  });
});

describe("scheduled publishing", () => {
  it("rejects schedules in the past", async () => {
    await expect(savePost(adminId, { intent: "schedule", scheduledAt: new Date(Date.now() - 60_000).toISOString(), data: postData() })).rejects.toThrow(/future/);
  });

  it("keeps scheduled posts private until the publisher promotes them", async () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const p = await savePost(adminId, { intent: "schedule", scheduledAt: future, data: postData() });
    expect(p.status).toBe("SCHEDULED");
    expect(await getPublishedPost("building-reliable-billing-systems")).toBeNull();

    expect(await publishDueScheduledPosts()).toHaveLength(0);
    // Simulate time passing
    await db.post.update({ where: { id: p.id }, data: { scheduledAt: new Date(Date.now() - 1000) } });
    const published = await publishDueScheduledPosts();
    expect(published.map((x) => x.slug)).toEqual(["building-reliable-billing-systems"]);
    const live = await getPublishedPost("building-reliable-billing-systems");
    expect(live).not.toBeNull();
  });
});

describe("rich content", () => {
  it("derives searchable text and reading time from structured content", async () => {
    const long = Array.from({ length: 900 }, () => "word").join(" ");
    await savePost(adminId, { intent: "publish", data: postData({ content: doc(long) }) });
    const row = await db.post.findFirst();
    expect(row?.readingMinutes).toBe(4);
    expect((await listPublishedPosts({ q: "word" })).total).toBe(1);
  });
});
