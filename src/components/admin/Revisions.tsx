"use client";

import { History } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Card, ConfirmButton } from "./ui";

export type RevisionItem = { id: string; title: string; note: string; createdAt: string; editor: string | null };

export function Revisions({ items, onRestore }: { items: RevisionItem[]; onRestore: (id: string) => Promise<unknown> }) {
  if (!items.length) return null;
  return (
    <Card title="Revision history" description="Restoring loads a revision as a draft — the live version is not changed.">
      <ul className="max-h-72 space-y-1 overflow-y-auto pr-1 text-xs">
        {items.map((r, i) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-[#f8f9fb]">
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-medium text-ink">
                <History className="h-3 w-3 shrink-0" aria-hidden="true" /> {formatDateTime(r.createdAt)}
              </span>
              <span className="block truncate text-[#6b7385]">{r.note || "Saved"}{r.editor ? ` · ${r.editor}` : ""}</span>
            </span>
            {i > 0 && (
              <ConfirmButton size="sm" variant="secondary" title="Restore this revision?" message={<>The content from <strong>{formatDateTime(r.createdAt)}</strong> (“{r.title}”) will be loaded as a draft. Your current version stays in the history.</>} confirmLabel="Restore" onConfirm={() => onRestore(r.id)}>
                Restore
              </ConfirmButton>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
