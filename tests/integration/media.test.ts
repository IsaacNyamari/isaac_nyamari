import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { validateUpload } from "@/lib/media";
import { getStorage } from "@/lib/storage";
import { POST as uploadRoute } from "@/app/api/admin/media/route";
import { createMedia, deleteMedia, findMediaUsage, replaceMedia } from "@/server/services/media";
import { savePost } from "@/server/services/posts";
import { createAdmin, pngBuffer, postData, resetDb, signIn, signOut } from "../helpers";

let adminId: string;
beforeEach(async () => {
  await resetDb();
  adminId = await createAdmin();
});

describe("upload validation", () => {
  it("accepts a real PNG and reports its dimensions", async () => {
    const v = await validateUpload(await pngBuffer(), "photo.png", "image/png");
    expect(v).toMatchObject({ kind: "IMAGE", mime: "image/png", width: 900, height: 600 });
  });

  it("rejects SVG files", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await expect(validateUpload(svg, "logo.svg", "image/svg+xml")).rejects.toThrow(/SVG/);
    // Disguised with a PNG extension
    await expect(validateUpload(svg, "logo.png", "image/png")).rejects.toThrow(/SVG/);
  });

  it("rejects executables and unsupported types regardless of the declared MIME type", async () => {
    const exe = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(200, 1)]);
    await expect(validateUpload(exe, "setup.exe", "application/octet-stream")).rejects.toThrow(/not supported/);
    await expect(validateUpload(exe, "photo.jpg", "image/jpeg")).rejects.toThrow(/could not be read/);
    await expect(validateUpload(Buffer.from("<?php echo 1; ?>"), "shell.php", "image/png")).rejects.toThrow(/not supported/);
  });

  it("rejects content that does not match the extension or declared type", async () => {
    const png = await pngBuffer();
    await expect(validateUpload(png, "photo.jpg", "image/jpeg")).rejects.toThrow(/does not match/);
    await expect(validateUpload(png, "photo.png", "image/webp")).rejects.toThrow(/does not match/);
    await expect(validateUpload(Buffer.from("not a pdf"), "doc.pdf", "application/pdf")).rejects.toThrow(/valid PDF/);
  });

  it("enforces the configured size limit", async () => {
    const big = Buffer.alloc(3 * 1024 * 1024, 0);
    await expect(validateUpload(big, "big.png", "image/png")).rejects.toThrow(/larger than/);
  });
});

describe("media storage and usage", () => {
  it("stores the file with responsive WebP variants and metadata", async () => {
    const asset = await createMedia(adminId, { buffer: await pngBuffer(1600, 900), filename: "hero.png", type: "image/png" });
    expect(asset.width).toBe(1600);
    expect(asset.mimeType).toBe("image/png");
    const variants = asset.variants as { width: number; key: string }[];
    expect(variants.map((v) => v.width)).toEqual([320, 768, 1280]);
    expect(await getStorage().get(asset.storageKey)).not.toBeNull();
    expect(await getStorage().get(variants[0].key)).not.toBeNull();
  });

  it("detects references and refuses to delete media that is in use", async () => {
    const asset = await createMedia(adminId, { buffer: await pngBuffer(), filename: "cover.png" });
    const post = await savePost(adminId, { intent: "publish", data: postData({ coverImageId: asset.id }) });
    const usage = await findMediaUsage(asset.id);
    expect(usage.some((u) => u.type === "Post")).toBe(true);
    await expect(deleteMedia(asset.id)).rejects.toThrow(/still used/);
    expect(await getStorage().get(asset.storageKey)).not.toBeNull();

    await savePost(adminId, { id: post.id, version: post.version, intent: "publish", data: postData({ coverImageId: null }) });
    await deleteMedia(asset.id);
    expect(await db.mediaAsset.count()).toBe(0);
    expect(await getStorage().get(asset.storageKey)).toBeNull();
  });

  it("detects inline images inside rich text", async () => {
    const asset = await createMedia(adminId, { buffer: await pngBuffer(), filename: "inline.png" });
    await savePost(adminId, {
      intent: "draft",
      data: postData({ content: { type: "doc", content: [{ type: "image", attrs: { src: asset.url, mediaId: asset.id } }] } }),
    });
    expect((await findMediaUsage(asset.id)).some((u) => u.type === "Post content")).toBe(true);
    await expect(deleteMedia(asset.id)).rejects.toThrow(/still used/);
  });

  it("replaces a file while keeping the same id and updating embedded URLs", async () => {
    const asset = await createMedia(adminId, { buffer: await pngBuffer(), filename: "v1.png" });
    await savePost(adminId, { intent: "draft", data: postData({ content: { type: "doc", content: [{ type: "image", attrs: { src: asset.url, mediaId: asset.id } }] } }) });
    const replaced = await replaceMedia(adminId, asset.id, { buffer: await pngBuffer(400, 400), filename: "v2.png" });
    expect(replaced.id).toBe(asset.id);
    expect(replaced.url).not.toBe(asset.url);
    const post = await db.post.findFirst();
    expect(JSON.stringify(post?.content)).toContain(replaced.url);
    expect(await getStorage().get(asset.storageKey)).toBeNull();
  });
});

describe("upload route handler", () => {
  async function upload(files: { name: string; type: string; data: Buffer }[], origin = "http://localhost:3000") {
    const form = new FormData();
    for (const f of files) form.append("files", new File([new Uint8Array(f.data)], f.name, { type: f.type }));
    return uploadRoute(new Request("http://localhost:3000/api/admin/media", { method: "POST", body: form, headers: { origin, host: "localhost:3000" } }));
  }

  it("rejects unauthenticated uploads", async () => {
    signOut();
    const res = await upload([{ name: "a.png", type: "image/png", data: await pngBuffer() }]);
    expect(res.status).toBe(401);
    expect(await db.mediaAsset.count()).toBe(0);
  });

  it("rejects cross-site uploads even with a session", async () => {
    await signIn();
    const res = await upload([{ name: "a.png", type: "image/png", data: await pngBuffer() }], "https://evil.example");
    expect(res.status).toBe(403);
  });

  it("accepts valid files and reports per-file errors for invalid ones", async () => {
    await signIn();
    const res = await upload([
      { name: "ok.png", type: "image/png", data: await pngBuffer() },
      { name: "bad.svg", type: "image/svg+xml", data: Buffer.from("<svg></svg>") },
    ]);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: { ok: boolean }[] };
    expect(body.results.map((r) => r.ok)).toEqual([true, false]);
    expect(await db.mediaAsset.count()).toBe(1);
  });
});
