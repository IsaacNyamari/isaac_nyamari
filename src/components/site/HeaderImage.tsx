/**
 * Photographic backdrops for the dark header bands on inner pages.
 *
 * The photos come from Pexels (free to use under the Pexels licence; see
 * public/images/headers/CREDITS.md) and are stored locally as pre-sized WebP files,
 * so no third-party request is made when a page loads.
 */
/** File-name stem in public/images/headers → what the photo shows. */
export type HeaderImageKey =
  | "about" // desk with a monitor showing code in a dimly lit room
  | "services" // colourful source code on a screen
  | "projects" // task board on a laptop in front of monitors with charts
  | "insights" // backlit mechanical keyboard
  | "contact" // laptop showing code beside a coffee mug
  | "search" // hands typing on an illuminated keyboard
  | "default" // close-up of an electronic circuit board
  | "service-custom-software" // lines of code on a monitor
  | "service-websites" // laptop showing code on a wooden desk
  | "service-business-systems" // laptop showing an analytics dashboard
  | "service-infrastructure" // illuminated server units in a data centre
  | "service-integrations"; // network cables plugged into a switch

/** Seeded service slugs mapped to a fitting photo; other services fall back to the services image. */
const SERVICE_IMAGES: Record<string, HeaderImageKey> = {
  "custom-software-development": "service-custom-software",
  "website-design-and-development": "service-websites",
  "business-management-systems-and-saas": "service-business-systems",
  "systems-architecture-and-infrastructure": "service-infrastructure",
  "api-integration-and-technology-consulting": "service-integrations",
};

export function serviceHeaderImage(slug: string): HeaderImageKey {
  return SERVICE_IMAGES[slug] ?? "services";
}

/** Full-bleed photo under a navy wash so headings stay readable. Decorative, so it has empty alt text. */
export function HeaderBackdrop({ image }: { image: HeaderImageKey }) {
  const base = `/images/headers/${image}`;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${base}-1920.webp`}
        srcSet={`${base}-960.webp 960w, ${base}-1920.webp 1920w`}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        decoding="async"
        className="h-full w-full object-cover opacity-75"
      />
      {/* Text spans the full width on phones, so the wash is even there; wider screens fade it out to the right. */}
      <div className="absolute inset-0 bg-[rgb(11_18_34/0.84)] md:bg-[linear-gradient(100deg,rgb(11_18_34/0.94)_10%,rgb(11_18_34/0.78)_45%,rgb(11_18_34/0.3)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink to-transparent" />
    </div>
  );
}
