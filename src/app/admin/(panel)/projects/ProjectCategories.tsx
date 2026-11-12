"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useAction } from "@/components/admin/hooks";
import { Button, Card, ConfirmButton, Input } from "@/components/admin/ui";
import { slugify } from "@/lib/slug";
import { deleteProjectCategoryAction, saveProjectCategoryAction } from "./actions";

type Item = { id: string; name: string; slug: string; count: number };

export function ProjectCategories({ items }: { items: Item[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const { pending, run } = useAction();

  return (
    <Card title="Project categories" description="Used for the portfolio filter.">
      <ul className="mb-3 divide-y divide-[#eef0f4]">
        {items.map((c) => (
          <li key={c.id} className="flex items-center gap-2 py-2">
            {editing[c.id] !== undefined ? (
              <>
                <Input value={editing[c.id]} onChange={(e) => setEditing({ ...editing, [c.id]: e.target.value })} className="!h-9 !min-h-0" aria-label="Category name" autoFocus />
                <Button size="sm" variant="primary" loading={pending} onClick={() => run(() => saveProjectCategoryAction(c.id, { name: editing[c.id], slug: c.slug }), { onSuccess: () => { setEditing({}); router.refresh(); } })}>Save</Button>
              </>
            ) : (
              <>
                <button type="button" className="flex-1 text-left text-sm hover:underline" onClick={() => setEditing({ [c.id]: c.name })}>
                  {c.name} <span className="text-xs text-[#9aa1b1]">({c.count})</span>
                </button>
                <ConfirmButton size="sm" variant="secondary" title={`Delete “${c.name}”?`} message={c.count ? `It will be removed from ${c.count} project(s). The projects themselves are kept.` : "This cannot be undone."} confirmLabel="Delete" onConfirm={() => run(() => deleteProjectCategoryAction(c.id), { onSuccess: () => router.refresh() })}>
                  ✕
                </ConfirmButton>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" className="!h-9 !min-h-0" aria-label="New category name" />
        <Button size="sm" disabled={!name.trim()} loading={pending} onClick={() => run(() => saveProjectCategoryAction(null, { name, slug: slugify(name) }), { onSuccess: () => { setName(""); router.refresh(); } })}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </Card>
  );
}
