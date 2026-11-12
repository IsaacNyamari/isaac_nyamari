# Deploying on a VPS (Ubuntu + PostgreSQL + Nginx + PM2)

This guide sets up the website and dashboard on your own server:

```
Internet ──HTTPS──► Nginx (443) ──► Next.js on 127.0.0.1:3000 (PM2) ──► PostgreSQL (local)
                                         │
                                         └─► /var/lib/isaac-nyamari/uploads  (media files)
```

Tested target: **Ubuntu 24.04 LTS** (Debian 12 works the same way). Recommended size: 1 vCPU,
**2 GB RAM** (1 GB works with swap, §2), 20 GB disk.

Replace these placeholders throughout:

| Placeholder | Example |
|---|---|
| `yourdomain.com` | your real domain |
| `SERVER_IP` | your VPS public IP |
| `deploy` | the Linux user that runs the app |

---

## 1. DNS

At your domain registrar or DNS provider, create:

- `A` record `yourdomain.com` → `SERVER_IP`
- `A` record `www.yourdomain.com` → `SERVER_IP` (optional)

---

## 2. Prepare the server

Log in as root (or a sudo user):

```bash
ssh root@SERVER_IP
```

Update the system and install the basics:

```bash
apt update && apt -y upgrade && apt -y install curl git ufw nginx unattended-upgrades
```

Create a dedicated user for the app (it needs your SSH key to log in):

```bash
adduser --disabled-password --gecos "" deploy && usermod -aG sudo deploy && mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/ && chown -R deploy:deploy /home/deploy/.ssh
```

Firewall: allow only SSH and web traffic:

```bash
ufw allow OpenSSH && ufw allow "Nginx Full" && ufw --force enable
```

**1 GB servers only:** add swap so the production build doesn't run out of memory:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo "/swapfile none swap sw 0 0" >> /etc/fstab
```

---

## 3. Install Node.js 22 LTS and PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt -y install nodejs
```

```bash
npm install -g pm2
```

Check that `node -v` prints v22.x.

---

## 4. Install PostgreSQL and create the database

```bash
apt -y install postgresql
```

Create a user and a **UTF-8** database (replace the password):

```bash
sudo -u postgres psql -c "CREATE USER isaac WITH PASSWORD 'CHANGE-ME-long-random-password';"
```

```bash
sudo -u postgres psql -c "CREATE DATABASE isaac_nyamari OWNER isaac ENCODING 'UTF8' TEMPLATE template0;"
```

PostgreSQL only listens on localhost by default, which is what you want. Your connection string:

```
postgresql://isaac:CHANGE-ME-long-random-password@localhost:5432/isaac_nyamari
```

> Using managed PostgreSQL instead (DigitalOcean, Neon, Supabase, RDS…)? Skip this section and use
> the connection string they provide.

---

## 5. Get the code onto the server

Create the app and uploads directories:

```bash
mkdir -p /var/www/isaac-nyamari /var/lib/isaac-nyamari/uploads /var/backups/isaac-nyamari && chown -R deploy:deploy /var/www/isaac-nyamari /var/lib/isaac-nyamari /var/backups/isaac-nyamari
```

Switch to the app user:

```bash
su - deploy
```

**Option A, from a Git repository** (recommended; push the project to GitHub/GitLab first):

```bash
git clone https://github.com/YOUR-ACCOUNT/isaac-nyamari.git /var/www/isaac-nyamari
```

**Option B, copy from your computer.** Run this on your computer from the project folder:

```bash
rsync -av --exclude node_modules --exclude .next --exclude .data --exclude deploy --exclude storage --exclude .env ./ deploy@SERVER_IP:/var/www/isaac-nyamari/
```

---

## 6. Configure the environment

```bash
cd /var/www/isaac-nyamari && cp .env.example .env && chmod 600 .env && nano .env
```

Production values:

```ini
DATABASE_URL="postgresql://isaac:CHANGE-ME-long-random-password@localhost:5432/isaac_nyamari"
SITE_URL="https://yourdomain.com"
BETTER_AUTH_URL="https://yourdomain.com"
BETTER_AUTH_SECRET="…32+ random characters…"
CRON_SECRET="…16+ random characters…"
INTERNAL_SCHEDULER="true"

STORAGE_DRIVER="local"
LOCAL_STORAGE_DIR="/var/lib/isaac-nyamari/uploads"
MEDIA_MAX_UPLOAD_MB="10"

EMAIL_DRIVER="smtp"          # or "resend"
EMAIL_FROM="Isaac Nyamari Website <no-reply@yourdomain.com>"
SMTP_HOST="smtp.yourprovider.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="…"
SMTP_PASSWORD="…"
# RESEND_API_KEY="re_…"      # if EMAIL_DRIVER="resend"
```

Generate the secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Notes:

- `SITE_URL`/`BETTER_AUTH_URL` must match the public address exactly (https, with or without
  `www`).
- `INTERNAL_SCHEDULER="true"` publishes scheduled posts from inside the app every minute. No cron is
  needed on a VPS.
- For S3, R2 or MinIO storage instead of local disk, set `STORAGE_DRIVER="s3"` and the `S3_*`
  variables (see README §3).

---

## 7. Install, migrate, seed, create the admin and build

All commands run as `deploy` in `/var/www/isaac-nyamari`.

Install the exact dependency versions from the lockfile:

```bash
npm ci
```

Create the tables:

```bash
npm run db:deploy
```

Add the initial content (services, pages, homepage, menus, skills; never overwrites edits):

```bash
npm run db:seed
```

Create your administrator (12+ character password), then clear the shell history:

```bash
ADMIN_EMAIL="you@yourdomain.com" ADMIN_PASSWORD="a-long-unique-password" ADMIN_NAME="Isaac Nyamari" npm run admin:create && history -c
```

Compile the production build:

```bash
npm run build
```

---

## 8. Run the app with PM2

The repository includes `ecosystem.config.cjs`. It runs a single process bound to `127.0.0.1:3000`,
so only Nginx can reach it, and restarts it if memory exceeds 700 MB.

```bash
pm2 start ecosystem.config.cjs && pm2 save
```

Make PM2 start on boot. PM2 prints a `sudo env PATH=…` command; run that command as well:

```bash
pm2 startup systemd -u deploy --hp /home/deploy
```

Check that it's running:

```bash
pm2 status && curl -sI http://127.0.0.1:3000 | head -1
```

> Keep **one instance** (fork mode). Page caches and their invalidation live in process memory, so a
> PM2 cluster would serve stale pages after dashboard edits until each process refreshes.

<details>
<summary>Alternative: systemd instead of PM2</summary>

Create `/etc/systemd/system/isaac-nyamari.service` (as root):

```ini
[Unit]
Description=Isaac Nyamari website
After=network.target postgresql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/isaac-nyamari
Environment=NODE_ENV=production PORT=3000
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start --port 3000 --hostname 127.0.0.1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then enable and start it:

```bash
systemctl daemon-reload && systemctl enable --now isaac-nyamari
```

Logs: `journalctl -u isaac-nyamari -f`.
</details>

---

## 9. Configure Nginx

As root, create `/etc/nginx/sites-available/isaac-nyamari`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Media uploads (keep above MEDIA_MAX_UPLOAD_MB × files per upload)
    client_max_body_size 25m;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml application/xml;

    # Fingerprinted build assets never change: cache for a year
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
```

Enable the site and reload Nginx:

```bash
ln -s /etc/nginx/sites-available/isaac-nyamari /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl reload nginx
```

The `X-Real-IP`/`X-Forwarded-For` headers matter: the contact-form and sign-in rate limits use the
visitor's IP address.

---

## 10. HTTPS with Let's Encrypt

```bash
apt -y install certbot python3-certbot-nginx
```

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com --redirect -m you@yourdomain.com --agree-tos -n
```

Certbot edits the Nginx config for HTTPS and installs automatic renewal. Test renewal with
`certbot renew --dry-run`. Sign-in cookies are marked `Secure` automatically because `SITE_URL` starts
with `https://`.

---

## 11. Final checks

- [ ] `https://yourdomain.com` loads, and `http://` redirects to `https://`.
- [ ] Sign in at `/admin`; enter your contact details in **Settings → Contact**.
- [ ] Upload an image in **Media library**. The file should appear in
  `/var/lib/isaac-nyamari/uploads`.
- [ ] Submit a contact-form inquiry: it appears in **Inquiries** and the email arrives.
- [ ] Schedule a post 2 minutes ahead and confirm it goes live by itself.
- [ ] `https://yourdomain.com/sitemap.xml` lists your published pages.

---

## 12. Backups

Create `/usr/local/bin/isaac-backup.sh` (as root):

```bash
#!/usr/bin/env bash
set -euo pipefail
set -a; source /var/www/isaac-nyamari/.env; set +a
DEST=/var/backups/isaac-nyamari
STAMP=$(date +%F-%H%M)
pg_dump --format=custom --no-owner "$DATABASE_URL" -f "$DEST/db-$STAMP.dump"
tar -czf "$DEST/uploads-$STAMP.tar.gz" -C /var/lib/isaac-nyamari uploads
find "$DEST" -type f -mtime +14 -delete
```

Make it executable and owned by the app user:

```bash
chmod 750 /usr/local/bin/isaac-backup.sh && chown deploy:deploy /usr/local/bin/isaac-backup.sh
```

Run it daily at 02:30 from the `deploy` user's crontab (`crontab -e` as `deploy`):

```
30 2 * * * /usr/local/bin/isaac-backup.sh >> /var/backups/isaac-nyamari/backup.log 2>&1
```

Copy backups **off the server** as well, for example with `rclone` to cloud storage or your
provider's snapshot feature. Test a restore now and then.

**Restore:**

Stop the app:

```bash
pm2 stop isaac-nyamari
```

Restore the database (this replaces existing data):

```bash
set -a; source /var/www/isaac-nyamari/.env; set +a; pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" /var/backups/isaac-nyamari/db-YYYY-MM-DD-HHMM.dump
```

Restore the uploads:

```bash
tar -xzf /var/backups/isaac-nyamari/uploads-YYYY-MM-DD-HHMM.tar.gz -C /var/lib/isaac-nyamari
```

Start the app again:

```bash
pm2 start isaac-nyamari
```

---

## 13. Deploying updates

As `deploy` in `/var/www/isaac-nyamari`. Pull the new code (or rsync it as in §5):

```bash
git pull
```

Install dependencies, apply new migrations and rebuild:

```bash
npm ci && npm run db:deploy && npm run build
```

Restart with the new build:

```bash
pm2 reload isaac-nyamari
```

The site keeps serving the old build until `pm2 reload`. Take a backup (§12) before updates that
include database migrations.

---

## 14. Logs and monitoring

| What | Command |
|---|---|
| App logs (live) | `pm2 logs isaac-nyamari` |
| App status / memory | `pm2 status` · `pm2 monit` |
| Nginx errors | `tail -f /var/log/nginx/error.log` |
| Scheduler activity | `pm2 logs isaac-nyamari \| grep scheduler` |
| Database size | `sudo -u postgres psql -c "\l+ isaac_nyamari"` |

An uptime monitor (UptimeRobot, Better Stack, …) pointed at `https://yourdomain.com` alerts you if
the site goes down.

---

## 15. Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| `502 Bad Gateway` | The app isn't running. Check `pm2 status` and `pm2 logs`. Rebuild if `.next` is missing (`npm run build`). |
| Build is killed or "JavaScript heap out of memory" | Not enough RAM. Add swap (§2) or build on another machine and copy `.next`. |
| Sign-in loops back to the login page | `SITE_URL`/`BETTER_AUTH_URL` don't match the browser address, or Nginx isn't sending `X-Forwarded-Proto`. |
| Uploads fail with `413 Request Entity Too Large` | Raise `client_max_body_size` in Nginx and reload. |
| Uploaded images missing after a redeploy | `LOCAL_STORAGE_DIR` pointed inside the app folder. Use `/var/lib/isaac-nyamari/uploads`. |
| "Image processing is unavailable on this server" | `sharp` failed to install. Run `npm ci` on the server itself (not copied from another OS) and check `node -v` ≥ 20.9. |
| Scheduled posts don't publish | `INTERNAL_SCHEDULER="true"` and `CRON_SECRET` must both be set; restart with `pm2 reload`. Alternatively add a cron job running `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/publish` every minute. |
| Database errors after an update | Run `npm run db:deploy`. Check status with `npx prisma migrate status`. |
| Forgotten admin password | `ADMIN_EMAIL="you@yourdomain.com" ADMIN_PASSWORD="new-long-password" npm run admin:reset-password`. This signs out all sessions. |
