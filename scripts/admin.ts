/**
 * Administrator provisioning.
 *   npm run admin:create                 — creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
 *   npm run admin:reset-password         — sets a new password for ADMIN_EMAIL from ADMIN_PASSWORD
 * Passwords are hashed with Better Auth's scrypt implementation and all sessions are revoked on reset.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

function requireEnv() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = (process.env.ADMIN_NAME ?? "Administrator").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set ADMIN_EMAIL to a valid email address.");
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  if (/^(password|admin|changeme|123456)/i.test(password)) throw new Error("ADMIN_PASSWORD is too predictable.");
  return { email, password, name };
}

async function create() {
  const { email, password, name } = requireEnv();
  if (await db.adminUser.findUnique({ where: { email } })) {
    throw new Error(`An administrator with ${email} already exists. Use admin:reset-password instead.`);
  }
  const id = randomUUID();
  await db.adminUser.create({
    data: {
      id,
      name,
      email,
      emailVerified: true,
      role: "ADMIN",
      accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } },
    },
  });
  console.log(`✓ Administrator ${email} created. Remove ADMIN_PASSWORD from your environment now.`);
}

async function resetPassword() {
  const { email, password } = requireEnv();
  const user = await db.adminUser.findUnique({ where: { email } });
  if (!user) throw new Error(`No administrator with ${email}.`);
  const hash = await hashPassword(password);
  await db.$transaction([
    db.account.updateMany({ where: { userId: user.id, providerId: "credential" }, data: { password: hash } }),
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);
  console.log(`✓ Password reset for ${email}; all sessions were signed out.`);
}

/** Recovery: ADMIN_EMAIL=<current> NEW_ADMIN_EMAIL=<new> npm run admin:reset-email */
async function resetEmail() {
  const current = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const next = (process.env.NEW_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) throw new Error("Set NEW_ADMIN_EMAIL to a valid email address.");
  const user = await db.adminUser.findUnique({ where: { email: current } });
  if (!user) throw new Error(`No administrator with ${current}.`);
  if (await db.adminUser.findUnique({ where: { email: next } })) throw new Error(`${next} is already in use.`);
  await db.$transaction([
    db.adminUser.update({ where: { id: user.id }, data: { email: next, emailVerified: true } }),
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);
  console.log(`✓ Email changed from ${current} to ${next}; all sessions were signed out.`);
}

const command = process.argv[2];
(command === "create" ? create() : command === "reset-password" ? resetPassword() : command === "reset-email" ? resetEmail() : Promise.reject(new Error("Usage: admin.ts create|reset-password|reset-email")))
  .catch((err: Error) => {
    console.error(`✗ ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
