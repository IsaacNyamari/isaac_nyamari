# Deploying on cPanel shared hosting

This guide deploys the website and dashboard to a cPanel account using **Setup Node.js App**
(CloudLinux Node.js Selector / Phusion Passenger).

Shared hosting usually has too little memory to compile a Next.js app, and its
`npm install` button is fragile. So you **compile everything on your own computer** and upload a
ready-to-run package. The server never runs `npm install` or a build.

```
Your computer                                    cPanel account
─────────────                                    ──────────────
npm run build:cpanel  ──►  isaac-nyamari-DATE.zip  ──►  ~/isaac-nyamari/   (Node.js app root)
  • compiles the site & dashboard                         app.js           ← startup file
  • bundles the server + its dependencies                 server/          ← compiled app
  • adds Linux image-processing binaries                  ops/             ← migrate / seed / admin tools
  • bundles maintenance tools                             .env             ← your settings (you create it)
                                                     ~/isaac-uploads/     ← uploaded media (persistent)
```

---

## 0. Check your hosting plan first

| Requirement | Why | Where to check |
|---|---|---|
| **Setup Node.js App** in cPanel | Runs the server | cPanel → *Software* section |
| **Node.js 20.9 or newer** (22 LTS recommended) | Next.js 16 requirement | The Node.js version dropdown when creating the app |
| **PostgreSQL** | The database (MySQL/MariaDB is **not** supported) | cPanel → *Databases* → *PostgreSQL Databases*. If missing, use an external PostgreSQL (see §2b) |
| **Terminal** or **SSH access** | Running migrations and creating the admin | cPanel → *Advanced* → *Terminal*. Without it, use §6b |
| Linux **x86_64** server | The package contains x86_64 Linux image binaries | Terminal: `uname -m` → `x86_64` |
| Around **512 MB–1 GB RAM** for the account | The Node server uses about 150–300 MB | Your plan details / *Resource Usage* |

> Ask your host to enable "Setup Node.js App", PostgreSQL or Terminal if any are missing. Most
> CloudLinux-based hosts offer them.

---

## 1. Build the upload package on your computer

In the project folder (Windows, macOS or Linux):

```bash
npm ci
```

```bash
npm run build:cpanel
```

This creates:

- `deploy/isaac-nyamari/`: the ready-to-run application folder
- `deploy/isaac-nyamari-YYYY-MM-DD.zip`: the same folder, zipped for upload

The package contains **no secrets** (your local `.env` is never included) and no source code. It is
about 80 MB unzipped and 26 MB zipped.

> The build does not need a database, so you don't have to connect to production from your computer.

---

## 2. Create the database

### 2a. PostgreSQL on cPanel (recommended when available)

1. cPanel → **PostgreSQL Databases**.
2. **Create New Database**: e.g. `isaac`. cPanel prefixes it with your username, e.g. `cpuser_isaac`.
3. **Add New User**: e.g. `isaac` → `cpuser_isaac`, with a long random password.
4. **Add User to Database**: select both and grant **ALL PRIVILEGES**.

Your connection string:

```
postgresql://cpuser_isaac:PASSWORD@localhost:5432/cpuser_isaac
```

If the password contains special characters (`@ : / ? # % &` …), URL-encode them, for example `@`
becomes `%40`. Or use only letters and numbers for this password.

### 2b. External PostgreSQL (when your host has no PostgreSQL)

Create a database at a managed provider (Neon, Supabase, Aiven, DigitalOcean, …) and copy its
connection string. Add `?sslmode=require` if the provider asks for SSL:

```
postgresql://user:password@host.provider.com:5432/dbname?sslmode=require
```

Make sure the provider allows connections from your hosting server's IP address.

---

## 3. Create the Node.js application in cPanel

1. cPanel → **Setup Node.js App** → **Create Application**.
2. Fill in:

   | Field | Value |
   |---|---|
   | Node.js version | **22.x** (or the newest ≥ 20.9 offered) |
   | Application mode | **Production** |
   | Application root | `isaac-nyamari` (a folder in your home directory, **not** inside `public_html`) |
   | Application URL | your domain, e.g. `yourdomain.com` (leave the path empty) |
   | Application startup file | `app.js` |
   | Passenger log file | `/home/CPANEL_USER/isaac-nyamari/passenger.log` (optional but very helpful) |

3. Click **Create**, then **Stop App** before uploading files.

cPanel creates the folder `~/isaac-nyamari` with a placeholder `app.js`. It also adds Passenger
rules to your domain's `.htaccess`, so leave those lines alone.

---

## 4. Upload the package

1. cPanel → **File Manager** → open `/home/CPANEL_USER/isaac-nyamari`.
2. Delete the placeholder `app.js` (keep the `tmp` folder if present).
3. **Upload** `isaac-nyamari-YYYY-MM-DD.zip`, select it → **Extract** → into
   `/home/CPANEL_USER/isaac-nyamari`.
4. Check that the folder now contains `app.js`, `package.json`, `server/`, `ops/` and
   `.env.example`. Turn on *Settings → Show Hidden Files* to see dotfiles. Then delete the zip.
5. Create the uploads folder **outside** the app folder, so redeploys never touch it:
   `/home/CPANEL_USER/isaac-uploads`.

> ⚠️ **Do not click "Run NPM Install".** All dependencies are already inside `server/`.
> The package deliberately has no `node_modules` folder at the app root, which CloudLinux
> reserves for its own virtual environment.

---

## 5. Configure the environment (`.env`)

In File Manager, copy `.env.example` to **`.env`** in the app root and edit it:

```ini
DATABASE_URL="postgresql://cpuser_isaac:PASSWORD@localhost:5432/cpuser_isaac"
SITE_URL="https://yourdomain.com"
BETTER_AUTH_URL="https://yourdomain.com"
BETTER_AUTH_SECRET="…32+ random characters…"
CRON_SECRET="…another random string, 16+ characters…"

STORAGE_DRIVER="local"
LOCAL_STORAGE_DIR="/home/CPANEL_USER/isaac-uploads"
MEDIA_MAX_UPLOAD_MB="10"

EMAIL_DRIVER="smtp"
EMAIL_FROM="Isaac Nyamari Website <no-reply@yourdomain.com>"
SMTP_HOST="mail.yourdomain.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="no-reply@yourdomain.com"
SMTP_PASSWORD="…mailbox password…"

INTERNAL_SCHEDULER="false"
```

- Generate the two secrets on your computer:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  ```

- `SITE_URL` and `BETTER_AUTH_URL` must match the real address exactly, including `https://` and
  `www.` if you use it. Otherwise sign-in fails.
- Create the `no-reply@` mailbox in cPanel → **Email Accounts**. Your host's *Connect Devices* page
  shows the SMTP host and port. Use port 465 with `SMTP_SECURE="true"`, or port 587 with `"false"`.
- Leave the `SEED_CONTACT_*` and `ADMIN_*` lines empty for now (§6).
- Set the file permissions of `.env` to **600** (File Manager → *Permissions*).

> You can also enter variables in the Node.js app page under **Environment variables**. Those take
> precedence over `.env`. Using only `.env` keeps everything in one place.

---

## 6. Initialise the database and create your admin account

### 6a. With Terminal / SSH (recommended)

1. Open **Setup Node.js App**, click your app, and copy the command shown at the top
   ("Enter to the virtual environment"). It looks like this:

   ```bash
   source /home/CPANEL_USER/nodevenv/isaac-nyamari/22/bin/activate && cd /home/CPANEL_USER/isaac-nyamari
   ```

2. Open cPanel → **Terminal**, paste it and press Enter.
3. Run, one at a time:

   ```bash
   npm run migrate
   ```

   ```bash
   npm run seed
   ```

   ```bash
   ADMIN_EMAIL="you@yourdomain.com" ADMIN_PASSWORD="a-long-unique-password" ADMIN_NAME="Isaac Nyamari" npm run admin:create
   ```

4. Clear the password from the shell history:

   ```bash
   history -c
   ```

What these do:

- `npm run migrate` creates or updates the tables. It is safe to run any time, and running it again
  says "Database schema is up to date."
- `npm run seed` adds the initial services, About and Privacy pages, homepage sections, menus and
  skills. It never overwrites your edits.
- `npm run admin:create` creates your login. The password must be 12+ characters, and no default
  password exists.

None of these install anything. They run the bundled tools in `ops/`.

### 6b. Without Terminal access

The Node.js app page has a **Run JS script** button that runs the scripts from `package.json`:

1. Run **migrate**, then **seed**.
2. Temporarily add these lines to `.env`:

   ```ini
   ADMIN_EMAIL="you@yourdomain.com"
   ADMIN_PASSWORD="a-long-unique-password"
   ADMIN_NAME="Isaac Nyamari"
   ```

3. Run **admin:create**.
4. **Remove those three lines from `.env` immediately afterwards.**

---

## 7. Start the application

1. **Setup Node.js App** → your app → **Start App** (or **Restart**).
2. Open `https://yourdomain.com`. The first request takes a few seconds while Passenger starts
   Node.
3. Sign in at `https://yourdomain.com/admin`.
4. Go to **Settings → Contact** and enter your public email, phone and WhatsApp number.

You can also restart from the terminal with `touch ~/isaac-nyamari/tmp/restart.txt`.

---

## 8. HTTPS

1. cPanel → **SSL/TLS Status** → run **AutoSSL** for the domain (free certificate).
2. cPanel → **Domains** → enable **Force HTTPS Redirect**.
3. Make sure `.env` uses `https://` URLs, then restart the app.

---

## 9. Scheduled publishing (cron job)

Passenger stops idle Node processes, so the in-app timer isn't reliable on shared hosting. Use a
cPanel cron job instead:

1. cPanel → **Cron Jobs** → *Add New Cron Job*.
2. Common setting: **Once Per Minute** (`* * * * *`). If your host allows only every 5 or 15 minutes,
   scheduled posts go live within that interval.
3. Command (replace the domain and secret):

   ```bash
   curl -fsS -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/publish > /dev/null
   ```

The cron job also wakes the app regularly, which keeps the first visitor from waiting.

---

## 10. Final checks

- [ ] Home, About, Services, Projects, Insights and Contact pages load.
- [ ] `https://yourdomain.com/sitemap.xml` and `/robots.txt` load.
- [ ] You can sign in at `/admin`, and the dashboard counts show 5 services.
- [ ] **Media library:** uploading a JPG or PNG works (this checks the image library and the uploads
  folder).
- [ ] **Contact form:** submit a test inquiry. It appears in **Inquiries**, and the notification email
  arrives (or the inquiry shows why it failed).
- [ ] **Settings → Integrations** shows email and storage as configured.
- [ ] Publish a test post, view it logged out, then unpublish or delete it.

---

## Updating to a new version

1. On your computer, pull or merge the changes and run `npm ci`, then `npm run build:cpanel`.
2. In cPanel: **Stop App**.
3. In File Manager, **rename** `server` to `server-old` and `ops` to `ops-old`. This lets you roll
   back.
4. Upload the new zip and extract it into the app folder, overwriting `app.js` and `package.json`.
   Your `.env` and the uploads folder are not part of the zip, so they are untouched.
5. Terminal (inside the virtual environment, §6a): `npm run migrate`.
6. **Start App**, check the site, then delete `server-old` and `ops-old`.

**Rollback:** stop the app, swap the `-old` folders back, and start it again. Only roll back a
database migration from a backup.

---

## Backups

- **Database:** cPanel → **Backup** → *Download a PostgreSQL Database Backup*. Or from the
  terminal:

  ```bash
  pg_dump --format=custom --no-owner "$DATABASE_URL" -f ~/backups/isaac-$(date +%F).dump
  ```

- **Media:** download or compress `~/isaac-uploads` (File Manager → *Compress*).
- Take both at the same time and keep copies off the server. Many hosts also run their own daily
  backups through JetBackup.

**Restore:** create an empty database (§2), then restore the dump:

```bash
pg_restore --no-owner -d "$DATABASE_URL" isaac-YYYY-MM-DD.dump
```

Then copy the uploads folder back and restart the app.

---

## Troubleshooting

Check the logs first: `~/isaac-nyamari/passenger.log` (if you set it in §3) and `stderr.log`
in the app folder.

| Symptom | Likely cause → fix |
|---|---|
| "503 Service Unavailable" / "Incomplete response received from application" | The app crashed while starting. Read the log. Common causes: Node version below 20.9, a missing `.env`, or `DATABASE_URL` wrong. |
| Every page shows "We couldn't load this page" (HTTP 500) | Database unreachable. Check the user prefix, password encoding, that the user has privileges, and that you ran `npm run migrate`. |
| Sign-in does nothing or loops back to the login page | `SITE_URL`/`BETTER_AUTH_URL` don't exactly match the address in the browser (http vs https, www vs no www). Fix `.env` and restart. |
| "Too many attempts" when signing in | Sign-in is limited to 5 attempts per minute. Wait one minute. |
| Upload says "Image processing is unavailable on this server" | The image library can't load on this server. Check `uname -m` is `x86_64` and that the host runs a modern OS (CloudLinux 8+). The rest of the site keeps working. |
| Upload fails with "413" or the connection drops | The host's request-size limit is lower than the upload. Use smaller files, lower `MEDIA_MAX_UPLOAD_MB`, or ask the host to raise the limit. |
| Error mentioning "node_modules" and "virtual environment" | Someone clicked **Run NPM Install** or created a `node_modules` folder in the app root. Delete that `node_modules` (not `server/node_modules`) and restart. |
| An edit in the dashboard isn't visible on the site | Some hosts run several Passenger processes, and each keeps its own page cache. Restart the app; content also refreshes automatically within an hour. |
| Scheduled posts don't go live | Check the cron job's command and secret. Running the curl command in the Terminal should print `{"published":[…]}`. |
| No inquiry emails | Open the inquiry: it shows the email error. Check the `SMTP_*` values; try port 587 with `SMTP_SECURE="false"`. |

---

## Reference: what's in the package

| Path | Purpose |
|---|---|
| `app.js` | Startup file. Loads `.env`, binds to all interfaces (cPanel sets an unusable `HOSTNAME`), resolves a relative `LOCAL_STORAGE_DIR`, then starts `server/server.js`. |
| `package.json` | No dependencies; only shortcut scripts (`migrate`, `seed`, `admin:create`, `admin:reset-password`, `migrate:status`). |
| `server/` | Compiled Next.js server, its traced `node_modules`, `.next/static` assets and `public/` files. |
| `ops/migrate.mjs` | Applies `ops/migrations/*`. It records history in Prisma's `_prisma_migrations` table with Prisma's checksums, so it stays compatible with `prisma migrate` on any machine. |
| `ops/seed.mjs`, `ops/admin.mjs` | Bundled versions of `prisma/seed.ts` and `scripts/admin.ts`. They read `.env` from the current folder. |

To reset a forgotten admin password from the terminal (inside the virtual environment):

```bash
ADMIN_EMAIL="you@yourdomain.com" ADMIN_PASSWORD="new-long-password" npm run admin:reset-password
```
