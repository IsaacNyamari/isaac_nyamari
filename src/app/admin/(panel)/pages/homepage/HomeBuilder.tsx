"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { move, PairListEditor } from "@/components/admin/fields";
import { useAction, useUnsavedChanges } from "@/components/admin/hooks";
import { ImageField, type ImageValue } from "@/components/admin/MediaPicker";
import { Button, Card, ConfirmButton, Field, Input, Select, StatusBadge, Textarea, Toggle } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import type { SectionType } from "@/lib/validation";
import { publishHomeAction, resetHomeDraftAction, saveHomeDraftAction } from "./actions";

type Section = { key: string; type: SectionType; visible: boolean; config: Record<string, unknown> };
type Option = { id: string; title: string; status: string };

const LABELS: Record<SectionType, string> = {
  HERO: "Hero",
  INTRO: "Introduction",
  SERVICES: "Services",
  PROJECTS: "Featured projects",
  SKILLS: "Technical skills",
  PROCESS: "Development process",
  INSIGHTS: "Insights (blog)",
  CONTACT_CTA: "Contact call-to-action",
};

export function HomeBuilder({
  initial, images: initialImages, services, projects, posts, unpublished,
}: {
  initial: Section[]; images: Record<string, NonNullable<ImageValue>>; services: Option[]; projects: Option[]; posts: Option[]; unpublished: boolean;
}) {
  const router = useRouter();
  const strip = (s: Section[]) => s.map(({ key, type, visible, config }) => ({ key, type, visible, config }));
  const [sections, setSections] = useState<Section[]>(strip(initial));
  const [saved, setSaved] = useState(JSON.stringify(strip(initial)));
  const [images, setImages] = useState(initialImages);
  const [openKey, setOpenKey] = useState<string | null>(initial[0]?.key ?? null);
  const [addType, setAddType] = useState<SectionType>("PROCESS");
  const { pending, run } = useAction();
  const dirty = JSON.stringify(sections) !== saved;
  useUnsavedChanges(dirty);

  const update = (key: string, patch: Partial<Section>) => setSections((all) => all.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const setConfig = (key: string, patch: Record<string, unknown>) => setSections((all) => all.map((s) => (s.key === key ? { ...s, config: { ...s.config, ...patch } } : s)));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-3">
        {sections.map((s, i) => {
          const open = openKey === s.key;
          return (
            <section key={s.key} className={cn("admin-card overflow-hidden", !s.visible && "opacity-70")}>
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span className="w-6 text-center text-xs tabular-nums text-[#9aa1b1]">{i + 1}</span>
                <button type="button" onClick={() => setOpenKey(open ? null : s.key)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden="true" />
                  <span className="font-medium">{LABELS[s.type]}</span>
                  <span className="truncate text-xs text-[#6b7385]">{String(s.config.title ?? "")}</span>
                </button>
                <button type="button" onClick={() => update(s.key, { visible: !s.visible })} className="rounded p-1.5 text-[#6b7385] hover:bg-[#eef0f4]" aria-label={s.visible ? `Hide ${LABELS[s.type]}` : `Show ${LABELS[s.type]}`} aria-pressed={!s.visible}>
                  {s.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button type="button" disabled={i === 0} onClick={() => setSections(move(sections, i, -1))} className="rounded p-1.5 text-[#6b7385] hover:bg-[#eef0f4] disabled:opacity-30" aria-label={`Move ${LABELS[s.type]} up`}><ArrowUp className="h-4 w-4" /></button>
                <button type="button" disabled={i === sections.length - 1} onClick={() => setSections(move(sections, i, 1))} className="rounded p-1.5 text-[#6b7385] hover:bg-[#eef0f4] disabled:opacity-30" aria-label={`Move ${LABELS[s.type]} down`}><ArrowDown className="h-4 w-4" /></button>
                <button type="button" onClick={() => window.confirm(`Remove the ${LABELS[s.type]} section from the draft?`) && setSections(sections.filter((x) => x.key !== s.key))} className="rounded p-1.5 text-[#6b7385] hover:bg-red-50 hover:text-danger" aria-label={`Remove ${LABELS[s.type]}`}><Trash2 className="h-4 w-4" /></button>
              </div>
              {open && (
                <div className="border-t border-[#eef0f4] bg-[#fcfcfd] p-4">
                  <SectionEditor
                    section={s}
                    images={images}
                    onImage={(img) => img && setImages((m) => ({ ...m, [img.id]: img }))}
                    setConfig={(patch) => setConfig(s.key, patch)}
                    services={services}
                    projects={projects}
                    posts={posts}
                  />
                </div>
              )}
            </section>
          );
        })}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-[#cfd4de] p-3">
          <Select value={addType} onChange={(e) => setAddType(e.target.value as SectionType)} className="!w-auto" aria-label="Section type to add">
            {(Object.keys(LABELS) as SectionType[]).map((t) => <option key={t} value={t}>{LABELS[t]}</option>)}
          </Select>
          <Button
            onClick={() => {
              const key = `${addType.toLowerCase()}-${Date.now().toString(36)}`;
              setSections([...sections, { key, type: addType, visible: true, config: {} }]);
              setOpenKey(key);
            }}
          >
            <Plus className="h-4 w-4" /> Add section
          </Button>
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card title="Publish">
          <div className="mb-3 flex flex-wrap gap-2">
            {unpublished && !dirty && <StatusBadge status="SCHEDULED" label="draft differs from live" />}
            {dirty && <span className="text-xs font-medium text-amber-700">● Unsaved edits</span>}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="gold" loading={pending} onClick={() => run(() => publishHomeAction(sections), { onSuccess: () => { setSaved(JSON.stringify(sections)); router.refresh(); } })}>Publish homepage</Button>
            <Button loading={pending} onClick={() => run(() => saveHomeDraftAction(sections), { onSuccess: () => { setSaved(JSON.stringify(sections)); router.refresh(); } })}>Save draft</Button>
            <Button
              loading={pending}
              onClick={() =>
                run(() => saveHomeDraftAction(sections), {
                  silent: true,
                  onSuccess: () => {
                    setSaved(JSON.stringify(sections));
                    window.open("/api/preview?path=/", "_blank", "noopener");
                  },
                })
              }
            >
              <Eye className="h-4 w-4" /> Save & preview
            </Button>
          </div>
          <div className="mt-4 border-t border-[#eef0f4] pt-4">
            <ConfirmButton
              size="sm"
              variant="secondary"
              title="Discard the draft?"
              message="The editor will be reset to the homepage that is currently live."
              confirmLabel="Discard draft"
              onConfirm={() => run(() => resetHomeDraftAction(), { onSuccess: (fresh) => { const s = strip(fresh); setSections(s); setSaved(JSON.stringify(s)); router.refresh(); } })}
            >
              Discard draft
            </ConfirmButton>
          </div>
        </Card>
        <p className="px-1 text-xs text-[#6b7385]">Sections render through a fixed set of components — no custom code can be injected. Empty sections (e.g. no published projects) are hidden automatically.</p>
      </div>
    </div>
  );
}

function SectionEditor({
  section, images, onImage, setConfig, services, projects, posts,
}: {
  section: Section; images: Record<string, NonNullable<ImageValue>>; onImage: (v: ImageValue) => void; setConfig: (p: Record<string, unknown>) => void;
  services: Option[]; projects: Option[]; posts: Option[];
}) {
  const c = section.config as Record<string, never>;
  const text = (name: string, label: string, opts?: { area?: boolean; help?: string; max?: number }) => (
    <Field label={label} htmlFor={`${section.key}-${name}`} help={opts?.help}>
      {opts?.area ? (
        <Textarea id={`${section.key}-${name}`} rows={4} maxLength={opts.max} value={(c[name] as string) ?? ""} onChange={(e) => setConfig({ [name]: e.target.value })} />
      ) : (
        <Input id={`${section.key}-${name}`} maxLength={opts?.max} value={(c[name] as string) ?? ""} onChange={(e) => setConfig({ [name]: e.target.value })} />
      )}
    </Field>
  );
  const ctaField = (name: string, label: string) => {
    const v = (c[name] as unknown as { label?: string; href?: string }) ?? {};
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${label} — label`} htmlFor={`${section.key}-${name}-l`}><Input id={`${section.key}-${name}-l`} value={v.label ?? ""} onChange={(e) => setConfig({ [name]: { ...v, label: e.target.value } })} /></Field>
        <Field label={`${label} — link`} htmlFor={`${section.key}-${name}-h`} help="/contact, /projects, https://…"><Input id={`${section.key}-${name}-h`} value={v.href ?? ""} onChange={(e) => setConfig({ [name]: { ...v, href: e.target.value } })} /></Field>
      </div>
    );
  };
  const imageField = (name: string, label: string, help?: string) => {
    const id = c[name] as string | null | undefined;
    return (
      <ImageField
        label={label}
        help={help}
        aspect="aspect-[16/9]"
        value={id ? images[id] ?? { id, url: "" } : null}
        onChange={(v) => {
          onImage(v);
          setConfig({ [name]: v?.id ?? null });
        }}
      />
    );
  };
  const picker = (name: string, label: string, options: Option[], help: string) => {
    const selected = ((c[name] as string[] | undefined) ?? []) as string[];
    return (
      <Field label={label} help={help}>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[#e3e6ed] bg-white p-2">
          {options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[var(--ink)]" checked={selected.includes(o.id)} onChange={(e) => setConfig({ [name]: e.target.checked ? [...selected, o.id] : selected.filter((x) => x !== o.id) })} />
              <span className="flex-1 truncate">{o.title}</span>
              {o.status !== "PUBLISHED" && <span className="text-[0.68rem] text-[#9aa1b1]">({o.status.toLowerCase()} — hidden)</span>}
            </label>
          ))}
          {options.length === 0 && <p className="text-xs text-[#6b7385]">Nothing to choose from yet.</p>}
        </div>
      </Field>
    );
  };
  const headingFields = (
    <div className="grid gap-3 sm:grid-cols-2">
      {text("eyebrow", "Eyebrow label", { max: 80 })}
      {text("title", "Heading", { max: 200 })}
      <div className="sm:col-span-2">{text("description", "Description", { area: true, max: 600 })}</div>
    </div>
  );

  switch (section.type) {
    case "HERO":
      return (
        <div className="space-y-4">
          {text("eyebrow", "Eyebrow (small line above the title)", { max: 120 })}
          <div className="grid gap-3 sm:grid-cols-2">
            {text("title", "Title", { max: 200 })}
            {text("highlight", "Highlighted line (gold)", { max: 200 })}
          </div>
          {text("subtitle", "Supporting description", { area: true, max: 600 })}
          {ctaField("primaryCta", "Primary button")}
          {ctaField("secondaryCta", "Secondary button")}
          <div className="grid gap-4 sm:grid-cols-2">
            {imageField("imageId", "Portrait / hero image", "Shown on the right. Without it, an animated systems console is shown.")}
            {imageField("backgroundImageId", "Background image (optional)", "Displayed faintly behind the hero.")}
          </div>
          <PairListEditor
            label="Stats (optional — only use real, verifiable figures)"
            max={4}
            items={((c.stats as unknown as { value: string; label: string }[]) ?? []).map((s) => ({ title: s.value, description: s.label }))}
            onChange={(items) => setConfig({ stats: items.map((x) => ({ value: x.title.slice(0, 20), label: x.description.slice(0, 60) })) })}
          />
        </div>
      );
    case "INTRO":
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {text("eyebrow", "Eyebrow label", { max: 80 })}
            {text("title", "Heading", { max: 200 })}
          </div>
          {text("body", "Text (blank line = new paragraph)", { area: true, max: 3000 })}
          {imageField("imageId", "Image (optional)")}
          {ctaField("cta", "Link")}
        </div>
      );
    case "SERVICES":
      return <div className="space-y-4">{headingFields}{picker("serviceIds", "Services to show", services, "Leave all unticked to show every featured, published service in display order.")}</div>;
    case "PROJECTS":
      return (
        <div className="space-y-4">
          {headingFields}
          {picker("projectIds", "Projects to show", projects, "Leave unticked to show featured projects automatically.")}
          <Field label="Number of projects (automatic mode)" htmlFor={`${section.key}-limit`}>
            <Input id={`${section.key}-limit`} type="number" min={1} max={12} value={Number(c.limit ?? 3)} onChange={(e) => setConfig({ limit: Math.max(1, Math.min(12, Number(e.target.value) || 3)) })} className="!w-28" />
          </Field>
        </div>
      );
    case "INSIGHTS":
      return (
        <div className="space-y-4">
          {headingFields}
          {picker("postIds", "Articles to show", posts, "Leave unticked to show the latest articles (featured first).")}
          <Field label="Number of articles (automatic mode)" htmlFor={`${section.key}-limit`}>
            <Input id={`${section.key}-limit`} type="number" min={1} max={9} value={Number(c.limit ?? 3)} onChange={(e) => setConfig({ limit: Math.max(1, Math.min(9, Number(e.target.value) || 3)) })} className="!w-28" />
          </Field>
        </div>
      );
    case "SKILLS":
      return <div className="space-y-2">{headingFields}<p className="admin-help">Skills are managed in Admin → Skills.</p></div>;
    case "PROCESS":
      return (
        <div className="space-y-4">
          {headingFields}
          <PairListEditor label="Steps" max={8} items={(c.steps as unknown as { title: string; description: string }[]) ?? []} onChange={(steps) => setConfig({ steps })} />
        </div>
      );
    case "CONTACT_CTA":
      return (
        <div className="space-y-4">
          {headingFields}
          {ctaField("cta", "Button")}
          <Toggle label="Show contact methods" description="Email, phone and WhatsApp from Settings (only those configured)." checked={c.showContactMethods !== false} onChange={(v) => setConfig({ showContactMethods: v })} />
        </div>
      );
  }
}
