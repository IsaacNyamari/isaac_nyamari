/**
 * PM2 process file for VPS deployments (see docs/deploy-vps.md).
 *   pm2 start ecosystem.config.cjs && pm2 save
 * Runs a single process: page caches live in process memory, so one instance keeps
 * dashboard edits instantly visible.
 */
module.exports = {
  apps: [
    {
      name: "isaac-nyamari",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      // Only reachable through Nginx on the same machine
      args: "start --port 3000 --hostname 127.0.0.1",
      exec_mode: "fork",
      instances: 1,
      max_memory_restart: "700M",
      kill_timeout: 10000,
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
