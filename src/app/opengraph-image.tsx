import { ImageResponse } from "next/og";
import { getSettings } from "@/server/queries/settings";

export const alt = "Isaac Nyamari";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

/** Default social card, used when no Open Graph image is configured. */
export default async function OpengraphImage() {
  const s = await getSettings();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0b1222", padding: 80, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 96, height: 96, borderRadius: 24, background: "#16213D", border: "3px solid #2C3B63", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div style={{ position: "absolute", left: 22, top: 22, width: 14, height: 52, borderRadius: 2, background: "linear-gradient(#F5C861,#D9952B)" }} />
            <div style={{ position: "absolute", right: 22, top: 22, width: 14, height: 52, borderRadius: 2, background: "#fff" }} />
            <div style={{ position: "absolute", left: 30, top: 20, width: 14, height: 62, background: "#fff", transform: "skewX(33deg)" }} />
          </div>
          <div style={{ display: "flex", fontSize: 40, letterSpacing: 6 }}>
            <span style={{ fontWeight: 800 }}>{(s.siteName.split(" ")[0] ?? "").toUpperCase()}</span>
            <span style={{ fontWeight: 300, marginLeft: 16 }}>{s.siteName.split(" ").slice(1).join(" ").toUpperCase()}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.1, maxWidth: 980 }}>I build software that solves real-world problems.</div>
          <div style={{ marginTop: 28, fontSize: 28, color: "#F5C861" }}>{s.tagline || "Software Engineer · Systems Builder"}</div>
        </div>
      </div>
    ),
    size,
  );
}
