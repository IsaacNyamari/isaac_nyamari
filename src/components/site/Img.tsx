import type { PublicImage } from "@/server/queries/common";
import { cn } from "@/lib/utils";

/**
 * Responsive image from the media library. Pre-generated WebP variants are offered via srcset
 * (see src/lib/media.ts), so no runtime optimisation round-trip is needed.
 */
export function Img({
  image,
  sizes = "100vw",
  className,
  priority,
  alt,
}: {
  image: PublicImage;
  sizes?: string;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      srcSet={image.srcSet || undefined}
      sizes={image.srcSet ? sizes : undefined}
      alt={alt ?? image.alt}
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
