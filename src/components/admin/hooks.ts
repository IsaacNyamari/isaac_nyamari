"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action";

/**
 * Warns before leaving the page with unsaved edits: browser close/reload (beforeunload)
 * and in-app link clicks (captured before Next.js handles them).
 */
export function useUnsavedChanges(dirty: boolean) {
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.target === "_blank" || !a.href || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search) return;
      if (!window.confirm("You have unsaved changes. Leave this page and discard them?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
}

/** Runs a server action with pending state and toast feedback. */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function run<T>(fn: () => Promise<ActionResult<T>>, opts?: { success?: string; onSuccess?: (data: T) => void; silent?: boolean }) {
    return new Promise<ActionResult<T>>((resolve) => {
      startTransition(async () => {
        try {
          const res = await fn();
          if (res.ok) {
            setFieldErrors({});
            if (!opts?.silent) toast.success(res.message ?? opts?.success ?? "Saved");
            opts?.onSuccess?.(res.data);
          } else {
            setFieldErrors(res.fieldErrors ?? {});
            toast.error(res.error);
          }
          resolve(res);
        } catch (err) {
          const message = err instanceof Error && /fetch|network/i.test(err.message) ? "Network error — check your connection. Nothing was saved." : "Unexpected error. Nothing was saved.";
          toast.error(message);
          resolve({ ok: false, error: message });
        }
      });
    });
  }

  return { pending, run, fieldErrors, setFieldErrors };
}
