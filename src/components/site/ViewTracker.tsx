"use client";

import { useEffect } from "react";

/** Counts one view per browser session. Bots without JS and link prefetches are not counted. */
export function ViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const key = `viewed:${postId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage unavailable: still count once per page load */
    }
    fetch(`/api/views/${encodeURIComponent(postId)}`, { method: "POST", keepalive: true }).catch(() => {});
  }, [postId]);
  return null;
}
