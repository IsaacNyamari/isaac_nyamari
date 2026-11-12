/**
 * Builds a self-contained, upload-ready package for cPanel / shared hosting:
 *
 *   deploy/isaac-nyamari/            ← upload this folder's contents as the Node.js app root
 *     app.js                         cPanel/Passenger startup file (loads .env, starts the server)
 *     package.json                   minimal, no dependencies (do not run "NPM install")
 *     .env.example                   copy to .env and fill in
 *     server/                        compiled Next.js server, static assets, public files, node_modules
 *     ops/                           migrate.mjs, seed.mjs, admin.mjs (+ migrations), no install needed
 *   deploy/isaac-nyamari-<date>.zip  the same folder, zipped for the cPanel File Manager
 *
 * Usage: npm run build:cpanel [-- --platform=linux|current] [-- --no-zip]
 */
import { execSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const args = new Set(process.argv.slice(2));
const target = [...args].find((a) => a.startsWith("--platform="))?.split("=")[1] ?? "linux";
const outDir = path.join(root, "deploy", "isaac-nyamari");
const serverDir = path.join(outDir, "server");
const opsDir = path.join(outDir, "ops");

// On Windows use the built-in bsdtar (GNU tar from Git Bash misreads "C:" paths and cannot write zips).
const TAR = process.platform === "win32" ? path.join(process.env.SystemRoot ?? "C:/Windows", "System32", "tar.exe") : "tar";

function step(msg) {
  console.log(`\n▸ ${msg}`);
}

// 1. Compile the application (standalone server + client assets)
step("Compiling the Next.js application (standalone output)…");
const result = spawnSync("npx", ["next", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, BUILD_STANDALONE: "1", NEXT_TELEMETRY_DISABLED: "1" },
});
if (result.status !== 0) process.exit(result.status ?? 1);

// 2. Assemble the server folder
step("Assembling the deploy folder…");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(path.join(root, ".next", "standalone"), serverDir, { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(serverDir, ".next", "static"), { recursive: true });
cpSync(path.join(root, "public"), path.join(serverDir, "public"), { recursive: true });
// Never ship local secrets or build-machine env files inside the package
for (const f of readdirSync(serverDir)) if (f.startsWith(".env")) rmSync(path.join(serverDir, f), { force: true });

// 3. Native image library for the target server (cPanel hosts are Linux x64)
if (target === "linux" && process.platform !== "linux") {
  step("Adding Linux x64 image-processing binaries (sharp)…");
  const sharpPkg = JSON.parse(readFileSync(path.join(root, "node_modules", "sharp", "package.json"), "utf8"));
  const wanted = ["@img/sharp-linux-x64", "@img/sharp-libvips-linux-x64"].map((n) => `${n}@${sharpPkg.optionalDependencies[n]}`);
  const tmp = mkdtempSync(path.join(os.tmpdir(), "sharp-linux-"));
  execSync(`npm pack ${wanted.join(" ")} --silent`, { cwd: tmp, stdio: "pipe" });
  for (const tgz of readdirSync(tmp).filter((f) => f.endsWith(".tgz"))) {
    const name = tgz.startsWith("img-sharp-libvips") ? "sharp-libvips-linux-x64" : "sharp-linux-x64";
    const dest = path.join(serverDir, "node_modules", "@img", name);
    mkdirSync(dest, { recursive: true });
    const extracted = spawnSync(TAR, ["-xzf", path.join(tmp, tgz), "-C", dest, "--strip-components=1"], { stdio: "inherit" });
    if (extracted.status !== 0) throw new Error(`Could not extract ${tgz}`);
  }
  rmSync(tmp, { recursive: true, force: true });
  // The build machine's own binaries are useless on the server
  const imgDir = path.join(serverDir, "node_modules", "@img");
  for (const d of readdirSync(imgDir)) if (/^sharp-(libvips-)?(win32|darwin)/.test(d)) rmSync(path.join(imgDir, d), { recursive: true, force: true });
}

// 4. Maintenance tools bundled into single files (no npm install on the server)
step("Bundling maintenance tools (migrate, seed, admin)…");
mkdirSync(opsDir, { recursive: true });
const entries = {
  migrate: path.join(root, "scripts", "ops", "migrate.ts"),
  seed: path.join(root, "prisma", "seed.ts"),
  admin: path.join(root, "scripts", "admin.ts"),
};
for (const [name, entry] of Object.entries(entries)) {
  await build({
    entryPoints: [entry],
    outfile: path.join(opsDir, `${name}.mjs`),
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    logLevel: "warning",
    tsconfig: path.join(root, "tsconfig.json"),
    banner: {
      js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
    },
  });
}
cpSync(path.join(root, "prisma", "migrations"), path.join(opsDir, "migrations"), { recursive: true });

// 5. Startup file, minimal package.json and env template
step("Writing app.js, package.json and .env.example…");
writeFileSync(
  path.join(outDir, "app.js"),
  `/**
 * Startup file for cPanel "Setup Node.js App" (Phusion Passenger) and other Node hosts.
 * Loads .env from this folder (variables set in the cPanel UI take precedence), then starts
 * the compiled Next.js server in ./server.
 */
const fs = require("node:fs");
const path = require("node:path");

const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\\r?\\n/)) {
    const m = line.match(/^\\s*(?:export\\s+)?([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.*)\\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let value = m[2];
    if (/^(['"]).*\\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\\s+#.*$/, "");
    process.env[m[1]] = value;
  }
}
process.env.NODE_ENV = "production";
// cPanel exports the machine's HOSTNAME; the server would try to bind to it. Bind to all interfaces.
process.env.HOSTNAME = process.env.BIND_HOST || "0.0.0.0";
// Relative upload paths resolve from this folder, not from ./server.
if (process.env.LOCAL_STORAGE_DIR && !path.isAbsolute(process.env.LOCAL_STORAGE_DIR)) {
  process.env.LOCAL_STORAGE_DIR = path.resolve(__dirname, process.env.LOCAL_STORAGE_DIR);
}

require("./server/server.js");
`,
);
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
writeFileSync(
  path.join(outDir, "package.json"),
  `${JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      private: true,
      description: "Compiled production build. All dependencies are bundled; do not run npm install.",
      main: "app.js",
      engines: { node: ">=20.9" },
      scripts: {
        start: "node app.js",
        migrate: "node ops/migrate.mjs",
        "migrate:status": "node ops/migrate.mjs status",
        seed: "node ops/seed.mjs",
        "admin:create": "node ops/admin.mjs create",
        "admin:reset-password": "node ops/admin.mjs reset-password",
      },
    },
    null,
    2,
  )}\n`,
);
const envExample = readFileSync(path.join(root, ".env.example"), "utf8")
  .replace('LOCAL_STORAGE_DIR="./storage/uploads"', 'LOCAL_STORAGE_DIR="/home/CPANEL_USER/isaac-uploads"')
  .replace('INTERNAL_SCHEDULER="false"', 'INTERNAL_SCHEDULER="false"  # use a cPanel cron job instead (see docs)');
writeFileSync(path.join(outDir, ".env.example"), envExample);

// 6. Zip for the cPanel File Manager
if (!args.has("--no-zip")) {
  step("Creating zip archive…");
  const stamp = new Date().toISOString().slice(0, 10);
  const zip = path.join(root, "deploy", `isaac-nyamari-${stamp}.zip`);
  rmSync(zip, { force: true });
  const zipped =
    process.platform === "win32"
      ? spawnSync(TAR, ["-a", "-c", "-f", zip, "-C", outDir, "."], { stdio: "inherit" })
      : spawnSync("sh", ["-c", `cd "${outDir}" && zip -qr "${zip}" .`], { stdio: "inherit" });
  if (zipped.status === 0 && existsSync(zip)) console.log(`  ${path.relative(root, zip)}`);
  else console.warn("  Could not create the zip automatically — zip the deploy/isaac-nyamari folder manually.");
}

console.log(`\n✓ Deploy package ready: ${path.relative(root, outDir)}`);
console.log("  Next: follow docs/deploy-cpanel.md (upload, .env, migrate, seed, admin, restart).");
