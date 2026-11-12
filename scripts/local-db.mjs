// Runs a real PostgreSQL server for local development and tests.
// Production should use a managed PostgreSQL instance (see README).
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const port = Number(process.env.LOCAL_PG_PORT ?? 5544);
const databaseDir = path.resolve(process.env.LOCAL_PG_DIR ?? ".data/postgres");
const databases = ["isaac", "isaac_test", "isaac_e2e"];

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "isaac",
  password: "isaac_local_dev",
  port,
  persistent: true,
  // UTF-8 regardless of the OS locale (Windows would otherwise default to WIN1252).
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
});

if (!existsSync(path.join(databaseDir, "PG_VERSION"))) {
  console.log(`Initialising PostgreSQL cluster in ${databaseDir}`);
  await pg.initialise();
}
await pg.start();

const client = pg.getPgClient();
await client.connect();
for (const name of databases) {
  const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (!rowCount) {
    await client.query(`CREATE DATABASE "${name}"`);
    console.log(`Created database ${name}`);
  }
}
await client.end();

console.log(`PostgreSQL ready on postgresql://isaac:isaac_local_dev@localhost:${port}/isaac`);

const shutdown = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => {}, 1 << 30);
