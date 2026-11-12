"use server";

import { headers } from "next/headers";
import { ZodError } from "zod";
import { checkFormToken } from "@/lib/form-token";
import { consumeRateLimit, hashIdentifier } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { createInquiry } from "@/server/services/inquiries";

export type InquiryState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const FIELDS = ["name", "email", "phone", "service", "budget", "message"] as const;

export async function submitInquiry(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "").slice(0, 6000)]));

  // Honeypot: real visitors never see or fill this field. Pretend success so bots learn nothing.
  if (String(formData.get("website") ?? "").trim() !== "") return { status: "success" };

  const token = checkFormToken(formData.get("token"));
  if (token === "too-fast" || token === "invalid") {
    return { status: "error", message: "Please wait a moment and submit the form again.", values };
  }
  if (token === "expired") {
    return { status: "error", message: "This form has expired. Please reload the page and try again.", values };
  }

  const h = await headers();
  const ipHash = hashIdentifier(clientIp(h));
  const limit = await consumeRateLimit(`inquiry:${ipHash}`, 5, 60 * 60);
  if (!limit.allowed) {
    return { status: "error", message: "Too many submissions from your connection. Please try again later.", values };
  }

  try {
    await createInquiry(
      { ...values, consent: formData.get("consent") === "on" ? true : false },
      { ipHash, userAgent: h.get("user-agent") ?? "" },
    );
    return { status: "success" };
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
      return { status: "error", message: "Please correct the highlighted fields.", fieldErrors, values };
    }
    console.error("[contact] failed to save inquiry", err);
    return { status: "error", message: "Your message could not be sent right now. Please try again shortly.", values };
  }
}
