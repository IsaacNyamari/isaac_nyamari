# Implementation Plan

Single Next.js (App Router) application containing the public site, the `/admin` CMS, route
handlers for uploads/cron/preview, and the data layer. One PostgreSQL database.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Components first), React 19, TypeScript strict |
| Styling | Tailwind CSS v4 + design tokens in CSS custom properties |
| Animation | Motion for React (hero stagger, reveals, page fade); CSS transitions for hover states |
| Icons | lucide-react (service icons restricted to an allowlist) |
| Database | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`), versioned migrations |
| Local DB | `embedded-postgres` (real PostgreSQL binaries, initialised as UTF-8) so dev, tests and production share one dialect |
| Auth | Better Auth (email + password, scrypt hashing, DB sessions, http-only cookies, origin checks, built-in rate limiting), sign-up disabled |
| Rich text | Tiptap 3, stored as ProseMirror JSON, rendered by a server-side allowlist renderer (no HTML strings) |
| Validation | Zod 4 on every server action / route handler |
| Images | sharp: EXIF strip, WebP variants (320/768/1280/1920), dimensions |
| Storage | `StorageDriver` interface: `local` (dev, persistent disk) and `s3` (S3/R2/MinIO compatible) |
| Email | `EmailDriver` interface: `smtp` (nodemailer), `resend` (HTTP API), `console` (dev) |
| Toasts | sonner |
| Tests | Vitest (integration against a real test database) + Playwright (browser journeys) |

## Public routes

`/`, `/about`, `/services`, `/services/[slug]`, `/projects`, `/projects/[slug]`, `/insights`,
`/insights/[slug]`, `/insights/category/[slug]`, `/insights/tag/[slug]`, `/contact`, `/privacy`,
`/search`, `/[slug]` (other managed pages), `/sitemap.xml`, `/robots.txt`, `opengraph-image`,
custom `not-found`, `error`, `loading`.

## Admin routes

`/admin/login`, `/admin` (overview), `/admin/posts` (+ `new`, `[id]`), `/admin/taxonomy`
(categories & tags), `/admin/media`, `/admin/projects` (+ `new`, `[id]`, categories),
`/admin/services` (+ `new`, `[id]`), `/admin/pages` (+ `new`, `[id]`), `/admin/pages/homepage`,
`/admin/skills`, `/admin/navigation`, `/admin/settings`, `/admin/inquiries` (+ `[id]`),
`/admin/account` (change password).

Route handlers: `/api/auth/[...all]` (Better Auth), `/api/admin/media` (upload/replace),
`/api/preview` + `/api/preview/exit`, `/api/cron/publish`, `/media/[...key]` (local storage serving).

## Data model (Prisma)

`AdminUser`, `Session`, `Account`, `Verification`, `RateLimit` (Better Auth) ·
`Post`, `PostRevision`, `Category`, `Tag`, `PostTag`, `PostRelation` · `Project`,
`ProjectCategory` (m2m), `ProjectImage` (gallery) · `Service` · `Page`, `PageRevision` ·
`HomeSection` (state = DRAFT | LIVE) · `MediaAsset` · `Skill` · `NavigationMenu`, `NavigationItem` ·
`SiteSettings` (singleton) · `ContactInquiry`, `InquiryNote` · `Redirect` · `RateLimitBucket`.

Key rules:
- `ContentStatus = DRAFT | SCHEDULED | PUBLISHED | ARCHIVED`; public queries always filter
  `status = PUBLISHED AND publishedAt <= now()`.
- Published items keep their live columns; "Save draft" on a published item writes to
  `pendingChanges` (JSON) so the live page is untouched until "Update". Preview merges pending changes.
- `version` integer on editable content for optimistic concurrency (stale saves are rejected).
- Media FKs use `onDelete: Restrict`; usage checks also scan rich-text JSON and section configs.
- Published slug changes create a `Redirect` row; detail pages consult it before returning 404.

## Authentication & authorization

- Better Auth with Prisma adapter; `disableSignUp: true`; first admin created by
  `npm run admin:create` using `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars (no seeded default password).
- `requireAdmin()` validates the session server-side in every admin layout, server action and
  route handler. `/admin` layout redirects to login; `proxy.ts` adds a cheap cookie pre-check only.
- Roles: `AdminUser.role` (`ADMIN` now; `EDITOR` reserved). `can(user, permission)` centralises checks.
- CSRF: Server Actions are POST-only with Next's Origin/Host check; Better Auth checks
  trusted origins; the upload/preview handlers verify `Origin` and session.
- Rate limiting: Better Auth limiter on `/sign-in/email` (5 per minute, DB storage); contact form
  limited per hashed IP in `RateLimitBucket`.
- Password change in `/admin/account`; reset by CLI (`npm run admin:reset-password`).

## Media & upload security

Accepted: JPEG, PNG, WebP, GIF, AVIF (verified by sharp decoding the bytes) and PDF (magic bytes).
SVG is rejected (no safe sanitiser is configured). Extension, declared MIME and detected content must
agree; size limit `MEDIA_MAX_UPLOAD_MB` (default 10). Files are renamed to random keys. Images are
re-encoded (EXIF stripped) with WebP variants.

## Caching & revalidation

Next.js 16 is used without `cacheComponents` (the "previous model" in the bundled docs). Public route
segments render at request time; their data comes from `unstable_cache` wrappers tagged by
content type (`posts`, `projects`, `services`, `pages`, `home`, `settings`, `nav`, `skills`,
`media`). Every mutation calls `invalidate(...tags)`, which runs `revalidateTag(tag, { expire: 0 })`
(immediate expiry) and revalidates the root layout. Public pages deliberately have no `loading.tsx`
so `notFound()` still produces a real HTTP 404. The scheduled publisher calls the same function. Preview (Next
`draftMode` + a server-side session check) bypasses the cache.

## Scheduling

`/api/cron/publish` (Bearer `CRON_SECRET`) promotes due `SCHEDULED` posts to `PUBLISHED` and
invalidates. Two triggers: an external cron (Vercel Cron / system cron / uptime pinger every minute),
or the in-process interval started from `instrumentation.ts` when `INTERNAL_SCHEDULER=true`
(long-running Node servers).

## Email

Inquiry saved first, then notification sent; `emailStatus` (`SENT`/`FAILED`/`SKIPPED`) and
`emailError` stored and shown in the dashboard with a "Retry notification" action.

## Environment variables

See `.env.example`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SITE_URL`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `STORAGE_DRIVER`, `LOCAL_STORAGE_DIR`, `S3_*`,
`MEDIA_MAX_UPLOAD_MB`, `EMAIL_DRIVER`, `SMTP_*`, `RESEND_API_KEY`, `EMAIL_FROM`,
`INQUIRY_NOTIFY_TO`, `CRON_SECRET`, `INTERNAL_SCHEDULER`, `SEED_CONTACT_EMAIL`,
`SEED_CONTACT_PHONE`, `SEED_CONTACT_WHATSAPP`.

## Contact details — open item

The brief says to use contact details "already specified in the supplied project requirements",
but no email, telephone or WhatsApp value appears in the supplied text. Nothing is invented: the
seed reads `SEED_CONTACT_*` env vars if present and otherwise leaves the fields empty; the public site
hides unset channels and the dashboard shows a warning until they are entered in Settings.

## Testing strategy (run once at the end)

- Vitest integration suite against a dedicated `isaac_test` database: auth guards, validation,
  post lifecycle and visibility, taxonomy, slugs and redirects, media validation and usage checks,
  homepage section ordering, inquiries and email-failure handling, scheduled publishing.
- Playwright: login, create and publish a post and see it publicly, contact form submission,
  unauthorised access redirect, mobile navigation.
- `tsc --noEmit`, ESLint, `prisma migrate deploy`, `next build`.

## Deployment

Any Node 20+ host (VPS with PM2/systemd behind Nginx, Railway, Render, Fly) with managed
PostgreSQL and S3-compatible storage. Vercel works with `STORAGE_DRIVER=s3` and Vercel Cron.
