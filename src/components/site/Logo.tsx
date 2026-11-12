import Link from "next/link";
import type { PublicImage } from "@/server/queries/common";
import { cn } from "@/lib/utils";

/** The "N" monogram from the brand mark: the gold I doubles as the first stroke of the N. */
export function Monogram({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <svg viewBox="20 20 160 160" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="mg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1E2A4A" />
          <stop offset="1" stopColor="#0B1222" />
        </linearGradient>
        <linearGradient id="mg-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F5C861" />
          <stop offset="1" stopColor="#D9952B" />
        </linearGradient>
      </defs>
      {tone === "dark" ? (
        <rect x="21.5" y="21.5" width="157" height="157" rx="37" fill="#16213D" stroke="#2C3B63" strokeWidth="3" />
      ) : (
        <rect x="20" y="20" width="160" height="160" rx="38" fill="url(#mg-bg)" />
      )}
      <polygon points="58,56 81,56 142,144 119,144" fill="#FFFFFF" />
      <rect x="119" y="56" width="23" height="88" rx="3" fill="#FFFFFF" />
      <rect x="58" y="56" width="23" height="88" rx="3" fill="url(#mg-gold)" />
    </svg>
  );
}

export function Logo({
  tone = "dark",
  image,
  siteName = "Isaac Nyamari",
  className,
}: {
  tone?: "dark" | "light";
  image?: PublicImage | null;
  siteName?: string;
  className?: string;
}) {
  const [first, ...rest] = siteName.split(" ");
  return (
    <Link href="/" className={cn("inline-flex items-center gap-3", className)} aria-label={`${siteName} — home`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt={siteName} className="h-10 w-auto" width={image.width ?? undefined} height={image.height ?? undefined} />
      ) : (
        <>
          <Monogram className="h-10 w-10 shrink-0" tone={tone} />
          <span className="flex flex-col leading-none">
            <span
              className={cn("font-display text-[1.02rem] tracking-[0.14em]", tone === "dark" ? "text-white" : "text-ink")}
            >
              <span className="font-extrabold">{first?.toUpperCase()}</span>{" "}
              <span className="font-medium">{rest.join(" ").toUpperCase()}</span>
            </span>
            <span className="mt-[6px] block h-[3px] w-7 rounded-full" style={{ background: "var(--gold-gradient)" }} />
          </span>
        </>
      )}
    </Link>
  );
}
