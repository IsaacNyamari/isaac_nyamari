"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, FileText, Grid3X3, List, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAction } from "@/components/admin/hooks";
import { ACCEPT, type MediaItem, uploadFiles } from "@/components/admin/media-types";
import { Button, Card, ConfirmButton, EmptyState, Field, Input, Select, Textarea } from "@/components/admin/ui";
import { cn, formatBytes, formatDateTime } from "@/lib/utils";
import { deleteMediaAction, listMediaAction, mediaUsageAction, updateMediaMetaAction } from "./actions";

type Usage = { type: string; label: string; href: string };

export function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"" | "IMAGE" | "DOCUMENT">("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (p: number, append: boolean) => {
    setLoading(true);
    const res = await listMediaAction({ q, kind, page: p, perPage: 30 });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    setItems((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
    setPage(res.data.page);
    setTotalPages(res.data.totalPages);
    setTotal(res.data.total);
  }, [q, kind]);

  useEffect(() => {
    const t = setTimeout(() => load(1, false), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function onUpload(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    const results = await uploadFiles(files);
    setUploading(false);
    const ok = results.filter((r) => r.ok).length;
    results.filter((r) => !r.ok).forEach((r) => toast.error(`${r.name}: ${r.error}`));
    if (ok) {
      toast.success(`${ok} file${ok === 1 ? "" : "s"} uploaded`);
      load(1, false);
    }
  }

  const active = items.find((i) => i.id === activeId) ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onUpload([...e.dataTransfer.files]);
          }}
          className={cn("mb-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-white px-4 py-8 text-center transition-colors", dragging ? "border-gold bg-amber-50" : "border-[#d5d9e2]")}
        >
          <Upload className="h-6 w-6 text-[#8a92a6]" aria-hidden="true" />
          <p className="text-sm text-[#3a4258]">Drag and drop files here, or</p>
          <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { onUpload([...(e.target.files ?? [])]); e.target.value = ""; }} />
          <Button variant="primary" loading={uploading} onClick={() => fileRef.current?.click()}>Choose files</Button>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1b1]" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by filename or alt text" className="pl-9" aria-label="Search media" />
          </div>
          <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Filter by type" className="sm:w-44">
            <option value="">All types</option>
            <option value="IMAGE">Images</option>
            <option value="DOCUMENT">Documents</option>
          </Select>
          <div className="flex rounded-lg border border-[#d5d9e2] bg-white p-0.5" role="group" aria-label="View">
            <button type="button" onClick={() => setView("grid")} aria-pressed={view === "grid"} className={cn("rounded-md p-2", view === "grid" && "bg-[#eef0f4]")} aria-label="Grid view"><Grid3X3 className="h-4 w-4" /></button>
            <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} className={cn("rounded-md p-2", view === "list" && "bg-[#eef0f4]")} aria-label="List view"><List className="h-4 w-4" /></button>
          </div>
        </div>
        <p className="mb-3 text-xs text-[#6b7385]">{total} file{total === 1 ? "" : "s"}</p>

        {items.length === 0 && !loading ? (
          <EmptyState title="No media found" text={q || kind ? "Try a different search or filter." : "Upload your first image to get started."} />
        ) : view === "grid" ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => setActiveId(m.id)} aria-pressed={activeId === m.id} className={cn("block w-full overflow-hidden rounded-lg bg-white text-left ring-offset-2 transition", activeId === m.id ? "ring-[3px] ring-gold" : "ring-1 ring-[#e3e6ed] hover:ring-[#b8bfcc]")}>
                  <span className="block aspect-square bg-[#eef0f4]">
                    {m.kind === "IMAGE" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.thumbUrl} alt={m.alt} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center"><FileText className="h-8 w-8 text-[#8a92a6]" aria-hidden="true" /></span>
                    )}
                  </span>
                  <span className="block truncate px-2 py-1.5 text-[0.72rem] text-[#3a4258]">{m.filename}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="admin-card divide-y divide-[#eef0f4]">
            {items.map((m) => (
              <button key={m.id} type="button" onClick={() => setActiveId(m.id)} className={cn("flex w-full items-center gap-4 px-4 py-2.5 text-left text-sm hover:bg-[#f8f9fb]", activeId === m.id && "bg-amber-50")}>
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded bg-[#eef0f4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.kind === "IMAGE" ? <img src={m.thumbUrl} alt="" className="h-full w-full object-cover" /> : <FileText className="m-2.5 h-5 w-5 text-[#8a92a6]" />}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{m.filename}</span>
                <span className="hidden w-24 text-xs text-[#6b7385] sm:block">{m.width ? `${m.width}×${m.height}` : m.mimeType.split("/")[1]}</span>
                <span className="w-20 text-right text-xs text-[#6b7385]">{formatBytes(m.size)}</span>
                <span className="hidden w-36 text-right text-xs text-[#6b7385] md:block">{formatDateTime(m.createdAt)}</span>
              </button>
            ))}
          </div>
        )}
        {page < totalPages && (
          <div className="mt-4 text-center">
            <Button loading={loading} onClick={() => load(page + 1, true)}>Load more</Button>
          </div>
        )}
      </div>

      <aside className="xl:sticky xl:top-24 xl:self-start">
        {active ? (
          <MediaDetails
            key={active.id + active.url}
            item={active}
            onUpdated={(m) => setItems((prev) => prev.map((p) => (p.id === m.id ? m : p)))}
            onDeleted={() => {
              setItems((prev) => prev.filter((p) => p.id !== active.id));
              setActiveId(null);
              setTotal((t) => t - 1);
            }}
            onReplaced={() => load(1, false)}
          />
        ) : (
          <Card><p className="py-8 text-center text-sm text-[#6b7385]">Select a file to see its details.</p></Card>
        )}
      </aside>
    </div>
  );
}

function MediaDetails({ item, onUpdated, onDeleted, onReplaced }: { item: MediaItem; onUpdated: (m: MediaItem) => void; onDeleted: () => void; onReplaced: () => void }) {
  const [meta, setMeta] = useState({ alt: item.alt, caption: item.caption, description: item.description });
  const [usage, setUsage] = useState<Usage[] | null>(null);
  const [replacing, setReplacing] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);
  const { pending, run } = useAction();
  const absoluteUrl = typeof window !== "undefined" ? new URL(item.url, window.location.origin).toString() : item.url;

  useEffect(() => {
    mediaUsageAction(item.id).then((r) => r.ok && setUsage(r.data));
  }, [item.id]);

  return (
    <Card title="File details">
      <div className="mb-4 overflow-hidden rounded-lg bg-[#eef0f4]">
        {item.kind === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbUrl} alt={item.alt} className="max-h-56 w-full object-contain" />
        ) : (
          <a href={item.url} target="_blank" rel="noopener" className="flex items-center gap-2 p-4 text-sm underline"><FileText className="h-5 w-5" /> Open document</a>
        )}
      </div>
      <dl className="mb-4 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-[#6b7385]">Filename</dt><dd className="truncate" title={item.filename}>{item.filename}</dd>
        <dt className="text-[#6b7385]">Type</dt><dd>{item.mimeType}</dd>
        <dt className="text-[#6b7385]">Size</dt><dd>{formatBytes(item.size)}</dd>
        {item.width && (<><dt className="text-[#6b7385]">Dimensions</dt><dd>{item.width} × {item.height}px</dd></>)}
        <dt className="text-[#6b7385]">Uploaded</dt><dd>{formatDateTime(item.createdAt)}</dd>
      </dl>
      <div className="mb-4 flex gap-2">
        <Input readOnly value={absoluteUrl} aria-label="File URL" className="!h-9 !min-h-0 text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button size="sm" onClick={() => navigator.clipboard.writeText(absoluteUrl).then(() => toast.success("URL copied"))} aria-label="Copy URL"><Copy className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="space-y-3">
        {item.kind === "IMAGE" && (
          <Field label="Alt text" help="Describe the image for screen readers and search engines." htmlFor="m-alt">
            <Input id="m-alt" value={meta.alt} maxLength={300} onChange={(e) => setMeta({ ...meta, alt: e.target.value })} />
          </Field>
        )}
        <Field label="Caption" htmlFor="m-caption">
          <Input id="m-caption" value={meta.caption} maxLength={500} onChange={(e) => setMeta({ ...meta, caption: e.target.value })} />
        </Field>
        <Field label="Description" htmlFor="m-desc">
          <Textarea id="m-desc" value={meta.description} maxLength={2000} rows={3} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
        </Field>
        <Button variant="primary" loading={pending} onClick={() => run(() => updateMediaMetaAction(item.id, meta), { onSuccess: onUpdated })}>Save details</Button>
      </div>

      <div className="mt-5 border-t border-[#eef0f4] pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7385]">Used in</p>
        {usage === null ? (
          <p className="text-xs text-[#6b7385]">Checking…</p>
        ) : usage.length === 0 ? (
          <p className="text-xs text-[#6b7385]">Not used anywhere.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {usage.map((u, i) => (
              <li key={i}><Link href={u.href} className="underline">{u.type}: {u.label}</Link></li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-[#eef0f4] pt-4">
        <input
          ref={replaceRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setReplacing(true);
            const [r] = await uploadFiles([f], item.id);
            setReplacing(false);
            if (r?.ok) {
              toast.success("File replaced — all references now use the new file");
              onReplaced();
            } else toast.error(r?.error ?? "Replace failed");
          }}
        />
        <Button size="sm" loading={replacing} onClick={() => replaceRef.current?.click()}><RefreshCw className="h-3.5 w-3.5" /> Replace file</Button>
        <ConfirmButton
          size="sm"
          title="Delete this file?"
          disabled={Boolean(usage?.length)}
          message={usage?.length ? "This file is still in use and cannot be deleted." : <>The file <strong>{item.filename}</strong> will be permanently removed from storage. This cannot be undone.</>}
          confirmLabel="Delete file"
          onConfirm={() => run(() => deleteMediaAction(item.id), { onSuccess: onDeleted })}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </ConfirmButton>
      </div>
      {Boolean(usage?.length) && <p className="admin-help">Remove it from the content listed above before deleting.</p>}
    </Card>
  );
}
