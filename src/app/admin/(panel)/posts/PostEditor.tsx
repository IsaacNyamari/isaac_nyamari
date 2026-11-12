"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { SeoFields, SlugField } from "@/components/admin/fields";
import { useAction, useUnsavedChanges } from "@/components/admin/hooks";
import { ImageField, type ImageValue } from "@/components/admin/MediaPicker";
import { PublishPanel, type PublishState } from "@/components/admin/PublishPanel";
import { Revisions, type RevisionItem } from "@/components/admin/Revisions";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Button, Card, Field, Input, PageHeader, Select, Textarea, Toggle } from "@/components/admin/ui";
import { AiDraftPanel, AiSeoButton } from "@/components/admin/AiAssistant";
import { aiPostDraftAction, type AiPostDraft } from "../ai/actions";
import { extractText, type RTNode } from "@/lib/rich-text/model";
import { slugify } from "@/lib/slug";
import {
  createTagsAction, deletePostAction, discardPostChangesAction, restorePostRevisionAction, savePostAction, setPostStatusAction,
} from "./actions";

export type PostForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: RTNode;
  coverImage: ImageValue;
  ogImage: ImageValue;
  categoryId: string | null;
  tagIds: string[];
  relatedIds: string[];
  featured: boolean;
  showToc: boolean;
  canonicalUrl: string;
  seoTitle: string;
  seoDescription: string;
  scheduledAt: string;
};

export type PostEditorData = {
  id: string | null;
  version: number;
  form: PostForm;
  state: PublishState;
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  others: { id: string; title: string; status: string }[];
  revisions: RevisionItem[];
};

function toLocalInput(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostEditor({ data }: { data: PostEditorData }) {
  const router = useRouter();
  const [form, setForm] = useState<PostForm>(data.form);
  const [saved, setSaved] = useState(JSON.stringify(data.form));
  const [version, setVersion] = useState(data.version);
  const [autoSlug, setAutoSlug] = useState(!data.id);
  const [tags, setTags] = useState(data.tags);
  const [newTag, setNewTag] = useState("");
  const [relatedQuery, setRelatedQuery] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [scheduleLocal, setScheduleLocal] = useState(toLocalInput(data.form.scheduledAt));
  const { pending, run, fieldErrors } = useAction();
  const dirty = JSON.stringify(form) !== saved;
  useUnsavedChanges(dirty);

  const set = (patch: Partial<PostForm>) => setForm((f) => ({ ...f, ...patch }));
  const payload = () => ({
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt,
    content: form.content,
    coverImageId: form.coverImage?.id ?? null,
    ogImageId: form.ogImage?.id ?? null,
    categoryId: form.categoryId,
    tagIds: form.tagIds,
    relatedIds: form.relatedIds,
    featured: form.featured,
    showToc: form.showToc,
    canonicalUrl: form.canonicalUrl,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
  });

  function save(intent: "draft" | "publish" | "schedule") {
    const scheduledAt = intent === "schedule" && scheduleLocal ? new Date(scheduleLocal).toISOString() : null;
    run(() => savePostAction({ id: data.id, version, intent, scheduledAt, data: payload() }), {
      onSuccess: (res) => {
        setSaved(JSON.stringify(form));
        setVersion(res.version);
        if (!data.id) router.replace(`/admin/posts/${res.id}`);
        else router.refresh();
      },
    });
  }

  /** Applies an AI draft: fills empty fields, or every field when `replace` is on. */
  function applyAi(d: AiPostDraft, replace: boolean) {
    const fill = (cur: string, next: string) => (replace || !cur.trim() ? next || cur : cur);
    const lc = (s: string) => s.trim().toLowerCase();
    const title = fill(form.title, d.title);
    const category = data.categories.find((c) => lc(c.name) === lc(d.categoryName));
    const tagIds = data.tags.filter((t) => d.tagNames.some((n) => lc(n) === lc(t.name))).map((t) => t.id);
    const bodyEmpty = !extractText(form.content).trim();
    set({
      title,
      ...(autoSlug && title !== form.title ? { slug: slugify(title) } : {}),
      excerpt: fill(form.excerpt, d.excerpt),
      content: replace || bodyEmpty ? d.content : form.content,
      seoTitle: fill(form.seoTitle, d.seoTitle),
      seoDescription: fill(form.seoDescription, d.seoDescription),
      categoryId: replace || !form.categoryId ? (category?.id ?? form.categoryId) : form.categoryId,
      tagIds: replace || form.tagIds.length === 0 ? (tagIds.length ? tagIds : form.tagIds) : form.tagIds,
    });
    // Remount the rich-text editor so it shows the new body.
    setEditorKey((k) => k + 1);
  }

  const relatedOptions = useMemo(
    () => data.others.filter((o) => !form.relatedIds.includes(o.id) && o.title.toLowerCase().includes(relatedQuery.toLowerCase())).slice(0, 8),
    [data.others, form.relatedIds, relatedQuery],
  );

  return (
    <>
      <PageHeader
        title={data.id ? form.title || "Untitled post" : "New post"}
        crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Posts", href: "/admin/posts" }, { label: data.id ? "Edit" : "New" }]}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <AiDraftPanel kind="post" generate={aiPostDraftAction} onApply={applyAi} categories={data.categories.map((c) => c.name)} tags={tags.map((t) => t.name)} />
          <Card>
            <div className="space-y-4">
              <Field label="Title" htmlFor="title" error={fieldErrors.title} required>
                <Input
                  id="title"
                  value={form.title}
                  invalid={Boolean(fieldErrors.title)}
                  className="!text-lg font-medium"
                  maxLength={160}
                  onChange={(e) => set({ title: e.target.value, ...(autoSlug ? { slug: slugify(e.target.value) } : {}) })}
                />
              </Field>
              <SlugField value={form.slug} onChange={(slug) => set({ slug })} title={form.title} prefix="/insights/" error={fieldErrors.slug} autoSync={autoSlug} onAutoSyncChange={setAutoSlug} />
              <Field label="Excerpt" htmlFor="excerpt" help={`${form.excerpt.length}/400 · Shown on cards and used as the default meta description.`} error={fieldErrors.excerpt}>
                <Textarea id="excerpt" rows={3} maxLength={400} value={form.excerpt} onChange={(e) => set({ excerpt: e.target.value })} />
              </Field>
            </div>
          </Card>

          <div>
            <p className="admin-label">Content</p>
            <RichTextEditor key={editorKey} value={form.content} onChange={(content) => set({ content })} placeholder="Write your article…" />
            {fieldErrors.content && <p className="mt-1 text-xs text-danger">{fieldErrors.content}</p>}
          </div>

          <Card
            title="SEO & sharing"
            actions={
              <AiSeoButton
                kind="post"
                title={form.title}
                shortLabel="excerpt"
                getText={() => extractText(form.content)}
                onApply={(v) => set({ seoTitle: v.seoTitle, seoDescription: v.seoDescription, ...(form.excerpt.trim() ? {} : { excerpt: v.shortText }) })}
              />
            }
          >
            <SeoFields title={form.seoTitle} description={form.seoDescription} onChange={(p) => set(p)} fallbackTitle={form.title} fallbackDescription={form.excerpt}>
              <Field label="Canonical URL override" htmlFor="canonical" help="Only if this article was first published elsewhere." error={fieldErrors.canonicalUrl}>
                <Input id="canonical" type="url" value={form.canonicalUrl} onChange={(e) => set({ canonicalUrl: e.target.value })} placeholder="https://…" />
              </Field>
              <ImageField label="Social sharing image" value={form.ogImage} onChange={(ogImage) => set({ ogImage })} help="Defaults to the cover image. 1200×630 works best." />
            </SeoFields>
          </Card>
        </div>

        <div className="space-y-6">
          <PublishPanel
            state={data.state}
            isNew={!data.id}
            dirty={dirty}
            pending={pending}
            previewHref={`/insights/${data.form.slug}`}
            onSaveDraft={() => save("draft")}
            onPublish={() => save("publish")}
            onUnpublish={() => run(() => setPostStatusAction(data.id!, "DRAFT"), { onSuccess: () => router.refresh() })}
            onArchive={() => run(() => setPostStatusAction(data.id!, "ARCHIVED"), { onSuccess: () => router.refresh() })}
            onDiscardPending={() => run(() => discardPostChangesAction(data.id!), { onSuccess: () => { setSaved(JSON.stringify(form)); router.refresh(); location.reload(); } })}
            onDelete={() => run(() => deletePostAction(data.id!), { onSuccess: () => { setSaved(JSON.stringify(form)); router.replace("/admin/posts"); } })}
            extra={
              data.state.status !== "PUBLISHED" && (
                <div className="mb-3 rounded-lg border border-[#e3e6ed] p-3">
                  <label htmlFor="schedule" className="admin-label flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Schedule publication</label>
                  <Input id="schedule" type="datetime-local" value={scheduleLocal} onChange={(e) => setScheduleLocal(e.target.value)} invalid={Boolean(fieldErrors.scheduledAt)} />
                  {fieldErrors.scheduledAt && <p className="mt-1 text-xs text-danger">{fieldErrors.scheduledAt}</p>}
                  <Button className="mt-2 w-full" size="sm" disabled={!scheduleLocal} loading={pending} onClick={() => save("schedule")}>
                    {data.state.status === "SCHEDULED" ? "Update schedule" : "Schedule"}
                  </Button>
                  <p className="admin-help">Uses your browser&apos;s time zone. Published automatically by the server.</p>
                </div>
              )
            }
          />

          <Card title="Cover image">
            <ImageField label="Cover" value={form.coverImage} onChange={(coverImage) => set({ coverImage })} help="Shown on cards and at the top of the article (16:9)." />
          </Card>

          <Card title="Organisation">
            <div className="space-y-4">
              <Field label="Category" htmlFor="category">
                <Select id="category" value={form.categoryId ?? ""} onChange={(e) => set({ categoryId: e.target.value || null })}>
                  <option value="">No category</option>
                  {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Tags">
                <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {tags.map((t) => {
                    const on = form.tagIds.includes(t.id);
                    return (
                      <button key={t.id} type="button" aria-pressed={on} onClick={() => set({ tagIds: on ? form.tagIds.filter((x) => x !== t.id) : [...form.tagIds, t.id] })} className={`rounded-full px-2.5 py-1 text-xs ring-1 ${on ? "bg-ink text-white ring-ink" : "bg-white text-[#3a4258] ring-[#d5d9e2] hover:ring-ink"}`}>
                        {t.name}
                      </button>
                    );
                  })}
                  {tags.length === 0 && <p className="text-xs text-[#6b7385]">No tags yet.</p>}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag" aria-label="New tag name" className="!h-9 !min-h-0" />
                  <Button
                    size="sm"
                    disabled={!newTag.trim()}
                    onClick={() =>
                      run(() => createTagsAction([newTag]), {
                        silent: true,
                        onSuccess: (created) => {
                          setTags((prev) => [...prev, ...created.filter((c) => !prev.some((p) => p.id === c.id))].sort((a, b) => a.name.localeCompare(b.name)));
                          set({ tagIds: [...new Set([...form.tagIds, ...created.map((c) => c.id)])] });
                          setNewTag("");
                        },
                      })
                    }
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </Field>
              <Toggle label="Featured article" description="Highlighted on the Insights page and homepage." checked={form.featured} onChange={(featured) => set({ featured })} />
              <Toggle label="Table of contents" description="Generated from H2/H3 headings." checked={form.showToc} onChange={(showToc) => set({ showToc })} />
            </div>
          </Card>

          <Card title="Related articles" description="Optional. Otherwise chosen by category and tags.">
            <ul className="mb-2 space-y-1">
              {form.relatedIds.map((rid) => {
                const o = data.others.find((x) => x.id === rid);
                return (
                  <li key={rid} className="flex items-center justify-between gap-2 rounded bg-[#f4f5f8] px-2 py-1 text-xs">
                    <span className="truncate">{o?.title ?? "Unknown post"}</span>
                    <button type="button" className="text-[#6b7385] hover:text-danger" onClick={() => set({ relatedIds: form.relatedIds.filter((x) => x !== rid) })} aria-label="Remove related article">✕</button>
                  </li>
                );
              })}
            </ul>
            {form.relatedIds.length < 6 && (
              <>
                <Input value={relatedQuery} onChange={(e) => setRelatedQuery(e.target.value)} placeholder="Find a post…" className="!h-9 !min-h-0" aria-label="Search posts to relate" />
                {relatedQuery && (
                  <ul className="mt-1 max-h-48 overflow-y-auto rounded border border-[#e3e6ed] text-xs">
                    {relatedOptions.map((o) => (
                      <li key={o.id}>
                        <button type="button" className="w-full px-2 py-1.5 text-left hover:bg-[#f4f5f8]" onClick={() => { set({ relatedIds: [...form.relatedIds, o.id] }); setRelatedQuery(""); }}>
                          {o.title} <span className="text-[#9aa1b1]">({o.status.toLowerCase()})</span>
                        </button>
                      </li>
                    ))}
                    {relatedOptions.length === 0 && <li className="px-2 py-1.5 text-[#6b7385]">No matches</li>}
                  </ul>
                )}
              </>
            )}
          </Card>

          {data.id && (
            <Revisions
              items={data.revisions}
              onRestore={(rid) => run(() => restorePostRevisionAction(rid), { onSuccess: () => { setSaved(JSON.stringify(form)); location.reload(); } })}
            />
          )}
        </div>
      </div>
    </>
  );
}
