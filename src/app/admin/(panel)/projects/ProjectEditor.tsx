"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";
import { SeoFields, SlugField, StringListEditor, move } from "@/components/admin/fields";
import { useAction, useUnsavedChanges } from "@/components/admin/hooks";
import { ImageField, MediaPicker, type ImageValue } from "@/components/admin/MediaPicker";
import { PublishPanel, type PublishState } from "@/components/admin/PublishPanel";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Button, Card, Field, Input, PageHeader, Textarea, Toggle } from "@/components/admin/ui";
import { AiDraftPanel, AiSeoButton, AiTitleButton } from "@/components/admin/AiAssistant";
import { aiProjectDraftAction, type AiProjectDraft } from "../ai/actions";
import { extractText, type RTNode } from "@/lib/rich-text/model";
import { slugify } from "@/lib/slug";
import { deleteProjectAction, discardProjectChangesAction, saveProjectAction, unpublishProjectAction } from "./actions";

type GalleryItem = { id: string; url: string; alt?: string; caption: string };

export type ProjectForm = {
  title: string; slug: string; summary: string; problem: string; solution: string; content: RTNode; role: string; clientName: string;
  technologies: string[]; categoryIds: string[]; startDate: string; endDate: string; externalUrl: string; repositoryUrl: string; featured: boolean;
  coverImage: ImageValue; ogImage: ImageValue; gallery: GalleryItem[]; seoTitle: string; seoDescription: string;
};

export type ProjectEditorData = { id: string | null; version: number; form: ProjectForm; state: PublishState; categories: { id: string; name: string }[] };

export function ProjectEditor({ data }: { data: ProjectEditorData }) {
  const router = useRouter();
  const [form, setForm] = useState(data.form);
  const [saved, setSaved] = useState(JSON.stringify(data.form));
  const [autoSlug, setAutoSlug] = useState(!data.id);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const { pending, run, fieldErrors } = useAction();
  const dirty = JSON.stringify(form) !== saved;
  useUnsavedChanges(dirty);
  const set = (patch: Partial<ProjectForm>) => setForm((f) => ({ ...f, ...patch }));

  /** Applies an AI draft: fills empty fields, or every field when `replace` is on. */
  function applyAi(d: AiProjectDraft, replace: boolean) {
    const fill = (cur: string, next: string) => (replace || !cur.trim() ? next || cur : cur);
    const lc = (s: string) => s.trim().toLowerCase();
    const title = fill(form.title, d.title);
    const cats = data.categories.filter((c) => d.categoryNames.some((n) => lc(n) === lc(c.name))).map((c) => c.id);
    const techs = replace || form.technologies.length === 0 ? (d.technologies.length ? d.technologies : form.technologies) : form.technologies;
    set({
      title,
      ...(autoSlug && title !== form.title ? { slug: slugify(title) } : {}),
      summary: fill(form.summary, d.summary),
      problem: fill(form.problem, d.problem),
      solution: fill(form.solution, d.solution),
      role: fill(form.role, d.role),
      content: replace || !extractText(form.content).trim() ? d.content : form.content,
      technologies: techs,
      categoryIds: replace || form.categoryIds.length === 0 ? (cats.length ? cats : form.categoryIds) : form.categoryIds,
      seoTitle: fill(form.seoTitle, d.seoTitle),
      seoDescription: fill(form.seoDescription, d.seoDescription),
    });
    setEditorKey((k) => k + 1);
  }

  function save(intent: "draft" | "publish") {
    const { coverImage, ogImage, gallery, ...rest } = form;
    run(
      () =>
        saveProjectAction({
          id: data.id,
          version: data.version,
          intent,
          data: { ...rest, coverImageId: coverImage?.id ?? null, ogImageId: ogImage?.id ?? null, gallery: gallery.map((g) => ({ mediaId: g.id, caption: g.caption })) },
        }),
      {
        onSuccess: (r) => {
          setSaved(JSON.stringify(form));
          if (!data.id) router.replace(`/admin/projects/${r.id}`);
          else router.refresh();
        },
      },
    );
  }

  return (
    <>
      <PageHeader title={data.id ? form.title || "Untitled project" : "New project"} crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Projects", href: "/admin/projects" }, { label: data.id ? "Edit" : "New" }]} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <AiDraftPanel kind="project" generate={aiProjectDraftAction} onApply={applyAi} categories={data.categories.map((c) => c.name)} />
          <Card>
            <div className="space-y-4">
              <Field label="Project title" htmlFor="title" error={fieldErrors.title} required>
                <Input id="title" value={form.title} className="!text-lg font-medium" onChange={(e) => set({ title: e.target.value, ...(autoSlug ? { slug: slugify(e.target.value) } : {}) })} />
              </Field>
              <AiTitleButton kind="project" title={form.title} generate={aiProjectDraftAction} onApply={applyAi} categories={data.categories.map((c) => c.name)} />
              <SlugField value={form.slug} onChange={(slug) => set({ slug })} title={form.title} prefix="/projects/" error={fieldErrors.slug} autoSync={autoSlug} onAutoSyncChange={setAutoSlug} />
              <Field label="Summary" htmlFor="summary" help="One or two sentences shown on project cards." error={fieldErrors.summary}>
                <Textarea id="summary" rows={2} maxLength={500} value={form.summary} onChange={(e) => set({ summary: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card title="Case study">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Problem addressed" htmlFor="problem" error={fieldErrors.problem}>
                <Textarea id="problem" rows={5} maxLength={4000} value={form.problem} onChange={(e) => set({ problem: e.target.value })} />
              </Field>
              <Field label="Solution implemented" htmlFor="solution" error={fieldErrors.solution}>
                <Textarea id="solution" rows={5} maxLength={4000} value={form.solution} onChange={(e) => set({ solution: e.target.value })} />
              </Field>
            </div>
            <p className="admin-label mt-4">Full write-up (optional)</p>
            <RichTextEditor key={editorKey} value={form.content} onChange={(content) => set({ content })} placeholder="Background, approach, architecture, results…" />
          </Card>

          <Card title="Gallery" description="Images shown in a lightbox on the project page. Drag order with the arrows." actions={<Button size="sm" onClick={() => setGalleryOpen(true)}><Plus className="h-3.5 w-3.5" /> Add images</Button>}>
            {form.gallery.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#6b7385]">No gallery images.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {form.gallery.map((g, i) => (
                  <li key={`${g.id}-${i}`} className="overflow-hidden rounded-lg border border-[#e3e6ed] bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.url} alt={g.alt ?? ""} className="aspect-[4/3] w-full object-cover" />
                    <div className="p-2">
                      <Input value={g.caption} placeholder="Caption" className="!h-8 !min-h-0 text-xs" aria-label={`Caption for image ${i + 1}`} onChange={(e) => set({ gallery: form.gallery.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)) })} />
                      <div className="mt-1 flex justify-between">
                        <div className="flex">
                          <button type="button" disabled={i === 0} onClick={() => set({ gallery: move(form.gallery, i, -1) })} className="rounded p-1 disabled:opacity-30 hover:bg-[#eef0f4]" aria-label="Move left"><ArrowLeft className="h-3.5 w-3.5" /></button>
                          <button type="button" disabled={i === form.gallery.length - 1} onClick={() => set({ gallery: move(form.gallery, i, 1) })} className="rounded p-1 disabled:opacity-30 hover:bg-[#eef0f4]" aria-label="Move right"><ArrowRight className="h-3.5 w-3.5" /></button>
                        </div>
                        <button type="button" onClick={() => set({ gallery: form.gallery.filter((_, j) => j !== i) })} className="rounded p-1 text-danger hover:bg-red-50" aria-label="Remove image"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <MediaPicker open={galleryOpen} multiple onClose={() => setGalleryOpen(false)} onSelect={(items) => set({ gallery: [...form.gallery, ...items.map((m) => ({ id: m.id, url: m.thumbUrl, alt: m.alt, caption: m.caption }))] })} />
          </Card>

          <Card
            title="SEO"
            actions={
              <AiSeoButton
                kind="project"
                title={form.title}
                shortLabel="summary"
                getText={() => [form.summary, form.problem, form.solution, extractText(form.content)].filter(Boolean).join("\n\n")}
                onApply={(v) => set({ seoTitle: v.seoTitle, seoDescription: v.seoDescription, summary: v.shortText })}
              />
            }
          >
            <SeoFields title={form.seoTitle} description={form.seoDescription} onChange={(p) => set(p)} fallbackTitle={form.title} fallbackDescription={form.summary}>
              <ImageField label="Social sharing image" value={form.ogImage} onChange={(ogImage) => set({ ogImage })} help="Defaults to the cover image." />
            </SeoFields>
          </Card>
        </div>

        <div className="space-y-6">
          <PublishPanel
            state={data.state}
            isNew={!data.id}
            dirty={dirty}
            pending={pending}
            previewHref={`/projects/${data.form.slug}`}
            onSaveDraft={() => save("draft")}
            onPublish={() => save("publish")}
            onUnpublish={() => run(() => unpublishProjectAction(data.id!), { onSuccess: () => router.refresh() })}
            onDiscardPending={() => run(() => discardProjectChangesAction(data.id!), { onSuccess: () => { setSaved(JSON.stringify(form)); router.refresh(); } })}
            onDelete={() => run(() => deleteProjectAction(data.id!), { onSuccess: () => { setSaved(JSON.stringify(form)); router.replace("/admin/projects"); } })}
          />
          <Card title="Cover image">
            <ImageField label="Cover" value={form.coverImage} onChange={(coverImage) => set({ coverImage })} aspect="aspect-[4/3]" />
          </Card>
          <Card title="Details">
            <div className="space-y-4">
              <Toggle label="Featured project" description="Eligible for the homepage." checked={form.featured} onChange={(featured) => set({ featured })} />
              <Field label="Categories">
                <div className="flex flex-wrap gap-1.5">
                  {data.categories.map((c) => {
                    const on = form.categoryIds.includes(c.id);
                    return (
                      <button key={c.id} type="button" aria-pressed={on} onClick={() => set({ categoryIds: on ? form.categoryIds.filter((x) => x !== c.id) : [...form.categoryIds, c.id] })} className={`rounded-full px-2.5 py-1 text-xs ring-1 ${on ? "bg-ink text-white ring-ink" : "bg-white ring-[#d5d9e2] hover:ring-ink"}`}>
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <StringListEditor label="Technologies & tools" items={form.technologies} onChange={(technologies) => set({ technologies })} placeholder="e.g. PostgreSQL" max={40} />
              <Field label="Your role" htmlFor="role"><Input id="role" value={form.role} onChange={(e) => set({ role: e.target.value })} placeholder="e.g. Lead developer" /></Field>
              <Field label="Client / organisation" htmlFor="client" help="Only add with the client's permission. Leave blank to omit.">
                <Input id="client" value={form.clientName} onChange={(e) => set({ clientName: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date" htmlFor="start" error={fieldErrors.startDate}><Input id="start" type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} /></Field>
                <Field label="End date" htmlFor="end" error={fieldErrors.endDate}><Input id="end" type="date" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} /></Field>
              </div>
              <Field label="Live URL" htmlFor="ext" error={fieldErrors.externalUrl}><Input id="ext" type="url" value={form.externalUrl} onChange={(e) => set({ externalUrl: e.target.value })} placeholder="https://…" /></Field>
              <Field label="Repository URL" htmlFor="repo" error={fieldErrors.repositoryUrl}><Input id="repo" type="url" value={form.repositoryUrl} onChange={(e) => set({ repositoryUrl: e.target.value })} placeholder="https://…" /></Field>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
