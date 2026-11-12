import { beforeEach, describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { getAdmin, requireAdmin } from "@/lib/session";
import { savePostAction, deletePostAction } from "@/app/admin/(panel)/posts/actions";
import { deleteMediaAction, listMediaAction } from "@/app/admin/(panel)/media/actions";
import { saveSettingsAction } from "@/app/admin/(panel)/settings/actions";
import { updateInquiryAction, addInquiryNoteAction } from "@/app/admin/(panel)/inquiries/actions";
import { publishHomeAction } from "@/app/admin/(panel)/pages/homepage/actions";
import { saveNavigationAction } from "@/app/admin/(panel)/navigation/actions";
import { db } from "@/lib/db";
import { ADMIN, createAdmin, postData, resetDb, signIn, signOut } from "../helpers";

describe("authentication", () => {
  beforeEach(async () => {
    await resetDb();
    await createAdmin();
  });

  it("rejects invalid credentials", async () => {
    await expect(auth.api.signInEmail({ body: { email: ADMIN.email, password: "wrong-password-123" } })).rejects.toThrow();
    await expect(auth.api.signInEmail({ body: { email: "nobody@test.local", password: ADMIN.password } })).rejects.toThrow();
  });

  it("accepts valid credentials and validates the session server-side", async () => {
    expect(await getAdmin()).toBeNull();
    await signIn();
    const admin = await requireAdmin();
    expect(admin.email).toBe(ADMIN.email);
  });

  it("stores passwords as hashes, never plain text", async () => {
    const account = await db.account.findFirst({ where: { providerId: "credential" } });
    expect(account?.password).toBeTruthy();
    expect(account?.password).not.toContain(ADMIN.password);
  });

  it("does not allow public sign-up", async () => {
    await expect(
      auth.api.signUpEmail({ body: { email: "attacker@test.local", password: "attacker-password-123", name: "Attacker" } }),
    ).rejects.toThrow();
    expect(await db.adminUser.count()).toBe(1);
  });

  it("invalidates sessions after sign-out (revoked tokens are rejected)", async () => {
    await signIn();
    await db.session.deleteMany();
    expect(await getAdmin()).toBeNull();
  });
});

describe("authorization of protected mutations", () => {
  beforeEach(async () => {
    await resetDb();
    await createAdmin();
    signOut();
  });

  it("rejects every admin server action without a session", async () => {
    const results = await Promise.all([
      savePostAction({ intent: "publish", data: postData() }),
      deletePostAction("anything"),
      listMediaAction({}),
      deleteMediaAction("anything"),
      saveSettingsAction({}),
      updateInquiryAction("x", { read: true }),
      addInquiryNoteAction("x", "note"),
      publishHomeAction([]),
      saveNavigationAction("header", { items: [] }),
    ]);
    for (const r of results) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/signed in/i);
    }
    expect(await db.post.count()).toBe(0);
  });

  it("allows the same action once signed in", async () => {
    await signIn();
    const r = await savePostAction({ intent: "draft", data: postData() });
    expect(r.ok).toBe(true);
    expect(await db.post.count()).toBe(1);
  });
});
