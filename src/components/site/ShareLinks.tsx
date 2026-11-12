"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-display text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">Share</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="chip hover:border-ink hover:text-ink">
          {l.label}
        </a>
      ))}
      <button
        type="button"
        className="chip hover:border-ink hover:text-ink"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard unavailable */
          }
        }}
      >
        {copied ? <Check className="mr-1 h-3 w-3" aria-hidden="true" /> : <Link2 className="mr-1 h-3 w-3" aria-hidden="true" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
