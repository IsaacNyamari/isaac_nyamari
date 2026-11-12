"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { aiSeoAction } from "@/app/admin/(panel)/ai/actions";
import type { ActionResult } from "@/lib/action";
import { useAction } from "@/components/admin/hooks";
import { Button, Card, Field, Select, Textarea } from "@/components/admin/ui";

type Tone = "professional" | "friendly" | "technical";
type Length = "short" | "medium" | "long";

/**
 * "Write with AI" card shown at the top of the post and project editors.
 * Describe the idea in plain words; the AI fills every field. Existing text is kept unless "replace" is ticked.
 */
export function AiDraftPanel<T>({
  kind, generate, onApply, categories, tags = [],
}: {
  kind: "post" | "project";
  generate: (input: { brief: string; tone: Tone; length: Length; categories: string[]; tags: string[] }) => Promise<ActionResult<T>>;
  onApply: (draft: T, replace: boolean) => void;
  categories: string[];
  tags?: string[];
}) {
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [length, setLength] = useState<Length>("medium");
  const [replace, setReplace] = useState(false);

  const noun = kind === "post" ? "article" : "project";
  const placeholder =
    kind === "post"
      ? "e.g. Why small businesses in Kenya should move from spreadsheets to a custom inventory system — cover cost, M-Pesa integration, and a simple rollout plan."
      : "e.g. A school fees management system for a Nairobi school: parents pay via M-Pesa, the bursar sees live balances and receipts. Built with Laravel, MySQL and Daraja API in 3 months. I was the lead developer.";

  function go() {
    run(() => generate({ brief, tone, length, categories, tags }), {
      silent: true,
      onSuccess: (draft) => {
        onApply(draft, replace);
        toast.success("Draft ready — review it, add images, then save. Nothing is published yet.");
        setOpen(false);
      },
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-gold/60 bg-[#fffaf0] p-4 text-left hover:border-gold">
        <Sparkles className="h-5 w-5 shrink-0 text-[#b27a12]" aria-hidden="true" />
        <span>
          <span className="block text-sm font-semibold text-ink">Write this {noun} with AI</span>
          <span className="block text-xs text-[#6b7385]">Describe the idea in a few sentences — AI fills the title, text, summary, tags and SEO for you to review.</span>
        </span>
      </button>
    );
  }

  return (
    <Card title={`Write this ${noun} with AI`} description="Powered by Google Gemini. You always review and edit before anything is saved or published.">
      <div className="space-y-4">
        <Field label={`What is this ${noun} about?`} htmlFor="ai-brief" help={`${brief.length}/4000 · The more real detail you give (what, for whom, tools, results), the better and more accurate the result.`}>
          <Textarea id="ai-brief" rows={5} maxLength={4000} value={brief} placeholder={placeholder} onChange={(e) => setBrief(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tone" htmlFor="ai-tone">
            <Select id="ai-tone" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="technical">Technical</option>
            </Select>
          </Field>
          <Field label="Length" htmlFor="ai-len">
            <Select id="ai-len" value={length} onChange={(e) => setLength(e.target.value as Length)}>
              <option value="short">Short (~400 words)</option>
              <option value="medium">Medium (~800 words)</option>
              <option value="long">Long (~1400 words)</option>
            </Select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
          Replace fields that already have text <span className="text-xs text-[#6b7385]">(off = only fill empty fields)</span>
        </label>
        <div className="flex items-center gap-3">
          <Button variant="gold" loading={pending} disabled={pending || brief.trim().length < 10} onClick={go}>
            <Sparkles className="h-4 w-4" aria-hidden="true" /> {pending ? "Writing… (10–30s)" : "Generate draft"}
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
        </div>
        <p className="admin-help">AI can make mistakes — check facts, names and numbers. It is told not to invent clients or results, but always verify.</p>
      </div>
    </Card>
  );
}

/** Small "Suggest with AI" button for the SEO card: writes SEO title, description and the short summary from the current content. */
export function AiSeoButton({ kind, title, getText, onApply, shortLabel }: {
  kind: "post" | "project";
  title: string;
  getText: () => string;
  onApply: (v: { seoTitle: string; seoDescription: string; shortText: string }) => void;
  shortLabel: string;
}) {
  const { pending, run } = useAction();
  return (
    <Button
      size="sm"
      loading={pending}
      disabled={pending}
      onClick={() => {
        if (!title.trim()) return toast.error("Add a title first.");
        run(() => aiSeoAction({ kind, title, text: getText() }), { silent: true, onSuccess: (v) => { onApply(v); toast.success(`SEO fields filled (and ${shortLabel} if empty). Review and save.`); } });
      }}
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Suggest with AI
    </Button>
  );
}
