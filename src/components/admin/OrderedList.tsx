"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, GripVertical } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { cn } from "@/lib/utils";
import { move } from "./fields";
import { useAction } from "./hooks";
import { Button, ButtonLink, StatusBadge } from "./ui";

export type OrderedRow = { id: string; title: string; subtitle?: string; status: string; pending?: boolean; featured?: boolean; thumb?: string | null; previewPath?: string };

/**
 * Reorderable list (drag-and-drop on desktop, plus accessible move up/down buttons).
 * The new order is only persisted when "Save order" is pressed.
 */
export function OrderedList({ rows: initial, editBase, onSaveOrder }: { rows: OrderedRow[]; editBase: string; onSaveOrder: (ids: string[]) => Promise<ActionResult<null>> }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const { pending, run } = useAction();
  const changed = rows.map((r) => r.id).join() !== initial.map((r) => r.id).join();

  return (
    <div>
      <ul className="admin-card divide-y divide-[#eef0f4]" aria-label="Items in display order">
        {rows.map((r, i) => (
          <li
            key={r.id}
            draggable
            onDragStart={() => setDragId(r.id)}
            onDragOver={(e) => {
              e.preventDefault();
              if (!dragId || dragId === r.id) return;
              const from = rows.findIndex((x) => x.id === dragId);
              const next = [...rows];
              const [item] = next.splice(from, 1);
              next.splice(i, 0, item);
              setRows(next);
            }}
            onDragEnd={() => setDragId(null)}
            className={cn("flex items-center gap-3 px-3 py-2.5", dragId === r.id && "bg-amber-50")}
          >
            <GripVertical className="hidden h-4 w-4 shrink-0 cursor-grab text-[#b8bfcc] sm:block" aria-hidden="true" />
            <span className="w-6 text-center text-xs tabular-nums text-[#9aa1b1]">{i + 1}</span>
            {r.thumb !== undefined && (
              <span className="h-10 w-14 shrink-0 overflow-hidden rounded bg-[#eef0f4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.thumb && <img src={r.thumb} alt="" className="h-full w-full object-cover" />}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <Link href={`${editBase}/${r.id}`} className="font-medium hover:underline">{r.title}</Link>
              {r.subtitle && <p className="truncate text-xs text-[#6b7385]">{r.subtitle}</p>}
            </div>
            <div className="hidden items-center gap-1.5 sm:flex">
              {r.featured && <span className="text-xs text-gold-text">★</span>}
              {r.pending && <span className="text-[0.68rem] text-sky-700">unpublished edits</span>}
              <StatusBadge status={r.status} />
            </div>
            <div className="flex items-center">
              <button type="button" className="rounded p-1.5 text-[#6b7385] hover:bg-[#eef0f4] disabled:opacity-30" disabled={i === 0} onClick={() => setRows(move(rows, i, -1))} aria-label={`Move ${r.title} up`}><ArrowUp className="h-4 w-4" /></button>
              <button type="button" className="rounded p-1.5 text-[#6b7385] hover:bg-[#eef0f4] disabled:opacity-30" disabled={i === rows.length - 1} onClick={() => setRows(move(rows, i, 1))} aria-label={`Move ${r.title} down`}><ArrowDown className="h-4 w-4" /></button>
              {r.previewPath && (
                <a href={`/api/preview?path=${encodeURIComponent(r.previewPath)}`} target="_blank" rel="noopener" className="rounded p-1.5 text-[#6b7385] hover:bg-[#eef0f4]" aria-label={`Preview ${r.title}`}><Eye className="h-4 w-4" /></a>
              )}
              <ButtonLink href={`${editBase}/${r.id}`} size="sm" className="ml-1">Edit</ButtonLink>
            </div>
          </li>
        ))}
      </ul>
      {changed && (
        <div className="sticky bottom-4 mt-4 flex items-center justify-end gap-2 rounded-xl bg-ink p-3 text-sm text-white shadow-lg">
          <span className="mr-auto">Display order changed</span>
          <Button size="sm" variant="ghost" className="!text-white hover:!bg-white/10" onClick={() => setRows(initial)}>Reset</Button>
          <Button size="sm" variant="gold" loading={pending} onClick={() => run(() => onSaveOrder(rows.map((r) => r.id)), { onSuccess: () => router.refresh() })}>Save order</Button>
        </div>
      )}
    </div>
  );
}
