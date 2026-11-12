import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { inquiryEmail, sendEmail } from "@/lib/email";
import { NotFoundError } from "@/lib/errors";
import { siteUrl } from "@/lib/utils";
import { inquirySchema, inquiryStatusSchema } from "@/lib/validation";
import { z } from "zod";

export type InquiryMeta = { ipHash: string; userAgent: string };

/**
 * Stores the inquiry first, then attempts the notification email.
 * A failed delivery never loses the inquiry: the failure is recorded for the dashboard.
 */
export async function createInquiry(data: unknown, meta: InquiryMeta) {
  const input = inquirySchema.parse(data);
  const service = input.service
    ? await db.service.findFirst({ where: { slug: input.service, status: "PUBLISHED" }, select: { id: true, title: true } })
    : null;

  const inquiry = await db.contactInquiry.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      serviceId: service?.id ?? null,
      serviceLabel: service?.title ?? (input.service === "other" ? "Other" : ""),
      budget: input.budget,
      message: input.message,
      consent: input.consent,
      ipHash: meta.ipHash,
      userAgent: meta.userAgent.slice(0, 300),
    },
  });

  await deliverInquiryNotification(inquiry.id);
  return { id: inquiry.id };
}

export async function deliverInquiryNotification(id: string) {
  const inquiry = await db.contactInquiry.findUnique({ where: { id } });
  if (!inquiry) throw new NotFoundError("Inquiry");
  const settings = await db.siteSettings.findUnique({ where: { id: "site" }, select: { notifyEmail: true, email: true } });
  const to = settings?.notifyEmail || settings?.email || "";
  if (!to) {
    await db.contactInquiry.update({
      where: { id },
      data: { emailStatus: "SKIPPED", emailError: "No notification address configured in Settings → Contact." },
    });
    return { ok: false as const, error: "No notification address configured." };
  }
  const message = inquiryEmail({
    name: inquiry.name,
    email: inquiry.email,
    phone: inquiry.phone,
    service: inquiry.serviceLabel,
    budget: inquiry.budget,
    message: inquiry.message,
    adminUrl: `${siteUrl()}/admin/inquiries/${inquiry.id}`,
  });
  const result = await sendEmail({ to, ...message });
  await db.contactInquiry.update({
    where: { id },
    data: result.ok ? { emailStatus: "SENT", emailError: "" } : { emailStatus: "FAILED", emailError: result.error },
  });
  return result;
}

export type InquiryListQuery = { q?: string; status?: string; unread?: boolean; page?: number };

export async function listInquiries(query: InquiryListQuery) {
  const perPage = 20;
  const page = Math.max(1, query.page ?? 1);
  const status = inquiryStatusSchema.safeParse(query.status);
  const where: Prisma.ContactInquiryWhereInput = {
    ...(status.success ? { status: status.data } : { status: { not: "ARCHIVED" } }),
    ...(query.unread ? { read: false } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { email: { contains: query.q, mode: "insensitive" } },
            { message: { contains: query.q, mode: "insensitive" } },
            { serviceLabel: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.contactInquiry.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * perPage, take: perPage }),
    db.contactInquiry.count({ where }),
  ]);
  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export const inquiryUpdateSchema = z.object({
  status: inquiryStatusSchema.optional(),
  read: z.boolean().optional(),
});

export async function updateInquiry(id: string, data: unknown) {
  return db.contactInquiry.update({ where: { id }, data: inquiryUpdateSchema.parse(data) });
}

export async function addInquiryNote(adminId: string, inquiryId: string, body: unknown) {
  const text = z.string().trim().min(1, "Note is empty").max(5000).parse(body);
  return db.inquiryNote.create({ data: { inquiryId, body: text, authorId: adminId } });
}

export async function deleteInquiryNote(id: string) {
  await db.inquiryNote.delete({ where: { id } });
}

export async function deleteInquiry(id: string) {
  await db.contactInquiry.delete({ where: { id } });
}
