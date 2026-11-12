"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SeoFields, SlugField, StringListEditor } from "@/components/admin/fields";
import { useAction, useUnsavedChanges } from "@/components/admin/hooks";
import { ImageField, type ImageValue } from "@/components/admin/MediaPicker";
import { PublishPanel, type PublishState } from "@/components/admin/PublishPanel";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Card, Field, Input, PageHeader, Textarea, Toggle } from "@/components/admin/ui";
import { ICON_NAMES, Icon } from "@/lib/icons";
import type { RTNode } from "@/lib/rich-text/model";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { deleteServiceAction, discardServiceChangesAction, saveServiceAction, unpublishServiceAction } from "./actions";

export type ServiceForm = {
  title: string; slug: string; summary: string; content: RTNode; icon: string; deliverables: string[]; ctaLabel: string; featured: boolean;
  image: ImageValue; seoTitle: string; seoDescription: string;
};
export type ServiceEditorData = { id: string | null; version: number; form: ServiceForm; state: PublishState };

export function ServiceEditor({ data }: { data: ServiceEditorData }) {
  const router = useRouter();
  const [form, setForm] = useState(data.form);
  const [saved, setSaved] = useState(JSON.stringify(data.form));
  const [autoSlug, setAutoSlug] = useState(!data.id);
  const { pending, run, fieldErrors } = useAction();
  const dirty = JSON.stringify(form) !== saved;
  useUnsavedChanges(dirty);
  const set = (patch: Partial<ServiceForm>) => setForm((f) => ({ ...f, ...patch }));

  function save(intent: "draft" | "publish") {
    const { image, ...rest } = form;
    run(() => saveServiceAction({ id: data.id, version: data.version, intent, data: { ...rest, imageId: image?.id ?? null } }), {
      onSuccess: (r) => {
        setSaved(JSON.stringify(form));
        if (!data.id) router.replace(`/admin/services/${r.id}`);
        else router.refresh();
      },
    });
  }

  return (
    <>
      <PageHeader title={data.id ? form.title || "Untitled service" : "New service"} crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Services", href: "/admin/services" }, { label: data.id ? "Edit" : "New" }]} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <div className="space-y-4">
              <Field label="Title" htmlFor="title" error={fieldErrors.title} required>
                <Input id="title" value={form.title} className="!text-lg font-medium" onChange={(e) => set({ title: e.target.value, ...(autoSlug ? { slug: slugify(e.target.value) } : {}) })} />
              </Field>
              <SlugField value={form.slug} onChange={(slug) => set({ slug })} title={form.title} prefix="/services/" error={fieldErrors.slug} autoSync={autoSlug} onAutoSyncChange={setAutoSlug} />
              <Field label="Short description" htmlFor="summary" help="Shown on service cards." error={fieldErrors.summary}>
                <Textarea id="summary" rows={3} maxLength={500} value={form.summary} onChange={(e) => set({ summary: e.target.value })} />
              </Field>
            </div>
          </Card>
          <div>
            <p className="admin-label">Detailed content</p>
            <RichTextEditor value={form.content} onChange={(content) => set({ content })} />
          </div>
          <Card title="Deliverables">
            <StringListEditor label="What's included" items={form.deliverables} onChange={(deliverables) => set({ deliverables })} placeholder="e.g. API development" />
          </Card>
          <Card title="SEO">
            <SeoFields title={form.seoTitle} description={form.seoDescription} onChange={(p) => set(p)} fallbackTitle={form.title} fallbackDescription={form.summary} />
          </Card>
        </div>
        <div className="space-y-6">
          <PublishPanel
            state={data.state}
            isNew={!data.id}
            dirty={dirty}
            pending={pending}
            previewHref={`/services/${data.form.slug}`}
            onSaveDraft={() => save("draft")}
            onPublish={() => save("publish")}
            onUnpublish={() => run(() => unpublishServiceAction(data.id!), { onSuccess: () => router.refresh() })}
            onDiscardPending={() => run(() => discardServiceChangesAction(data.id!), { onSuccess: () => { setSaved(JSON.stringify(form)); router.refresh(); } })}
            onDelete={() => run(() => deleteServiceAction(data.id!), { onSuccess: () => { setSaved(JSON.stringify(form)); router.replace("/admin/services"); } })}
          />
          <Card title="Call to action">
            <Field label="Button label" htmlFor="cta" help="Links to the contact page with this service preselected.">
              <Input id="cta" value={form.ctaLabel} maxLength={60} onChange={(e) => set({ ctaLabel: e.target.value })} />
            </Field>
            <div className="mt-4"><Toggle label="Featured" description="Shown in the homepage services section." checked={form.featured} onChange={(featured) => set({ featured })} /></div>
          </Card>
          <Card title="Icon">
            <div role="radiogroup" aria-label="Service icon" className="grid grid-cols-6 gap-1.5">
              {ICON_NAMES.map((name) => (
                <button key={name} type="button" role="radio" aria-checked={form.icon === name} title={name} onClick={() => set({ icon: name })} className={cn("grid aspect-square place-items-center rounded-lg ring-1", form.icon === name ? "bg-ink text-gold-hi ring-ink" : "text-[#3a4258] ring-[#e3e6ed] hover:ring-ink")}>
                  <Icon name={name} className="h-4 w-4" />
                  <span className="sr-only">{name}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card title="Image">
            <ImageField label="Service image (optional)" value={form.image} onChange={(image) => set({ image })} />
          </Card>
        </div>
      </div>
    </>
  );
}
