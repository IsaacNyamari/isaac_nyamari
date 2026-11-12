import Link from "next/link";
import { Eye } from "lucide-react";

export function PreviewBanner() {
  return (
    <div role="status" className="relative z-[60] bg-gold text-ink">
      <div className="wrap flex flex-wrap items-center justify-between gap-2 py-2 text-sm font-semibold">
        <span className="inline-flex items-center gap-2">
          <Eye className="h-4 w-4" aria-hidden="true" />
          Preview mode — you are viewing unpublished content. Visitors cannot see these changes.
        </span>
        <span className="flex gap-4">
          <Link href="/admin" className="underline underline-offset-2">Dashboard</Link>
          {/* Route handler that clears the draft-mode cookie: needs a full navigation, not a client transition. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/preview/exit" className="underline underline-offset-2">Exit preview</a>
        </span>
      </div>
    </div>
  );
}
