"use client";

import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { forwardRef, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// ─── Buttons ────────────────────────────────────────────────────────────────

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-navy-2 border-ink",
  gold: "bg-gold text-ink hover:bg-gold-hi border-gold",
  secondary: "bg-white text-ink border-[#d5d9e2] hover:border-ink",
  ghost: "bg-transparent text-[#3a4258] border-transparent hover:bg-[#eef0f4]",
  danger: "bg-white text-danger border-danger/40 hover:bg-danger hover:text-white",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: "sm" | "md" }>(
  function Button({ variant = "secondary", loading, size = "md", className, children, disabled, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55",
          size === "sm" ? "h-9 px-3 text-[0.82rem]" : "h-10 px-4 text-sm",
          VARIANTS[variant],
          className,
        )}
        {...rest}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);

export function ButtonLink({ href, variant = "secondary", className, children, size = "md" }: { href: string; variant?: Variant; className?: string; children: ReactNode; size?: "sm" | "md" }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors",
        size === "sm" ? "h-9 px-3 text-[0.82rem]" : "h-10 px-4 text-sm",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

// ─── Form fields ────────────────────────────────────────────────────────────

export function Field({ label, help, error, children, htmlFor, className, required }: { label: string; help?: ReactNode; error?: string; children: ReactNode; htmlFor?: string; className?: string; required?: boolean }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="admin-label">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-danger" role="alert">{error}</p> : help ? <p className="admin-help">{help}</p> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input({ className, invalid, ...rest }, ref) {
  return <input ref={ref} className={cn("admin-input", className)} aria-invalid={invalid || undefined} {...rest} />;
});

export function Textarea({ className, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cn("admin-input", className)} aria-invalid={invalid || undefined} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("admin-input pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        {description && <p className="admin-help !mt-0.5">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-ink" : "bg-[#cfd4de]")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

// ─── Layout ─────────────────────────────────────────────────────────────────

export type Crumb = { label: string; href?: string };

export function PageHeader({ title, description, crumbs, actions }: { title: string; description?: ReactNode; crumbs?: Crumb[]; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-[#6b7385]">
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
                  {c.href ? <Link href={c.href} className="hover:text-ink hover:underline">{c.label}</Link> : <span aria-current="page">{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="truncate font-serif text-[1.75rem] font-semibold leading-tight text-ink">{title}</h1>
        {description && <div className="mt-1 text-sm text-[#5b6478]">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, children, className, actions }: { title?: string; description?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("admin-card p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[0.95rem] font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-[#6b7385]">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  SCHEDULED: "bg-sky-50 text-sky-700 ring-sky-200",
  ARCHIVED: "bg-stone-100 text-stone-600 ring-stone-200",
  NEW: "bg-amber-50 text-amber-800 ring-amber-200",
  IN_PROGRESS: "bg-sky-50 text-sky-700 ring-sky-200",
  RESPONDED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  SENT: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  FAILED: "bg-red-50 text-red-700 ring-red-200",
  SKIPPED: "bg-stone-100 text-stone-600 ring-stone-200",
  PENDING: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide ring-1 ring-inset", STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT)}>
      {label ?? status.replace("_", " ").toLowerCase()}
    </span>
  );
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#d5d9e2] bg-white px-6 py-14 text-center">
      {icon && <div className="mb-3 text-[#9aa1b1]">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-md text-sm text-[#6b7385]">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── Dialog ─────────────────────────────────────────────────────────────────

export function Dialog({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={cn("m-auto w-[calc(100%-2rem)] rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-ink/50 backdrop:backdrop-blur-[2px]", wide ? "max-w-5xl" : "max-w-lg")}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between border-b border-[#e3e6ed] px-5 py-4">
            <h2 className="font-semibold text-ink">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm text-[#6b7385] hover:bg-[#eef0f4]" aria-label="Close dialog">✕</button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-[#e3e6ed] px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/** Asks for confirmation before running a destructive or significant action. */
export function ConfirmButton({
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  children,
  size = "md",
  disabled,
  requireText,
}: {
  onConfirm: () => Promise<unknown> | unknown;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  variant?: Variant;
  children: ReactNode;
  size?: "sm" | "md";
  disabled?: boolean;
  requireText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} disabled={disabled}>
        {children}
      </Button>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button
              variant={variant === "danger" ? "danger" : "primary"}
              className={variant === "danger" ? "!bg-danger !text-white" : ""}
              loading={busy}
              disabled={Boolean(requireText) && typed !== requireText}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } finally {
                  setBusy(false);
                  setTyped("");
                }
              }}
            >
              {confirmLabel}
            </Button>
          </>
        }
      >
        <div className="text-sm leading-relaxed text-[#3a4258]">{message}</div>
        {requireText && (
          <div className="mt-4">
            <label className="admin-label">Type <code className="rounded bg-[#eef0f4] px-1">{requireText}</code> to confirm</label>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </div>
        )}
      </Dialog>
    </>
  );
}

// ─── Tables ─────────────────────────────────────────────────────────────────

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="admin-card overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("border-b border-[#e3e6ed] bg-[#f8f9fb] px-4 py-2.5 text-[0.72rem] font-semibold uppercase tracking-wide text-[#6b7385]", className)}>{children}</th>;
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-[#eef0f4] px-4 py-3 align-middle", className)}>{children}</td>;
}

/** Links are computed by the (server) caller: functions cannot cross the server/client boundary. */
export function AdminPagination({ page, totalPages, prevHref, nextHref }: { page: number; totalPages: number; prevHref: string; nextHref: string }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-[#6b7385]">Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        {page > 1 && <ButtonLink href={prevHref} size="sm">Previous</ButtonLink>}
        {page < totalPages && <ButtonLink href={nextHref} size="sm">Next</ButtonLink>}
      </div>
    </nav>
  );
}
