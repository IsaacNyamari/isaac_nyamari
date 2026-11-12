import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { checkFormToken, issueFormToken } from "@/lib/form-token";
import { consumeRateLimit } from "@/lib/rate-limit";
import { submitInquiry } from "@/app/(site)/contact/actions";
import { createInquiry, listInquiries } from "@/server/services/inquiries";
import { getPublishedPost, listPublishedPosts } from "@/server/queries/posts";
import { createAdmin, resetDb } from "../helpers";

const valid = {
  name: "Jane Client",
  email: "jane@example.com",
  phone: "+254 711 111 111",
  service: "",
  budget: "Not sure yet",
  message: "We need a school management system for three campuses.",
  consent: true,
};

beforeEach(async () => {
  await resetDb();
  await createAdmin();
  process.env.EMAIL_DRIVER = "console";
});

function form(values: Record<string, string>, tokenAgeMs = 5000) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  fd.set("token", issueFormToken(Date.now() - tokenAgeMs));
  return fd;
}

describe("contact inquiries", () => {
  it("saves a valid inquiry and links the selected service", async () => {
    const svc = await db.service.create({ data: { title: "Business Systems", slug: "business-systems", content: {}, status: "PUBLISHED", publishedAt: new Date() } });
    await createInquiry({ ...valid, service: "business-systems" }, { ipHash: "h", userAgent: "test" });
    const row = await db.contactInquiry.findFirst();
    expect(row).toMatchObject({ name: "Jane Client", serviceId: svc.id, serviceLabel: "Business Systems", status: "NEW", read: false });
  });

  it("rejects invalid submissions", async () => {
    await expect(createInquiry({ ...valid, email: "nope" }, { ipHash: "h", userAgent: "" })).rejects.toThrow();
    await expect(createInquiry({ ...valid, message: "too short" }, { ipHash: "h", userAgent: "" })).rejects.toThrow();
    await expect(createInquiry({ ...valid, consent: false }, { ipHash: "h", userAgent: "" })).rejects.toThrow();
    expect(await db.contactInquiry.count()).toBe(0);
  });

  it("keeps the inquiry and records the failure when email delivery fails", async () => {
    await db.siteSettings.create({ data: { id: "site", notifyEmail: "owner@example.com" } });
    process.env.EMAIL_DRIVER = "smtp";
    delete process.env.SMTP_HOST;
    await createInquiry(valid, { ipHash: "h", userAgent: "" });
    const row = await db.contactInquiry.findFirst();
    expect(row?.emailStatus).toBe("FAILED");
    expect(row?.emailError).toMatch(/SMTP_HOST/);
  });

  it("marks delivery as skipped when no notification address exists", async () => {
    await createInquiry(valid, { ipHash: "h", userAgent: "" });
    expect((await db.contactInquiry.findFirst())?.emailStatus).toBe("SKIPPED");
  });

  it("marks delivery as sent when the provider accepts it", async () => {
    await db.siteSettings.create({ data: { id: "site", email: "owner@example.com" } });
    await createInquiry(valid, { ipHash: "h", userAgent: "" });
    expect((await db.contactInquiry.findFirst())?.emailStatus).toBe("SENT");
  });

  it("never exposes inquiries or notes through public content queries", async () => {
    await createInquiry(valid, { ipHash: "h", userAgent: "" });
    expect((await listPublishedPosts({ q: "school management" })).total).toBe(0);
    expect(await getPublishedPost("jane-client")).toBeNull();
    // Admin listing excludes archived by default
    expect((await listInquiries({})).total).toBe(1);
  });
});

describe("contact form action (spam protection)", () => {
  const fields = { name: valid.name, email: valid.email, phone: "", service: "", budget: "", message: valid.message, consent: "on" };

  it("accepts a normal submission", async () => {
    const r = await submitInquiry({ status: "idle" }, form(fields));
    expect(r.status).toBe("success");
    expect(await db.contactInquiry.count()).toBe(1);
  });

  it("silently drops honeypot submissions", async () => {
    const r = await submitInquiry({ status: "idle" }, form({ ...fields, website: "http://spam.example" }));
    expect(r.status).toBe("success");
    expect(await db.contactInquiry.count()).toBe(0);
  });

  it("rejects forms submitted too quickly or with forged tokens", async () => {
    const fast = await submitInquiry({ status: "idle" }, form(fields, 0));
    expect(fast.status).toBe("error");
    const fd = form(fields);
    fd.set("token", "123.forged");
    expect((await submitInquiry({ status: "idle" }, fd)).status).toBe("error");
    expect(await db.contactInquiry.count()).toBe(0);
  });

  it("returns field errors for invalid input", async () => {
    const r = await submitInquiry({ status: "idle" }, form({ ...fields, email: "bad", consent: "" }));
    expect(r.status).toBe("error");
    expect(r.fieldErrors?.email).toBeTruthy();
    expect(r.fieldErrors?.consent).toBeTruthy();
  });

  it("rate limits repeated submissions from one client", async () => {
    for (let i = 0; i < 5; i++) expect((await submitInquiry({ status: "idle" }, form(fields))).status).toBe("success");
    const sixth = await submitInquiry({ status: "idle" }, form(fields));
    expect(sixth.status).toBe("error");
    expect(sixth.message).toMatch(/Too many/);
  });
});

describe("utilities", () => {
  it("validates form tokens", () => {
    expect(checkFormToken(issueFormToken(Date.now() - 5000))).toBe("ok");
    expect(checkFormToken(issueFormToken(Date.now()))).toBe("too-fast");
    expect(checkFormToken(issueFormToken(Date.now() - 1000 * 60 * 60 * 25))).toBe("expired");
    expect(checkFormToken("garbage")).toBe("invalid");
  });

  it("counts within a fixed window", async () => {
    expect((await consumeRateLimit("k", 2, 60)).allowed).toBe(true);
    expect((await consumeRateLimit("k", 2, 60)).allowed).toBe(true);
    expect((await consumeRateLimit("k", 2, 60)).allowed).toBe(false);
  });
});
