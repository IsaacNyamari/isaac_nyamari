"use client";

import { Eye, Info } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Button, Card, ConfirmButton, StatusBadge } from "./ui";

export type PublishState = {
  status: string;
  hasPending: boolean;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  updatedAt?: string | null;
  lastEditor?: string | null;
};

/**
 * Save/publish controls shared by posts, projects, services and pages.
 * "Save draft" on live content keeps the public version untouched until "Update live".
 */
export function PublishPanel({
  state, isNew, dirty, pending, previewHref, onSaveDraft, onPublish, onUnpublish, onArchive, onDiscardPending, onDelete,
  deleteLabel = "Delete", canDelete = true, extra,
}: {
  state: PublishState;
  isNew: boolean;
  dirty: boolean;
  pending: boolean;
  previewHref?: string;
  onSaveDraft: () => void;
  onPublish: () => void;
  onUnpublish?: () => Promise<unknown>;
  onArchive?: () => Promise<unknown>;
  onDiscardPending?: () => Promise<unknown>;
  onDelete?: () => Promise<unknown>;
  deleteLabel?: string;
  canDelete?: boolean;
  extra?: React.ReactNode;
}) {
  const live = state.status === "PUBLISHED";
  return (
    <Card title="Publish">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={isNew ? "DRAFT" : state.status} />
        {state.hasPending && <StatusBadge status="SCHEDULED" label="unpublished changes" />}
        {dirty && <span className="text-xs font-medium text-amber-700">● Unsaved edits</span>}
      </div>
      {!isNew && (
        <dl className="mb-4 space-y-1 text-xs text-[#6b7385]">
          {state.publishedAt && live && <div>Published {formatDateTime(state.publishedAt)}</div>}
          {state.scheduledAt && state.status === "SCHEDULED" && <div>Scheduled for {formatDateTime(state.scheduledAt)}</div>}
          {state.updatedAt && <div>Last saved {formatDateTime(state.updatedAt)}{state.lastEditor ? ` by ${state.lastEditor}` : ""}</div>}
        </dl>
      )}
      {live && (
        <p className="mb-4 flex gap-2 rounded-lg bg-[#f4f5f8] p-2.5 text-xs text-[#3a4258]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          This is live. “Save draft” stores your edits privately; “Update live” publishes them.
        </p>
      )}
      {extra}
      <div className="flex flex-col gap-2">
        <Button variant="gold" loading={pending} onClick={onPublish}>
          {isNew || !live ? "Publish" : "Update live"}
        </Button>
        <Button loading={pending} onClick={onSaveDraft}>Save draft</Button>
        {previewHref && !isNew && (
          <a href={`/api/preview?path=${encodeURIComponent(previewHref)}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d5d9e2] bg-white text-sm font-medium hover:border-ink">
            <Eye className="h-4 w-4" aria-hidden="true" /> Preview{dirty ? " (last saved)" : ""}
          </a>
        )}
      </div>
      {!isNew && (onUnpublish || onArchive || onDiscardPending || onDelete) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#eef0f4] pt-4">
          {state.hasPending && onDiscardPending && (
            <ConfirmButton size="sm" variant="secondary" title="Discard unpublished changes?" message="Your saved draft edits will be removed and the editor will show the live version." confirmLabel="Discard" onConfirm={onDiscardPending}>
              Discard changes
            </ConfirmButton>
          )}
          {live && onUnpublish && (
            <ConfirmButton size="sm" variant="secondary" title="Unpublish?" message="It will be removed from the public website immediately and kept as a draft." confirmLabel="Unpublish" onConfirm={onUnpublish}>
              Unpublish
            </ConfirmButton>
          )}
          {state.status !== "ARCHIVED" && onArchive && (
            <ConfirmButton size="sm" variant="secondary" title="Archive?" message="Archived content is hidden from the website but kept in the dashboard." confirmLabel="Archive" onConfirm={onArchive}>
              Archive
            </ConfirmButton>
          )}
          {onDelete && canDelete && (
            <ConfirmButton size="sm" title={`${deleteLabel}?`} message="This permanently deletes it and cannot be undone." confirmLabel={deleteLabel} onConfirm={onDelete} requireText={live ? "delete" : undefined}>
              {deleteLabel}
            </ConfirmButton>
          )}
        </div>
      )}
    </Card>
  );
}
