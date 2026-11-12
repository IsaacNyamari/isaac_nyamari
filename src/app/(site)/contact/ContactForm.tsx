"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { BUDGET_OPTIONS } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { type InquiryState, submitInquiry } from "./actions";

type Option = { slug: string; title: string };

export function ContactForm({ services, defaultService, token }: { services: Option[]; defaultService?: string; token: string }) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitInquiry, { status: "idle" });
  const statusRef = useRef<HTMLDivElement>(null);
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="card flex flex-col items-start gap-4 p-8 outline-none sm:p-10">
        <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
        <h2 className="h3">Thank you — your message has been received.</h2>
        <p className="text-muted">I&apos;ll review your project details and reply by email as soon as possible.</p>
      </div>
    );
  }

  return (
    <form action={action} className="card p-6 sm:p-9" noValidate>
      {state.status === "error" && state.message && (
        <div ref={statusRef} tabIndex={-1} role="alert" className="mb-6 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger outline-none">
          {state.message}
        </div>
      )}
      <input type="hidden" name="token" value={token} />
      {/* Honeypot (hidden from people and assistive tech) */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="name" required error={err.name} defaultValue={v.name} autoComplete="name" />
        <Field label="Email address" name="email" type="email" required error={err.email} defaultValue={v.email} autoComplete="email" />
        <Field label="Phone" name="phone" type="tel" optional error={err.phone} defaultValue={v.phone} autoComplete="tel" />
        <div>
          <label htmlFor="f-service" className="form-label">Service of interest</label>
          <select id="f-service" name="service" defaultValue={v.service ?? defaultService ?? ""} className="form-input">
            <option value="">Select a service…</option>
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>{s.title}</option>
            ))}
            <option value="other">Something else</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="f-budget" className="form-label">
            Budget range <span className="font-normal text-muted">(optional)</span>
          </label>
          <select id="f-budget" name="budget" defaultValue={v.budget ?? ""} className="form-input" aria-invalid={err.budget ? true : undefined}>
            <option value="">Prefer not to say</option>
            {BUDGET_OPTIONS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="f-message" className="form-label">Project description <span className="text-danger">*</span></label>
          <textarea
            id="f-message"
            name="message"
            required
            rows={6}
            minLength={20}
            maxLength={5000}
            defaultValue={v.message}
            aria-invalid={err.message ? true : undefined}
            aria-describedby={err.message ? "e-message" : "h-message"}
            className="form-input min-h-[160px] resize-y"
            placeholder="What are you building or fixing? Who will use it? Any deadlines?"
          />
          {err.message ? <p id="e-message" className="form-error">{err.message}</p> : <p id="h-message" className="mt-1.5 text-xs text-muted">At least 20 characters.</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-start gap-3 text-[0.93rem] text-[#2a3247]">
            <input type="checkbox" name="consent" required className="mt-1 h-5 w-5 shrink-0 accent-[var(--ink)]" aria-invalid={err.consent ? true : undefined} aria-describedby={err.consent ? "e-consent" : undefined} />
            <span>
              I agree that the details above may be stored and used to respond to my inquiry, as described in the{" "}
              <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.
            </span>
          </label>
          {err.consent && <p id="e-consent" className="form-error">{err.consent}</p>}
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn btn-ink mt-8 w-full sm:w-auto">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
        {pending ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}

function Field({
  label, name, type = "text", required, optional, error, defaultValue, autoComplete,
}: {
  label: string; name: string; type?: string; required?: boolean; optional?: boolean; error?: string; defaultValue?: string; autoComplete?: string;
}) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="form-label">
        {label} {required && <span className="text-danger">*</span>}
        {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `e-${name}` : undefined}
        className={cn("form-input", error && "!border-danger")}
      />
      {error && <p id={`e-${name}`} className="form-error">{error}</p>}
    </div>
  );
}
