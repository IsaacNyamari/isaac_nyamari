"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicImage } from "@/server/queries/common";

type Item = PublicImage & { galleryCaption: string };

export function Gallery({ items }: { items: Item[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setIndex(null);
    lastTrigger.current?.focus();
  }, []);
  const step = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (index === null) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, step]);

  const current = index === null ? null : items[index];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {items.map((img, i) => (
          <li key={img.id + i}>
            <button
              type="button"
              className="group block w-full overflow-hidden rounded-[14px] focus-visible:outline-offset-4"
              onClick={(e) => {
                lastTrigger.current = e.currentTarget;
                setIndex(i);
              }}
              aria-label={`Open image ${i + 1} of ${items.length}${img.alt ? `: ${img.alt}` : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                srcSet={img.srcSet || undefined}
                sizes="(min-width: 1024px) 380px, 50vw"
                alt={img.alt}
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {current && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
            className="fixed inset-0 z-[100] flex flex-col bg-ink/95 p-4 backdrop-blur-sm sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && close()}
          >
            <div className="flex justify-between text-sm text-mist">
              <span>{index! + 1} / {items.length}</span>
              <button ref={closeRef} type="button" onClick={close} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Close">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="relative flex flex-1 items-center justify-center py-4" onClick={(e) => e.target === e.currentTarget && close()}>
              <motion.img key={current.id + index} src={current.url} alt={current.alt} className="max-h-full max-w-full rounded-lg object-contain" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} />
              {items.length > 1 && (
                <>
                  <button type="button" onClick={() => step(-1)} className="absolute left-0 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Previous image">
                    <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => step(1)} className="absolute right-0 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Next image">
                    <ChevronRight className="h-6 w-6" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
            {current.galleryCaption && <p className="text-center text-sm text-mist">{current.galleryCaption}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
