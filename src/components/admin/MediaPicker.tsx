"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, ImageOff, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { getMediaItemsAction, listMediaAction } from "@/app/admin/(panel)/media/actions";
import { cn } from "@/lib/utils";
import { ACCEPT, type MediaItem, uploadFiles } from "./media-types";
import { Button, Dialog, Input } from "./ui";

/** Media selection dialog used by every editor (cover images, galleries, inline images, logos). */
export function MediaPicker({
  open,
  onClose,
  onSelect,
  kind = "IMAGE",
  multiple,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (items: MediaItem[]) => void;
  kind?: "IMAGE" | "DOCUMENT" | "";
  multiple?: boolean;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (p: number, query: string, append: boolean) => {
      setLoading(true);
      const res = await listMediaAction({ q: query, kind, page: p, perPage: 24 });
      setLoading(false);
      if (!res.ok) return toast.error(res.error);
      setItems((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setPage(res.data.page);
      setTotalPages(res.data.totalPages);
    },
    [kind],
  );

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => load(1, q, false), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [open, q, load]);

  async function onUpload(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    const results = await uploadFiles(files);
    setUploading(false);
    const okIds = results.filter((r) => r.ok && r.id).map((r) => r.id!);
    results.filter((r) => !r.ok).forEach((r) => toast.error(`${r.name}: ${r.error}`));
    if (okIds.length) {
      toast.success(`${okIds.length} file${okIds.length === 1 ? "" : "s"} uploaded`);
      const fresh = await getMediaItemsAction(okIds);
      if (fresh.ok) {
        setItems((prev) => [...fresh.data, ...prev.filter((p) => !okIds.includes(p.id))]);
        setSelected((prev) => (multiple ? [...prev, ...okIds] : [okIds[0]]));
      }
    }
  }

  function toggle(id: string) {
    setSelected((prev) => (multiple ? (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) : [id]));
  }

  const close = () => {
    setSelected([]);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={multiple ? "Select media" : "Select an image"}
      wide
      footer={
        <>
          <span className="mr-auto self-center text-xs text-[#6b7385]">{selected.length ? `${selected.length} selected` : "Click to select"}</span>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!selected.length}
            onClick={() => {
              onSelect(selected.map((id) => items.find((i) => i.id === id)).filter((i): i is MediaItem => Boolean(i)));
              close();
            }}
          >
            Use selected
          </Button>
        </>
      }
    >
      <div
        className="flex flex-col gap-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onUpload([...e.dataTransfer.files]);
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1b1]" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by filename or alt text" className="pl-9" aria-label="Search media" />
          </div>
          <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => onUpload([...(e.target.files ?? [])])} />
          <Button variant="secondary" loading={uploading} onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden="true" /> Upload
          </Button>
        </div>
        {items.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-[#d5d9e2] py-14 text-center text-sm text-[#6b7385]">
            <ImageOff className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
            No files yet. Drop files here or use Upload.
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {items.map((m) => {
              const isSel = selected.includes(m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => toggle(m.id)}
                    onDoubleClick={() => {
                      if (!multiple) {
                        onSelect([m]);
                        close();
                      }
                    }}
                    aria-pressed={isSel}
                    title={m.filename}
                    className={cn("group relative block aspect-square w-full overflow-hidden rounded-lg bg-[#eef0f4] ring-offset-2 transition", isSel ? "ring-[3px] ring-gold" : "hover:ring-2 hover:ring-[#cfd4de]")}
                  >
                    {m.kind === "IMAGE" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.thumbUrl} alt={m.alt} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full flex-col items-center justify-center gap-1 p-2 text-[0.7rem] text-[#6b7385]">
                        <FileText className="h-6 w-6" aria-hidden="true" />
                        <span className="line-clamp-2 break-all">{m.filename}</span>
                      </span>
                    )}
                    {isSel && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-[0.7rem] font-bold text-ink">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {page < totalPages && (
          <div className="text-center">
            <Button variant="ghost" loading={loading} onClick={() => load(page + 1, q, true)}>Load more</Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

export type ImageValue = { id: string; url: string; alt?: string } | null;

/** Single-image field with preview, change and remove. */
export function ImageField({ label, value, onChange, help, aspect = "aspect-[16/9]" }: { label: string; value: ImageValue; onChange: (v: ImageValue) => void; help?: string; aspect?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className="admin-label">{label}</p>
      {value ? (
        <div className="group relative overflow-hidden rounded-lg border border-[#e3e6ed] bg-[#f4f5f8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.url} alt={value.alt ?? ""} className={cn("w-full object-cover", aspect)} />
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-ink/70 to-transparent p-2">
            <Button size="sm" onClick={() => setOpen(true)}>Change</Button>
            <Button size="sm" variant="danger" onClick={() => onChange(null)} aria-label={`Remove ${label}`}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={cn("flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#d5d9e2] bg-[#fafbfc] text-sm text-[#6b7385] transition-colors hover:border-ink hover:text-ink", aspect)}>
          <Upload className="h-5 w-5" aria-hidden="true" />
          Choose image
        </button>
      )}
      {help && <p className="admin-help">{help}</p>}
      <MediaPicker open={open} onClose={() => setOpen(false)} onSelect={([m]) => m && onChange({ id: m.id, url: m.thumbUrl || m.url, alt: m.alt })} />
    </div>
  );
}
