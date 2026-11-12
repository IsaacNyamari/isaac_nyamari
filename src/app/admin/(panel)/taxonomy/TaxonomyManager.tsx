"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useAction } from "@/components/admin/hooks";
import { Button, Card, ConfirmButton, Dialog, Field, Input, Textarea } from "@/components/admin/ui";
import { slugify } from "@/lib/slug";
import { deleteCategoryAction, deleteTagAction, saveCategoryAction, saveTagAction } from "./actions";

type Item = { id: string; name: string; slug: string; description: string; count: number };

export function TaxonomyManager({ categories, tags }: { categories: Item[]; tags: Item[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TermList kind="category" items={categories} />
      <TermList kind="tag" items={tags} />
    </div>
  );
}

function TermList({ kind, items }: { kind: "category" | "tag"; items: Item[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Item | null>(null);
  const { pending, run, fieldErrors } = useAction();
  const label = kind === "category" ? "Category" : "Tag";
  const save = kind === "category" ? saveCategoryAction : saveTagAction;
  const remove = kind === "category" ? deleteCategoryAction : deleteTagAction;

  return (
    <Card
      title={kind === "category" ? "Categories" : "Tags"}
      description={kind === "category" ? "One per post. Used for archive pages and navigation." : "Many per post. Used for tag archives and related articles."}
      actions={<Button size="sm" variant="primary" onClick={() => setEditing({ id: "", name: "", slug: "", description: "", count: 0 })}><Plus className="h-3.5 w-3.5" /> Add</Button>}
    >
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#6b7385]">None yet.</p>
      ) : (
        <ul className="divide-y divide-[#eef0f4]">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="font-medium">{it.name}</p>
                <p className="truncate text-xs text-[#6b7385]">/{it.slug} · {it.count} post{it.count === 1 ? "" : "s"}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(it)} aria-label={`Edit ${it.name}`}><Pencil className="h-3.5 w-3.5" /></Button>
                <ConfirmButton
                  size="sm"
                  disabled={it.count > 0}
                  title={`Delete ${label.toLowerCase()} “${it.name}”?`}
                  message="This cannot be undone."
                  confirmLabel="Delete"
                  onConfirm={() => run(() => remove(it.id), { onSuccess: () => router.refresh() })}
                >
                  Delete
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${label.toLowerCase()}` : `New ${label.toLowerCase()}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              variant="primary"
              loading={pending}
              onClick={() =>
                editing &&
                run(() => save(editing.id || null, { name: editing.name, slug: editing.slug || slugify(editing.name), description: editing.description }), {
                  onSuccess: () => {
                    setEditing(null);
                    router.refresh();
                  },
                })
              }
            >
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <Field label="Name" htmlFor="t-name" error={fieldErrors.name} required>
              <Input id="t-name" value={editing.name} autoFocus onChange={(e) => setEditing({ ...editing, name: e.target.value, ...(editing.id ? {} : { slug: slugify(e.target.value) }) })} />
            </Field>
            <Field label="Slug" htmlFor="t-slug" error={fieldErrors.slug} help={`/insights/${kind}/${editing.slug || "…"}${editing.id && editing.count ? " — changing this changes public URLs" : ""}`}>
              <Input id="t-slug" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase() })} />
            </Field>
            {kind === "category" && (
              <Field label="Description" htmlFor="t-desc">
                <Textarea id="t-desc" rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </Field>
            )}
          </div>
        )}
      </Dialog>
    </Card>
  );
}
