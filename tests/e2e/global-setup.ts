import { execSync } from "node:child_process";
import pg from "pg";
import { E2E_DATABASE_URL } from "../../playwright.config";

export const E2E_ADMIN = { email: "e2e-admin@test.local", password: "e2e-password-0123456789", name: "E2E Admin" };

/** Fresh, migrated and seeded database with one administrator. */
export default async function globalSetup() {
  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });

  // Empty every application table (the dedicated e2e database only).
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  if (rows.length) await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await client.end();

  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
  execSync("npx tsx scripts/admin.ts create", {
    stdio: "inherit",
    env: { ...env, ADMIN_EMAIL: E2E_ADMIN.email, ADMIN_PASSWORD: E2E_ADMIN.password, ADMIN_NAME: E2E_ADMIN.name },
  });
}
