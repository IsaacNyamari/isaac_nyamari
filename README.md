# Isaac Nyamari — Website & CMS

Personal website for **Isaac Nyamari** (Software Engineer · Full-Stack Developer · Systems Builder ·
Technology Entrepreneur) with a private, database-backed content management dashboard at `/admin`.

- **Public site:** home, about, services (+ detail pages), projects (+ case studies), insights blog
  (categories, tags, search, pagination, TOC, related posts, sharing), contact form, privacy, search,
  custom 404, sitemap, robots, Open Graph images and structured data.
- **Dashboard:** posts (draft / scheduled / published / archived, revisions, previews), categories &
  tags, media library, projects, services, pages, homepage section builder, skills, navigation,
  site settings, contact inquiries (notes, statuses, email-failure retry) and account security.

Design notes: [`docs/reference-analysis.md`](docs/reference-analysis.md) ·
Architecture: [`docs/implementation-plan.md`](docs/implementation-plan.md)

**Deployment guides:** [cPanel shared hosting](docs/deploy-cpanel.md) ·
[VPS (Ubuntu, Nginx, PM2)](docs/deploy-vps.md)

---

## 1. Requirements

- Node.js 20.9+ (developed on Node 24) and npm
- PostgreSQL 14+ in production. Locally, `npm run db:local` runs a real PostgreSQL server from
  `node_modules` — no Docker or system install needed.
- For production media: a persistent disk **or** S3-compatible object storage.
- For email notifications: an SMTP account or a Resend API key.

## 2. Local setup

```bash
npm install
```

```bash
cp .env.example .env
```

Fill in `.env` (see §3). At minimum set `BETTER_AUTH_SECRET` and `CRON_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Start the local database in its own terminal (keep it running; Ctrl+C stops it):

```bash
npm run db:local
```

Apply migrations, seed initial content and create your administrator:

```bash
npm run db:deploy
```

```bash
npm run db:seed
```

```bash
ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a-long-unique-password" npm run admin:create
```

Run the app:

```bash
npm run dev
```

Website: http://localhost:3000 · Dashboard: http://localhost:3000/admin

> **Contact details:** the seed reads `SEED_CONTACT_EMAIL`, `SEED_CONTACT_PHONE` and
> `SEED_CONTACT_WHATSAPP` once. If they are empty, enter the details in **Admin → Settings →
> Contact**. Empty channels are hidden on the site, and the dashboard warns until one is set.
> Values are displayed exactly as entered.

## 3. Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `SITE_URL` | yes | Public base URL, no trailing slash (canonical URLs, sitemap, emails) |
| `BETTER_AUTH_URL` | yes | Usually the same as `SITE_URL` |
| `BETTER_AUTH_SECRET` | yes | 32+ random bytes; signs sessions and form tokens |
| `CRON_SECRET` | yes* | 16+ chars; protects `/api/cron/publish` (*needed for scheduled posts) |
| `INTERNAL_SCHEDULER` | no | `true` = publish scheduled posts from inside the Node server every minute |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | setup only | Used by `admin:create` / `admin:reset-password`; remove afterwards |
| `SEED_CONTACT_EMAIL` / `_PHONE` / `_WHATSAPP` | no | Initial public contact details for the seed |
| `STORAGE_DRIVER` | no | `local` (default) or `s3` |
| `LOCAL_STORAGE_DIR` | no | Upload folder for `local` (default `./storage/uploads`) |
| `MEDIA_MAX_UPLOAD_MB` | no | Per-file upload limit (default 10) |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`, `S3_FORCE_PATH_STYLE` | for `s3` | S3 / R2 / B2 / MinIO configuration; `S3_PUBLIC_URL` serves the files |
| `EMAIL_DRIVER` | no | `console` (dev, logs only), `smtp` or `resend` |
| `EMAIL_FROM` | for email | Sender, e.g. `Website <no-reply@yourdomain>` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | for `smtp` | SMTP settings |
| `RESEND_API_KEY` | for `resend` | Resend API key |

Secrets are only read on the server; nothing above is exposed to the browser. The
**Settings → Integrations** tab shows which providers are configured without revealing secrets.

## 4. Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run build:cpanel` | Compiled, self-contained upload package for cPanel (`deploy/`); see [docs/deploy-cpanel.md](docs/deploy-cpanel.md) |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |
| `npm run db:local` | Local PostgreSQL on port 5544 (`isaac`, `isaac_test`, `isaac_e2e` databases) |
| `npm run db:migrate` | Create/apply a migration in development (`prisma migrate dev`) |
| `npm run db:deploy` | Apply migrations (production/CI) |
| `npm run db:seed` | Idempotent initial content (never overwrites edits, never creates an admin) |
| `npm run admin:create` | Create the administrator from `ADMIN_*` env vars |
| `npm run admin:reset-password` | Set a new password for `ADMIN_EMAIL` and sign out all its sessions |
| `npm test` | Unit + integration tests (Vitest, real PostgreSQL `isaac_test`) |
| `npm run test:e2e` | Browser tests (Playwright) against the production build — run `npm run build` first |

### Tests

`npm test` applies the migrations to `isaac_test` and runs 63 tests covering authentication and
authorization of every mutation type, post lifecycle and draft privacy, scheduled publishing, slugs and
redirects, revisions, taxonomy, media validation (SVG/executables/mismatched content/size), media usage
checks and replacement, the upload route (auth + cross-site rejection), projects, services, the
homepage builder, pages, navigation and settings validation, inquiries (spam protection, rate limiting,
email-failure handling) and the safe rich-text renderer.

`npm run test:e2e` (first time: `npx playwright install chromium`) starts `next start` on port 3100
against the isolated `isaac_e2e` database, re-seeds it and runs 19 browser journeys: all public routes,
404s, SEO/robots/sitemap, contact form, service pre-selection, admin login, every dashboard page,
post create→publish→public, media upload→project cover, inquiry notes, homepage reordering, contact
settings → public links, mobile navigation and overflow checks.

## 5. Administrator access & password reset

- There is **no public registration**. Administrators are created only with `npm run admin:create`.
- No default password is ever seeded. Passwords must be at least 12 characters and are hashed
  (scrypt) by Better Auth.
- Change your password in **Admin → Account** (other sessions are signed out).
- **Forgotten password:** on the server (or with the production `DATABASE_URL`):

  ```bash
  ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="new-long-password" npm run admin:reset-password
  ```

  Then remove `ADMIN_PASSWORD` from the environment/shell history.
- Sign-in is rate limited (5 attempts/minute per IP), sessions are HTTP-only cookies validated
  against the database on every dashboard request, server action and upload.

## 6. Content workflow

- **Save draft** on unpublished content saves in place. On **live** content it stores *unpublished
  changes* privately — the public page is untouched until **Update live**.
- **Preview** (eye icons / Preview buttons) opens the draft in the real site layout with a banner.
  It requires an admin session; the preview cookie alone never exposes drafts.
- **Scheduling** (posts): pick a date/time and press *Schedule*. See §8 for the scheduler.
- **Revisions** (posts & pages): restore any of the last 30 versions as a draft.
- Changing the slug of published content creates a permanent redirect from the old URL.
- Media that is referenced anywhere (covers, galleries, inline images, settings, homepage) cannot be
  deleted; the library lists where it is used. *Replace file* keeps the same media id.
- Concurrent edits are detected: a stale save is rejected instead of overwriting newer changes.

## 7. Deployment

Step-by-step guides:

- **[cPanel shared hosting](docs/deploy-cpanel.md)**: build locally with `npm run build:cpanel`,
  upload the zip, and run it as a cPanel Node.js app. No `npm install` or build on the server.
- **[VPS](docs/deploy-vps.md)**: Ubuntu, PostgreSQL, Nginx, Let's Encrypt and PM2 (`ecosystem.config.cjs`),
  plus backups and updates.

Summary of the VPS route below. The app is a single Next.js server plus PostgreSQL, so any Node host
works.

**VPS (Ubuntu + Nginx + PM2/systemd)**

1. Provision PostgreSQL (managed or local) and create a database.
2. Copy the project, create `.env` with production values (`SITE_URL=https://yourdomain`,
   `EMAIL_DRIVER=smtp|resend`, `STORAGE_DRIVER=local` with `LOCAL_STORAGE_DIR` on a persistent
   path such as `/var/lib/isaac/uploads`, or `s3`).
3. Install and build:

   ```bash
   npm ci
   ```

   ```bash
   npm run db:deploy
   ```

   ```bash
   npm run db:seed
   ```

   ```bash
   npm run build
   ```

4. Create the administrator with `npm run admin:create` (then remove `ADMIN_PASSWORD`).
5. Run `npm start` under PM2/systemd (`PORT=3000`), with `INTERNAL_SCHEDULER=true` for scheduled
   posts, and proxy Nginx → `127.0.0.1:3000` with HTTPS (Let's Encrypt). Set
   `client_max_body_size 25m;` so media uploads are not truncated.

**Serverless / PaaS (Vercel, Render, Railway, Fly):** use managed PostgreSQL, `STORAGE_DRIVER=s3`
(the filesystem is ephemeral), run `npm run db:deploy` as a release step, and configure an external
cron (below). Do **not** use `STORAGE_DRIVER=local` on an ephemeral filesystem — uploads would be lost
on redeploy.

## 8. Scheduled publishing

Scheduled posts are promoted by `GET|POST /api/cron/publish` with header
`Authorization: Bearer $CRON_SECRET`. Pick one trigger:

- **Long-running server:** `INTERNAL_SCHEDULER=true` — the server calls the endpoint every minute.
- **Vercel Cron:** add a cron job hitting `/api/cron/publish` every minute (Vercel sends
  `Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is set).
- **System cron / uptime monitor:**

  ```bash
  curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://yourdomain/api/cron/publish
  ```

Publishing happens on the server whether or not anyone has the dashboard open, and refreshes the
affected public pages.

## 9. Email delivery

Inquiries are **always saved first**; the notification is sent afterwards to *Settings → Contact →
Inquiry notification email* (or the public email). Delivery status (`sent`, `failed`, `skipped`) and
the provider's error are shown on each inquiry with a **Retry notification** button.

- SMTP: `EMAIL_DRIVER=smtp`, `SMTP_HOST`, `SMTP_PORT` (587 STARTTLS or 465 with `SMTP_SECURE=true`),
  `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`.
- Resend: `EMAIL_DRIVER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` (verified domain).

## 10. Media storage

- Accepted: JPEG, PNG, WebP, GIF, AVIF and PDF. **SVG is rejected** (it can carry script).
- Every file is validated on the server: allowed extension, decoded content must match the extension
  and declared type, size limit, pixel limit. Client MIME types are never trusted.
- Images are re-encoded (EXIF/GPS stripped) and WebP variants (320/768/1280/1920 px) are generated;
  pages use them via `srcset`.
- `local` files are served by `/media/...` with immutable caching and a restrictive CSP;
  `s3` files are served from `S3_PUBLIC_URL` (make the bucket/CDN publicly readable).

## 11. Backups & restore

**Database** (contains all content, settings, inquiries and media metadata):

```bash
pg_dump --format=custom --no-owner "$DATABASE_URL" -f backup-$(date +%F).dump
```

```bash
pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backup-2026-10-30.dump
```

**Media files:** back up `LOCAL_STORAGE_DIR` (e.g. `rsync -a /var/lib/isaac/uploads/ backup/`) or
enable bucket versioning/replication for S3. Database and media backups should be taken together so
references stay consistent. Schedule both daily and test a restore periodically.

## 12. Security summary

- Server-side session validation in every dashboard layout, server action and route handler;
  `proxy.ts` only adds an early redirect.
- Role-ready permission checks (`ADMIN` today; `EDITOR` reserved) in `src/lib/permissions.ts`.
- Server Actions use Next's Origin/Host checks; the upload route enforces same-origin + session;
  Better Auth checks trusted origins.
- Zod validation on every input; Prisma (parameterised) for all queries.
- Rich text is stored as structured JSON and rendered through an allowlist renderer — no raw HTML;
  links limited to http(s)/mailto/tel/relative; embeds limited to YouTube (privacy mode) and Vimeo.
- Contact form: honeypot, signed timing token, per-IP (hashed) rate limit, consent required.
- Drafts, previews, inquiries and notes never reach public queries, the sitemap or public APIs;
  `/admin` and `/api` are `noindex` and disallowed in robots.txt.
- Security headers (nosniff, frame options, referrer and permissions policy).

## 13. Project structure

```
prisma/                 schema, migrations, idempotent seed
scripts/                local PostgreSQL runner, admin provisioning CLI
src/app/(site)/         public pages
src/app/admin/          login + dashboard modules (each with server actions)
src/app/api/            auth, uploads, preview, cron, view counter
src/components/         site, homepage sections, admin UI kit, editor, media picker
src/lib/                auth, session, db, cache, storage, media, email, validation, rich text, SEO
src/server/queries/     cached public read models (published content only)
src/server/services/    domain logic for mutations (used by actions and tests)
tests/                  Vitest (unit/integration) and Playwright (e2e)
public/brand/           supplied logo assets
```

## 14. Known limitations / needs your input

- **Contact details** were not present in the supplied brief, so none were invented. Add them in
  *Settings → Contact* (or via `SEED_CONTACT_*` before seeding).
- **Portrait/photos, projects and articles:** none are seeded (no clients, URLs or statistics were
  invented). Upload a portrait to the homepage hero and About page and add real projects/posts.
- **Skills** are seeded from the stated professional focus; review them in *Admin → Skills*.
- Email delivery and S3 storage need your provider credentials; they are implemented but were only
  tested with the console driver and local storage.
- One administrator account is supported in the UI; extra roles are prepared in the authorization
  layer but have no management screen yet.
