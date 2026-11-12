/**
 * Applies pending Prisma migrations without the Prisma CLI (for hosts where only the compiled
 * deploy package is uploaded). It records each migration in Prisma's own `_prisma_migrations`
 * table with the same checksum, so `prisma migrate deploy/status` stays fully compatible.
 *
 *   node ops/migrate.mjs          apply pending migrations
 *   node ops/migrate.mjs status   list applied / pending migrations
 */
import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
// Bundled layout: ops/migrations. Source layout: prisma/migrations.
const dir = [path.join(here, "migrations"), path.join(here, "../../prisma/migrations")].find(existsSync);

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (add it to .env in the app folder).");
  if (!dir) throw new Error("Migrations folder not found.");
  const migrations = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(dir, d.name, "migration.sql")))
    .map((d) => d.name)
    .sort();

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )`);
    const { rows } = await client.query<{ migration_name: string; checksum: string; finished_at: Date | null }>(
      `SELECT migration_name, checksum, finished_at FROM "_prisma_migrations" WHERE rolled_back_at IS NULL`,
    );
    const failed = rows.filter((r) => !r.finished_at);
    if (failed.length) {
      throw new Error(`A previous migration did not finish: ${failed.map((f) => f.migration_name).join(", ")}. Restore a backup or resolve it before continuing.`);
    }
    const applied = new Map(rows.map((r) => [r.migration_name, r.checksum]));
    const pending = migrations.filter((m) => !applied.has(m));

    if (process.argv[2] === "status") {
      for (const m of migrations) console.log(`${applied.has(m) ? "✓ applied " : "• pending "} ${m}`);
      console.log(pending.length ? `${pending.length} pending migration(s).` : "Database schema is up to date.");
      return;
    }

    for (const name of migrations.filter((m) => applied.has(m))) {
      const sum = createHash("sha256").update(readFileSync(path.join(dir, name, "migration.sql"))).digest("hex");
      if (sum !== applied.get(name)) console.warn(`! ${name} was modified after it was applied (checksum differs).`);
    }
    if (!pending.length) {
      console.log("Database schema is up to date.");
      return;
    }
    for (const name of pending) {
      const sql = readFileSync(path.join(dir, name, "migration.sql"));
      const checksum = createHash("sha256").update(sql).digest("hex");
      const id = randomUUID();
      process.stdout.write(`Applying ${name} … `);
      await client.query("BEGIN");
      try {
        await client.query(`INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at) VALUES ($1, $2, $3, now())`, [id, checksum, name]);
        await client.query(sql.toString("utf8"));
        await client.query(`UPDATE "_prisma_migrations" SET finished_at = now(), applied_steps_count = 1 WHERE id = $1`, [id]);
        await client.query("COMMIT");
        console.log("done");
      } catch (err) {
        await client.query("ROLLBACK");
        console.log("failed");
        throw err;
      }
    }
    console.log(`Applied ${pending.length} migration(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err: Error) => {
  console.error(`✗ ${err.message}`);
  process.exitCode = 1;
});
