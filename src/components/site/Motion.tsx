"use client";

import { MotionConfig } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Honour the visitor's reduced-motion preference for every Motion animation. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

let observer: IntersectionObserver | null = null;
function getObserver() {
  if (observer || typeof window === "undefined") return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          observer?.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  );
  return observer;
}

/**
 * Fades and lifts content in the first time it scrolls into view.
 * Content is only hidden once JavaScript has run (`html.js`), so it is always visible without JS.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    const io = getObserver();
    if (!el || !io) return;
    io.observe(el);
    return () => io.unobserve(el);
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={cn("reveal", className)}
      style={delay ? ({ "--reveal-delay": `${delay}s` } as CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
