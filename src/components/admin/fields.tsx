"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useState } from "react";
import { slugify } from "@/lib/slug";
import { Button, Field, Input, Textarea } from "./ui";

/** Slug that follows the title until the administrator edits it by hand. */
export function SlugField({
  value, onChange, title, prefix, error, locked, onAutoSyncChange,
}: {
  value: string; onChange: (v: string) => void; title: string; prefix: string; error?: string; locked?: boolean;
  autoSync: boolean; onAutoSyncChange: (v: boolean) => void;
}) {
  return (
    <Field
      label="URL slug"
      htmlFor="slug"
      error={error}
      help={locked ? "This page's address is fixed." : <>Public address: <code className="text-[0.75rem]">{prefix}{value || "…"}</code></>}
    >
      <div className="flex gap-2">
        <Input
          id="slug"
          value={value}
          disabled={locked}
          invalid={Boolean(error)}
          onChange={(e) => {
            onAutoSyncChange(false);
            onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-"));
          }}
          onBlur={() => onChange(slugify(value))}
        />
        {!locked && (
          <Button
            size="md"
            onClick={() => {
              onAutoSyncChange(true);
              onChange(slugify(title));
            }}
            title="Generate from title"
          >
            Generate
          </Button>
        )}
      </div>
    </Field>
  );
}

/** Editable ordered list of short strings (deliverables, technologies, interests …). */
export function StringListEditor({ label, items, onChange, placeholder, help, max = 30 }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string; help?: string; max?: number }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || items.includes(v) || items.length >= max) return;
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <Field label={label} help={help}>
      {items.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="flex items-center gap-1 rounded-lg border border-[#e3e6ed] bg-[#fafbfc] py-1 pl-3 pr-1 text-sm">
              <span className="flex-1">{item}</span>
              <IconBtn label="Move up" disabled={i === 0} onClick={() => onChange(move(items, i, -1))}><ArrowUp /></IconBtn>
              <IconBtn label="Move down" disabled={i === items.length - 1} onClick={() => onChange(move(items, i, 1))}><ArrowDown /></IconBtn>
              <IconBtn label={`Remove ${item}`} onClick={() => onChange(items.filter((_, j) => j !== i))}><X /></IconBtn>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          aria-label={`Add to ${label}`}
        />
        <Button onClick={add} disabled={!draft.trim()}><Plus className="h-4 w-4" /> Add</Button>
      </div>
    </Field>
  );
}

/** Repeating group of title + description pairs. */
export function PairListEditor({ label, items, onChange, max = 12 }: { label: string; items: { title: string; description: string }[]; onChange: (v: { title: string; description: string }[]) => void; max?: number }) {
  return (
    <Field label={label}>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border border-[#e3e6ed] bg-[#fafbfc] p-3">
            <div className="flex gap-2">
              <Input value={it.title} placeholder="Title" aria-label={`${label} ${i + 1} title`} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
              <IconBtn label="Move up" disabled={i === 0} onClick={() => onChange(move(items, i, -1))}><ArrowUp /></IconBtn>
              <IconBtn label="Move down" disabled={i === items.length - 1} onClick={() => onChange(move(items, i, 1))}><ArrowDown /></IconBtn>
              <IconBtn label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}><X /></IconBtn>
            </div>
            <Textarea className="mt-2 !min-h-[64px]" rows={2} value={it.description} placeholder="Description" aria-label={`${label} ${i + 1} description`} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
          </div>
        ))}
      </div>
      {items.length < max && (
        <Button className="mt-2" size="sm" onClick={() => onChange([...items, { title: "", description: "" }])}><Plus className="h-3.5 w-3.5" /> Add item</Button>
      )}
    </Field>
  );
}

export function SeoFields({ title, description, onChange, fallbackTitle, fallbackDescription, children }: { title: string; description: string; onChange: (v: { seoTitle?: string; seoDescription?: string }) => void; fallbackTitle: string; fallbackDescription: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <Field label="SEO title" htmlFor="seo-title" help={`${title.length}/70 · Defaults to “${fallbackTitle.slice(0, 50) || "the title"}”`}>
        <Input id="seo-title" value={title} maxLength={70} onChange={(e) => onChange({ seoTitle: e.target.value })} />
      </Field>
      <Field label="SEO description" htmlFor="seo-desc" help={`${description.length}/170 · Defaults to ${fallbackDescription ? "the excerpt" : "the site description"}`}>
        <Textarea id="seo-desc" rows={3} value={description} maxLength={170} onChange={(e) => onChange({ seoDescription: e.target.value })} />
      </Field>
      {children}
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid h-8 w-8 shrink-0 place-items-center rounded text-[#6b7385] hover:bg-[#eef0f4] hover:text-ink disabled:opacity-30 [&_svg]:h-3.5 [&_svg]:w-3.5">
      {children}
    </button>
  );
}

export function move<T>(arr: T[], index: number, delta: number): T[] {
  const next = [...arr];
  const target = index + delta;
  if (target < 0 || target >= arr.length) return arr;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
