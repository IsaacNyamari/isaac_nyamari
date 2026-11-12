"use server";

import { runAction } from "@/lib/action";
import { requireAdmin } from "@/lib/session";
import {
  addInquiryNote, deleteInquiry, deleteInquiryNote, deliverInquiryNotification, updateInquiry,
} from "@/server/services/inquiries";

export async function updateInquiryAction(id: string, data: unknown) {
  return runAction(async () => {
    await requireAdmin("inquiries:write");
    await updateInquiry(id, data);
    return null;
  }, "Inquiry updated");
}

export async function addInquiryNoteAction(id: string, body: string) {
  return runAction(async () => {
    const admin = await requireAdmin("inquiries:write");
    await addInquiryNote(admin.id, id, body);
    return null;
  }, "Note added");
}

export async function deleteInquiryNoteAction(id: string) {
  return runAction(async () => {
    await requireAdmin("inquiries:write");
    await deleteInquiryNote(id);
    return null;
  }, "Note deleted");
}

export async function deleteInquiryAction(id: string) {
  return runAction(async () => {
    await requireAdmin("inquiries:write");
    await deleteInquiry(id);
    return null;
  }, "Inquiry deleted");
}

export async function retryInquiryEmailAction(id: string) {
  return runAction(async () => {
    await requireAdmin("inquiries:write");
    const r = await deliverInquiryNotification(id);
    if (!r.ok) throw new (await import("@/lib/errors")).UserError(`Notification failed again: ${r.error}`);
    return null;
  }, "Notification sent");
}
