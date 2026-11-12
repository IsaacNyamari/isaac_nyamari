"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="section">
      <div className="wrap max-w-2xl text-center">
        <span className="eyebrow">Something went wrong</span>
        <h1 className="h1">We couldn&apos;t load this page.</h1>
        <p className="lead mx-auto mt-5">Please try again. If the problem continues, come back a little later.</p>
        <div className="mt-8 flex justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-ink">Try again</button>
          <Link href="/" className="btn btn-ghost">Home</Link>
        </div>
        {error.digest && <p className="mt-8 font-mono text-xs text-muted">Reference: {error.digest}</p>}
      </div>
    </section>
  );
}
