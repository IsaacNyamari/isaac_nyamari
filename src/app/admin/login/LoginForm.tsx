"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError("");
    setPending(true);
    try {
      const { error: err } = await authClient.signIn.email({
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
        rememberMe: form.get("remember") === "on",
      });
      if (err) {
        setError(err.status === 429 ? "Too many attempts. Please wait a minute and try again." : "Incorrect email or password.");
        setPending(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-xl sm:p-7" noValidate>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <label htmlFor="email" className="admin-label">Email</label>
      <input id="email" name="email" type="email" autoComplete="username" required className="admin-input" autoFocus />
      <label htmlFor="password" className="admin-label mt-4">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required className="admin-input" />
      <label className="mt-4 flex items-center gap-2 text-sm text-[#3a4258]">
        <input type="checkbox" name="remember" defaultChecked className="h-4 w-4 accent-[var(--ink)]" /> Keep me signed in on this device
      </label>
      <button type="submit" disabled={pending} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink font-semibold text-white transition-colors hover:bg-navy-2 disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Sign in
      </button>
    </form>
  );
}
