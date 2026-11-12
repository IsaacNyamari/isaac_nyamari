"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PairListEditor, SeoFields, SlugField, StringListEditor } from "@/components/admin/fields";
import { useAction, useUnsavedChanges } from "@/components/admin/hooks";
import { ImageField, type ImageValue } from "@/components/admin/MediaPicker";
import { PublishPanel, type PublishState } from "@/components/admin/PublishPanel";
import { Revisions, type RevisionItem } from "@/components/admin/Revisions";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Card, Field, Input, PageHeader, Textarea, Toggle } from "@/components/admin/ui";
import type { RTNode } from "@/lib/rich-text/model";
import { slugify } from "@/lib/slug";
import type { AboutData } from "@/lib/validation";
import { deletePageAction, discardPageChangesAction, restorePageRevisionAction, savePageAction, unpublishPageAction } from "./actions";

export type PageForm = {
  title: string; slug: string; excerpt: string; content: RTNode; featuredImage: ImageValue; showInNav: boolean; data: Record<string, unknown>;
  seoTitle: string; seoDescription: string;
};
export type PageEditorData = { id: string | null; version: number; system: boolean; template: string; form: PageForm; state: PublishState; revisions: RevisionItem[] };

export function PageEditor({ data }: { data: PageEditorData }) {
  const router = useRouter();
  const [form, setForm] = useState(data.form);
  const [saved, setSaved] = useState(JSON.stringify(data.form));
  const [autoSlug, setAutoSlug] = useState(!data.id);
  const { pending, run, fieldErrors } = useAction();
  const dirty = JSON.stringify(form) !== saved;
  useUnsavedChanges(dirty);
  const set = (patch: Partial<PageForm>) => setForm((f) => ({ ...f, ...patch }));
  const about = form.data as AboutData;
  const setAbout = (patch: Partial<AboutData>) => set({ data: { ...form.data, ...patch } });

  function save(intent: "draft" | "publish") {
    const { featuredImage, ...rest } = form;
    run(() => savePageAction({ id: data.id, version: data.version, intent, data: { ...rest, featuredImageId: featuredImage?.id ?? null } }), {
      onSuccess: (r) => {
        setSaved(JSON.stringify(form));
        if (!data.id) router.replace(`/admin/pages/${r.id}`);
        else router.refresh();
      },
    });
  }

  return (
    <>
      <PageHeader title={data.id ? form.title || "Untitled page" : "New page"} crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Pages", href: "/admin/pages" }, { label: data.id ? "Edit" : "New" }]} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <div className="space-y-4">
              <Field label="Title" htmlFor="title" error={fieldErrors.title} required>
                <Input id="title" value={form.title} className="!text-lg font-medium" onChange={(e) => set({ title: e.target.value, ...(autoSlug && !data.system ? { slug: slugify(e.target.value) } : {}) })} />
              </Field>
              <SlugField value={form.slug} onChange={(slug) => set({ slug })} title={form.title} prefix="/" error={fieldErrors.slug} locked={data.system} autoSync={autoSlug} onAutoSyncChange={setAutoSlug} />
              <Field label="Introduction" htmlFor="excerpt" help="Shown under the page title and used as the default meta description.">
                <Textarea id="excerpt" rows={2} maxLength={400} value={form.excerpt} onChange={(e) => set({ excerpt: e.target.value })} />
              </Field>
            </div>
          </Card>

          {data.template === "ABOUT" && (
            <Card title="About page sections" description="Each section is hidden automatically when left empty.">
              <div className="space-y-5">
                <Field label="Headline" htmlFor="headline" help="Large heading at the top of the page.">
                  <Input id="headline" value={about.headline ?? ""} onChange={(e) => setAbout({ headline: e.target.value })} />
                </Field>
                <PairListEditor label="Development philosophy" items={about.philosophy ?? []} onChange={(philosophy) => setAbout({ philosophy })} />
                <PairListEditor label="Areas of specialization" items={about.specializations ?? []} onChange={(specializations) => setAbout({ specializations })} />
                <StringListEditor label="Technical interests" items={about.interests ?? []} onChange={(interests) => setAbout({ interests })} />
                <Toggle label="Show skills & technologies" description="Pulled from Admin → Skills." checked={about.showSkills ?? true} onChange={(showSkills) => setAbout({ showSkills })} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Closing call-to-action title" htmlFor="ctat"><Input id="ctat" value={about.ctaTitle ?? ""} onChange={(e) => setAbout({ ctaTitle: e.target.value })} /></Field>
                  <Field label="Closing call-to-action text" htmlFor="ctax"><Input id="ctax" value={about.ctaText ?? ""} onChange={(e) => setAbout({ ctaText: e.target.value })} /></Field>
                </div>
              </div>
            </Card>
          )}

          <div>
            <p className="admin-label">{data.template === "ABOUT" ? "Biography" : "Content"}</p>
            <RichTextEditor value={form.content} onChange={(content) => set({ content })} />
          </div>

          <Card title="SEO">
            <SeoFields title={form.seoTitle} description={form.seoDescription} onChange={(p) => set(p)} fallbackTitle={form.title} fallbackDescription={form.excerpt} />
          </Card>
        </div>
        <div className="space-y-6">
          <PublishPanel
            state={data.state}
            isNew={!data.id}
            dirty={dirty}
            pending={pending}
            previewHref={`/${data.form.slug}`}
            onSaveDraft={() => save("draft")}
            onPublish={() => save("publish")}
            onUnpublish={() => run(() => unpublishPageAction(data.id!), { onSuccess: () => router.refresh() })}
            onDiscardPending={() => run(() => discardPageChangesAction(data.id!), { onSuccess: () => { setSaved(JSON.stringify(form)); router.refresh(); } })}
            onDelete={data.system ? undefined : () => run(() => deletePageAction(data.id!), { onSuccess: () => { setSaved(JSON.stringify(form)); router.replace("/admin/pages"); } })}
          />
          <Card title={data.template === "ABOUT" ? "Professional image" : "Featured image"}>
            <ImageField label="Image" value={form.featuredImage} onChange={(featuredImage) => set({ featuredImage })} aspect={data.template === "ABOUT" ? "aspect-[4/5]" : "aspect-[16/9]"} />
          </Card>
          {!data.system && (
            <Card title="Navigation">
              <Toggle label="Suggest in navigation" description="Add a link to it in Admin → Navigation." checked={form.showInNav} onChange={(showInNav) => set({ showInNav })} />
            </Card>
          )}
          {data.id && <Revisions items={data.revisions} onRestore={(rid) => run(() => restorePageRevisionAction(rid), { onSuccess: () => { setSaved(JSON.stringify(form)); router.refresh(); } })} />}
        </div>
      </div>
    </>
  );
}
