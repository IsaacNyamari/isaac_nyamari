import { Toaster } from "sonner";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { MotionProvider } from "@/components/site/Motion";
import { PreviewBanner } from "@/components/site/PreviewBanner";
import { isPreview } from "@/lib/preview";
import { getSettings } from "@/server/queries/settings";

const HEX = /^#[0-9a-f]{6}$/i;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, preview] = await Promise.all([getSettings(), isPreview()]);
  // Brand colours from Settings → Branding (validated hex only).
  const overrides = [
    HEX.test(settings.primaryColor) ? `--ink:${settings.primaryColor};` : "",
    HEX.test(settings.accentColor) ? `--gold:${settings.accentColor};` : "",
  ].join("");

  return (
    <MotionProvider>
      {overrides && <style>{`:root{${overrides}}`}</style>}
      <a href="#main" className="sr-only z-[100] rounded bg-gold px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      {preview && <PreviewBanner />}
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <Toaster position="bottom-right" richColors />
    </MotionProvider>
  );
}
