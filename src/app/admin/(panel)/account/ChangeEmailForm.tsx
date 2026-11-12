"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAction } from "@/components/admin/hooks";
import { Button, Card, Field, Input } from "@/components/admin/ui";
import { changeEmailAction } from "./actions";

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const router = useRouter();
  const { pending, run, fieldErrors } = useAction();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(() => changeEmailAction({ newEmail, currentPassword: password }), {
      onSuccess: () => {
        setNewEmail("");
        setPassword("");
        router.refresh();
      },
    });
  }

  return (
    <Card title="Change login email" description={`Currently ${currentEmail}. Confirm with your password.`}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Field label="New email address" htmlFor="em-new" error={fieldErrors.newEmail}>
          <Input id="em-new" type="email" autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
        </Field>
        <Field label="Current password" htmlFor="em-pw" error={fieldErrors.currentPassword}>
          <Input id="em-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Button type="submit" variant="primary" loading={pending} disabled={!newEmail || !password}>Update email</Button>
      </form>
    </Card>
  );
}
