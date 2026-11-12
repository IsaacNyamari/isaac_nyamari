"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const LINES: { prompt?: boolean; text: string; tone?: "ok" | "muted" | "gold" }[] = [
  { prompt: true, text: "plan --problem \"manual billing\"" },
  { text: "✓ workflow mapped · 4 roles · 12 steps", tone: "ok" },
  { prompt: true, text: "build api web db --tenant-aware" },
  { text: "✓ REST API · web app · PostgreSQL schema", tone: "ok" },
  { prompt: true, text: "integrate payments sms devices" },
  { text: "✓ 3 integrations connected", tone: "ok" },
  { prompt: true, text: "deploy --server linux --backups daily" },
  { text: "● live · monitored · backed up", tone: "gold" },
];

/** Decorative "systems" console shown in the hero when no portrait has been uploaded. */
export function TerminalCard() {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(reduce ? LINES.length : 0);

  useEffect(() => {
    if (reduce) return;
    if (count >= LINES.length) return;
    const t = setTimeout(() => setCount((c) => c + 1), count === 0 ? 600 : LINES[count - 1]?.prompt ? 520 : 380);
    return () => clearTimeout(t);
  }, [count, reduce]);

  return (
    <div className="relative" aria-hidden="true">
      <div className="absolute -bottom-4 -right-4 h-[70%] w-[70%] rounded-[22px]" style={{ background: "var(--gold-gradient)" }} />
      <motion.div
        className="relative z-10 overflow-hidden rounded-[20px] border border-navy-line bg-[#0d1529] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]"
        initial={false}
        animate={reduce ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-xs text-mist/70">isaac@systems: ~/projects</span>
        </div>
        <div className="min-h-[330px] px-5 py-5 font-mono text-[0.82rem] leading-7 sm:min-h-[360px] sm:text-[0.88rem]">
          {LINES.slice(0, count).map((l, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
              {l.prompt ? (
                <span>
                  <span className="text-gold-hi">$</span> <span className="text-white">{l.text}</span>
                </span>
              ) : (
                <span className={l.tone === "gold" ? "text-gold-hi" : "text-[#7fd6a8]"}>{l.text}</span>
              )}
            </motion.div>
          ))}
          <span className="text-gold-hi">$</span> <span className="cursor-blink inline-block h-4 w-2 translate-y-[3px] bg-gold-hi" />
        </div>
      </motion.div>
    </div>
  );
}
