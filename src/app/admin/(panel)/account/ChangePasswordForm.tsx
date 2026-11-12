"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, Field, Input } from "@/components/admin/ui";
import { authClient } from "@/lib/auth-client";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next.length < 12) return setError("The new password must be at least 12 characters.");
    if (next !== confirm) return setError("The new passwords do not match.");
    if (next === current) return setError("Choose a password different from the current one.");
    setPending(true);
    const { error: err } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    setPending(false);
    if (err) {
      setError(err.status === 429 ? "Too many attempts. Wait a minute and try again." : err.message || "The current password is incorrect.");
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success("Password changed. Other devices have been signed out.");
  }

  return (
    <Card title="Change password" description="At least 12 characters. Other sessions are signed out.">
      <form onSubmit={submit} className="space-y-3" noValidate>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
        <Field label="Current password" htmlFor="pw-current"><Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></Field>
        <Field label="New password" htmlFor="pw-new"><Input id="pw-new" type="password" autoComplete="new-password" minLength={12} value={next} onChange={(e) => setNext(e.target.value)} required /></Field>
        <Field label="Confirm new password" htmlFor="pw-confirm"><Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></Field>
        <Button type="submit" variant="primary" loading={pending} disabled={!current || !next || !confirm}>Update password</Button>
      </form>
    </Card>
  );
}
