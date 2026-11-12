import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Monogram } from "@/components/site/Logo";
import { getAdmin } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = typeof next === "string" && /^\/admin(\/[\w\-/]*)?$/.test(next) ? next : "/admin";
  if (await getAdmin()) redirect(safeNext);
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Monogram className="h-14 w-14" tone="dark" />
          <h1 className="mt-5 font-serif text-2xl font-semibold text-white">Dashboard sign in</h1>
          <p className="mt-1 text-sm text-mist">Authorised administrators only.</p>
        </div>
        <LoginForm next={safeNext} />
      </div>
    </main>
  );
}
