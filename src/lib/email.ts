import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export type EmailMessage = { to: string; subject: string; text: string; html?: string; replyTo?: string };
export type EmailResult = { ok: true } | { ok: false; error: string };

export function emailDriverName() {
  return (process.env.EMAIL_DRIVER ?? "console").toLowerCase();
}

/** Describes the configured provider without exposing secrets (shown in Settings → Integrations). */
export function emailStatus() {
  const driver = emailDriverName();
  const configured =
    driver === "smtp" ? Boolean(process.env.SMTP_HOST)
    : driver === "resend" ? Boolean(process.env.RESEND_API_KEY)
    : driver === "console";
  return { driver, configured, from: process.env.EMAIL_FROM ?? "" };
}

let transporter: Transporter | null = null;

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const driver = emailDriverName();
  const from = process.env.EMAIL_FROM || "Website <no-reply@localhost>";
  try {
    if (driver === "smtp") {
      if (!process.env.SMTP_HOST) return { ok: false, error: "SMTP_HOST is not configured." };
      transporter ??= nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      });
      await transporter.sendMail({ from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html, replyTo: msg.replyTo });
      return { ok: true };
    }
    if (driver === "resend") {
      if (!process.env.RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY is not configured." };
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html, reply_to: msg.replyTo }),
      });
      if (!res.ok) return { ok: false, error: `Resend responded ${res.status}: ${(await res.text()).slice(0, 200)}` };
      return { ok: true };
    }
    if (driver === "console") {
      console.info(`[email:console] to=${msg.to} subject=${msg.subject}\n${msg.text}`);
      return { ok: true };
    }
    return { ok: false, error: `Unknown EMAIL_DRIVER "${driver}".` };
  } catch (err) {
    return { ok: false, error: (err as Error).message.slice(0, 300) };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function inquiryEmail(input: {
  name: string; email: string; phone: string; service: string; budget: string; message: string; adminUrl: string;
}): Omit<EmailMessage, "to"> {
  const rows: Array<[string, string]> = [
    ["Name", input.name], ["Email", input.email], ["Phone", input.phone || "—"],
    ["Service", input.service || "—"], ["Budget", input.budget || "—"],
  ];
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${input.message}\n\nManage: ${input.adminUrl}`;
  const html = `<table cellpadding="6" style="font-family:sans-serif;font-size:14px">${rows
    .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v)}</td></tr>`)
    .join("")}</table><p style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(input.message)}</p><p><a href="${escapeHtml(input.adminUrl)}">Open in dashboard</a></p>`;
  return { subject: `New project inquiry from ${input.name}`, text, html, replyTo: input.email };
}
