import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can, type Permission } from "@/lib/permissions";

export type Admin = { id: string; name: string; email: string; role: string };

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code === "UNAUTHENTICATED" ? "You must be signed in." : "You do not have permission to do that.");
  }
}

/** Validates the session cookie against the database. Cached per request. */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: string };
  return { id: u.id, name: u.name, email: u.email, role: u.role ?? "ADMIN" };
});

/** For server actions and route handlers: throws when not authorised. */
export async function requireAdmin(permission?: Permission): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) throw new AuthError("UNAUTHENTICATED");
  if (permission && !can(admin.role, permission)) throw new AuthError("FORBIDDEN");
  return admin;
}

/** For admin pages: redirects to login when there is no valid session. */
export async function requireAdminPage(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
