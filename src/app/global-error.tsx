"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#0b1222", color: "#fff", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28 }}>Something went wrong.</h1>
          <p style={{ color: "#a9b3c9" }}>The site hit an unexpected error.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: "12px 20px", borderRadius: 10, border: 0, background: "#e9b04a", fontWeight: 700, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
