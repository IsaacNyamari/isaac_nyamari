"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, EyeOff, Pencil, Plus } from "lucide-react";
import { move } from "@/components/admin/fields";
import { useAction } from "@/components/admin/hooks";
import { Button, ConfirmButton, Dialog, EmptyState, Field, Input, Select, Textarea, Toggle } from "@/components/admin/ui";
import { ICON_NAMES, Icon } from "@/lib/icons";
import { deleteSkillAction, reorderSkillsAction, saveSkillAction } from "./actions";

type Skill = { id: string; name: string; category: string; description: string; icon: string; visible: boolean };

export function SkillsManager({ skills: initial }: { skills: Skill[] }) {
  const router = useRouter();
  const [skills, setSkills] = useState(initial);
  const [editing, setEditing] = useState<Skill | null>(null);
  const { pending, run, fieldErrors } = useAction();
  const categories = [...new Set(skills.map((s) => s.category))];
  const orderChanged = skills.map((s) => s.id).join() !== initial.map((s) => s.id).join();

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {orderChanged && (
          <Button variant="gold" loading={pending} onClick={() => run(() => reorderSkillsAction(skills.map((s) => s.id)), { onSuccess: () => router.refresh() })}>
            Save order
          </Button>
        )}
        <Button variant="primary" onClick={() => setEditing({ id: "", name: "", category: categories[0] ?? "", description: "", icon: "code", visible: true })}>
          <Plus className="h-4 w-4" /> Add skill
        </Button>
      </div>
      {skills.length === 0 ? (
        <EmptyState title="No skills yet" text="Add the technologies and capabilities you want to highlight." />
      ) : (
        <ul className="admin-card divide-y divide-[#eef0f4]">
          {skills.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f4f5f8]"><Icon name={s.icon || "code"} className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {s.name} {!s.visible && <EyeOff className="ml-1 inline h-3.5 w-3.5 text-[#9aa1b1]" aria-label="Hidden" />}
                </p>
                <p className="truncate text-xs text-[#6b7385]">{s.category}{s.description ? ` · ${s.description}` : ""}</p>
              </div>
              <button type="button" disabled={i === 0} onClick={() => setSkills(move(skills, i, -1))} className="rounded p-1.5 text-[#6b7385] hover:bg-[#eef0f4] disabled:opacity-30" aria-label={`Move ${s.name} up`}><ArrowUp className="h-4 w-4" /></button>
              <button type="button" disabled={i === skills.length - 1} onClick={() => setSkills(move(skills, i, 1))} className="rounded p-1.5 text-[#6b7385] hover:bg-[#eef0f4] disabled:opacity-30" aria-label={`Move ${s.name} down`}><ArrowDown className="h-4 w-4" /></button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}><Pencil className="h-3.5 w-3.5" /></Button>
              <ConfirmButton size="sm" title={`Delete “${s.name}”?`} message="This cannot be undone." confirmLabel="Delete" onConfirm={() => run(() => deleteSkillAction(s.id), { onSuccess: () => router.refresh() })}>
                Delete
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit skill" : "New skill"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" loading={pending} onClick={() => editing && run(() => saveSkillAction(editing.id || null, editing), { onSuccess: () => { setEditing(null); router.refresh(); } })}>
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <Field label="Name" htmlFor="sk-name" error={fieldErrors.name} required>
              <Input id="sk-name" autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Category" htmlFor="sk-cat" error={fieldErrors.category} help="Skills are grouped by category on the website." required>
              <Input id="sk-cat" list="skill-categories" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              <datalist id="skill-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Description (optional)" htmlFor="sk-desc">
              <Textarea id="sk-desc" rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <Field label="Icon" htmlFor="sk-icon">
              <Select id="sk-icon" value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })}>
                <option value="">None</option>
                {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
            <Toggle label="Visible on the website" checked={editing.visible} onChange={(visible) => setEditing({ ...editing, visible })} />
          </div>
        )}
      </Dialog>
    </div>
  );
}
