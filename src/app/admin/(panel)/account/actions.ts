"use server";

import { verifyPassword } from "better-auth/crypto";
import { z } from "zod";
import { runAction } from "@/lib/action";
import { db } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/session";

const schema = z.object({
  newEmail: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  currentPassword: z.string().min(1, "Enter your current password.").max(128),
});

/** Changes the signed-in administrator's login email. Requires the current password. */
export async function changeEmailAction(input: unknown) {
  return runAction(async () => {
    const admin = await requireAdmin();
    const { newEmail, currentPassword } = schema.parse(input);
    const { allowed } = await consumeRateLimit(`email-change:${admin.id}`, 5, 600);
    if (!allowed) throw new UserError("Too many attempts. Wait a few minutes and try again.");

    const account = await db.account.findFirst({ where: { userId: admin.id, providerId: "credential" }, select: { password: true } });
    if (!account?.password || !(await verifyPassword({ hash: account.password, password: currentPassword }))) {
      throw new UserError("The current password is incorrect.", { currentPassword: "Incorrect password" });
    }
    if (newEmail === admin.email.toLowerCase()) throw new UserError("That is already your email address.", { newEmail: "Same as current" });
    if (await db.adminUser.findUnique({ where: { email: newEmail }, select: { id: true } })) {
      throw new UserError("Another administrator already uses that email.", { newEmail: "Already in use" });
    }
    await db.adminUser.update({ where: { id: admin.id }, data: { email: newEmail, emailVerified: true } });
    return { email: newEmail };
  }, "Email updated. Use the new address the next time you sign in.");
}
