"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useAction } from "@/components/admin/hooks";
import { Button, Card, ConfirmButton, Select, Textarea } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";
import {
  addInquiryNoteAction, deleteInquiryAction, deleteInquiryNoteAction, retryInquiryEmailAction, updateInquiryAction,
} from "../actions";

type Note = { id: string; body: string; author: string; createdAt: string };

export function InquiryControls({ id, status, read, emailStatus, emailError, notes }: { id: string; status: string; read: boolean; emailStatus: string; emailError: string; notes: Note[] }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const { pending, run } = useAction();
  const refresh = () => router.refresh();

  return (
    <>
      {(emailStatus === "FAILED" || emailStatus === "SKIPPED") && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="flex-1">
            The notification email for this inquiry was {emailStatus === "FAILED" ? "not delivered" : "skipped"}. The inquiry itself is saved.
            {emailError && <span className="mt-1 block font-mono text-xs">{emailError}</span>}
          </p>
          <Button size="sm" loading={pending} onClick={() => run(() => retryInquiryEmailAction(id), { onSuccess: refresh })}>Retry notification</Button>
        </div>
      )}

      <Card title="Status">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={status} onChange={(e) => run(() => updateInquiryAction(id, { status: e.target.value }), { onSuccess: refresh })} className="!w-48" aria-label="Inquiry status">
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESPONDED">Responded</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
          <Button size="md" onClick={() => run(() => updateInquiryAction(id, { read: !read }), { onSuccess: refresh })}>{read ? "Mark as unread" : "Mark as read"}</Button>
          {status !== "ARCHIVED" && <Button onClick={() => run(() => updateInquiryAction(id, { status: "ARCHIVED" }), { onSuccess: refresh })}>Archive</Button>}
          <span className="ml-auto">
            <ConfirmButton title="Delete this inquiry?" message="The message and all internal notes will be permanently deleted." confirmLabel="Delete" onConfirm={() => run(() => deleteInquiryAction(id), { onSuccess: () => router.replace("/admin/inquiries") })}>
              <Trash2 className="h-4 w-4" /> Delete
            </ConfirmButton>
          </span>
        </div>
      </Card>

      <Card title="Internal notes" description="Private to administrators.">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add a note (call summary, quote sent, next steps…)" aria-label="New note" />
        <div className="mt-2 flex justify-end">
          <Button variant="primary" disabled={!note.trim()} loading={pending} onClick={() => run(() => addInquiryNoteAction(id, note), { onSuccess: () => { setNote(""); refresh(); } })}>Add note</Button>
        </div>
        {notes.length > 0 && (
          <ul className="mt-4 space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-[#f8f9fb] p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-[#6b7385]">
                  <span>{n.author} · {formatDateTime(n.createdAt)}</span>
                  <button type="button" className="hover:text-danger" onClick={() => window.confirm("Delete this note?") && run(() => deleteInquiryNoteAction(n.id), { onSuccess: refresh })} aria-label="Delete note">Delete</button>
                </div>
                <p className="whitespace-pre-wrap text-sm">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
