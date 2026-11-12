import { execSync } from "node:child_process";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://isaac:isaac_local_dev@localhost:5544/isaac_test";

/** Applies the real migrations to the dedicated test database before the suite runs. */
export default function setup() {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
