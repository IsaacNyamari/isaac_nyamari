"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { move } from "@/components/admin/fields";
import { useAction, useUnsavedChanges } from "@/components/admin/hooks";
import { Button, Card, Input, Select } from "@/components/admin/ui";
import { saveNavigationAction } from "./actions";

type Item = { label: string; href: string; newTab: boolean; enabled: boolean };

export function MenuEditor({ menuKey, title, initial, suggestions }: { menuKey: "header" | "footer"; title: string; initial: Item[]; suggestions: { label: string; href: string }[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const { pending, run, fieldErrors } = useAction();
  const dirty = JSON.stringify(items) !== saved;
  useUnsavedChanges(dirty);
  const update = (i: number, patch: Partial<Item>) => setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <Card
      title={title}
      actions={
        <Button size="sm" variant="primary" disabled={!dirty} loading={pending} onClick={() => run(() => saveNavigationAction(menuKey, { items }), { onSuccess: () => { setSaved(JSON.stringify(items)); router.refresh(); } })}>
          Save
        </Button>
      }
    >
      <ul className="space-y-2">
        {items.map((it, i) => {
          const external = /^(https?:|mailto:|tel:)/i.test(it.href);
          const err = fieldErrors[`items.${i}.href`] ?? fieldErrors[`items.${i}.label`];
          return (
            <li key={i} className={`rounded-lg border p-2.5 ${it.enabled ? "border-[#e3e6ed] bg-white" : "border-dashed border-[#d5d9e2] bg-[#fafbfc]"}`}>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={it.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Label" aria-label={`Item ${i + 1} label`} className="sm:w-40" />
                <Input value={it.href} onChange={(e) => update(i, { href: e.target.value })} placeholder="/page or https://…" aria-label={`Item ${i + 1} destination`} invalid={Boolean(fieldErrors[`items.${i}.href`])} />
              </div>
              {err && <p className="mt-1 text-xs text-danger">{err}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={it.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} className="accent-[var(--ink)]" /> Enabled</label>
                {external && <label className="flex items-center gap-1.5"><input type="checkbox" checked={it.newTab} onChange={(e) => update(i, { newTab: e.target.checked })} className="accent-[var(--ink)]" /> Open in new tab</label>}
                <span className="text-[#9aa1b1]">{external ? "External link" : "Internal link"}</span>
                <span className="ml-auto flex">
                  <button type="button" disabled={i === 0} onClick={() => setItems(move(items, i, -1))} className="rounded p-1 hover:bg-[#eef0f4] disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" disabled={i === items.length - 1} onClick={() => setItems(move(items, i, 1))} className="rounded p-1 hover:bg-[#eef0f4] disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="rounded p-1 text-danger hover:bg-red-50" aria-label="Remove item"><Trash2 className="h-3.5 w-3.5" /></button>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Select
          className="!h-9 !min-h-0 !w-auto text-sm"
          value=""
          aria-label="Add an existing page"
          onChange={(e) => {
            const s = suggestions.find((x) => x.href === e.target.value);
            if (s) setItems([...items, { label: s.label, href: s.href, newTab: false, enabled: true }]);
          }}
        >
          <option value="">Add a page…</option>
          {suggestions.map((s) => <option key={s.href} value={s.href}>{s.label} ({s.href})</option>)}
        </Select>
        <Button size="sm" onClick={() => setItems([...items, { label: "", href: "", newTab: false, enabled: true }])}><Plus className="h-3.5 w-3.5" /> Custom link</Button>
      </div>
    </Card>
  );
}
