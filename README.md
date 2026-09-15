# EA CRM — Private Client Operations Hub

A private CRM / operations command center for a freelance Executive Assistant managing multiple confidential clients. Built to spec (see `EA_CRM_Master_Build_Prompt.md`) — see [Known Limitations](#known-limitations--unfinished-integrations) below for what still needs real credentials.

## Tech Stack

- **Next.js 16** (App Router, Turbopack, Server Actions) + TypeScript
- **Prisma 6** + **SQLite** for local/demo use — see [Moving to Postgres/Supabase](#moving-to-postgressupabase) to go to production
- **Tailwind CSS 4** for styling
- Cookie-based session auth (`jose` for signed JWT cookies, `bcryptjs` for password hashing) — no external auth provider needed for the single EA user in V1
- **googleapis** for real Google Calendar/Drive/Gmail once OAuth is connected (mock mode has no dependency on it)
- **Vitest** for the test suite

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill it in:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` — leave as `file:./dev.db` for local use.
   - `EA_LOGIN_EMAIL` — the email you'll log in with.
   - `EA_LOGIN_PASSWORD_HASH` — generate with `node scripts/hash-password.js "your-password"`. The script prints an already-escaped value — **paste it exactly as printed**. (Next.js expands `$VAR` in `.env` files, which corrupts a raw bcrypt hash full of `$2b$10$...` — the escaped `\$` form avoids that.)
   - `AUTH_SECRET` — any long random string, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   - Leave the Google/Gmail variables blank and `AUTOMATIONS_TEST_MODE=true` to run fully in mock mode (see [Integrations](#integrations--known-limitations)).

3. Create the database and run migrations:

   ```bash
   npx prisma migrate dev
   ```

4. Seed demo data (fictional workspaces, leads, clients, tasks, etc.):

   ```bash
   npm run db:seed
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) and log in with the email/password you configured.

## Scripts

| Command             | What it does                                      |
| -------------------- | -------------------------------------------------- |
| `npm run dev`         | Start the dev server (Turbopack)                    |
| `npm run build`       | Production build                                    |
| `npm run start`       | Run the production build                            |
| `npm run lint`        | ESLint                                              |
| `npm test`            | Run the Vitest test suite (spins up an isolated test SQLite DB) |
| `npm run db:migrate`  | Run/create Prisma migrations                        |
| `npm run db:seed`     | Re-seed demo data                                   |
| `npm run db:studio`   | Open Prisma Studio to browse the database           |

## Architecture

- `prisma/schema.prisma` — the full data model (workspaces, contacts, leads, clients, tasks, meetings, content, packages, invoices, payments, time entries, files, activity log, automation log, email templates, settings). Every client-specific table carries a `workspaceId` foreign key.
- `src/lib/workspace.ts` — the single choke point for workspace scoping (`workspaceScope()`). Every list/detail query goes through this so client data can't leak across workspaces (see [Security](#security)).
- `src/lib/automations/` — Day 0 / Day 3-5 / Day 10 lead automation, the scheduler that runs it unattended (`scheduler.ts`), lead→client conversion, and the website lead-intake handler. All idempotent (safe to re-run) and logged to the `AutomationRun` table.
- `src/lib/integrations/` — service-layer abstractions for Google Calendar, Drive, and Gmail (`google-calendar.ts`, `google-drive.ts`, `gmail.ts`, `email.ts`), OAuth/token handling (`google-oauth.ts`), and env-based config checks (`types.ts`). Each integration runs in a clearly-labeled **mock mode** until real credentials are configured *and* connected — the rest of the app never has to know the difference.
- `src/app/(app)/` — the authenticated app shell (sidebar, workspace switcher, global search) and one route per module (Dashboard, Leads, Clients, Tasks, Calendar, Content, Billing, Time, Settings).
- `src/app/login/`, `src/proxy.ts` — auth pages and the route-protection proxy (Next.js 16's replacement for `middleware.ts`).
- `src/app/api/lead-intake/route.ts` — the public webhook the marketing website's form posts to.
- `src/app/api/cron/lead-followups/route.ts` — the protected scheduler endpoint (see "Deploying the scheduler").
- `src/app/api/integrations/google/{authorize,callback}/route.ts` — the Google OAuth flow (session-protected, CSRF-protected via `state`).

## Security

- Session auth via signed, httpOnly cookies (see `src/lib/auth.ts`); all app routes are protected by `src/proxy.ts` except `/login`, the lead-intake webhook, and the cron endpoint (which has its own independent bearer-secret check instead, since an external scheduler has no session cookie).
- Every query that lists or loads client-specific records is scoped through `workspaceScope()` — see `tests/security.test.ts` for isolation tests, including one that proves a record can't be fetched by ID through the wrong workspace.
- No third-party API secrets are ever sent to the browser — external calls happen only in server code (`src/lib/integrations/`, server actions, route handlers).
- Google OAuth tokens live only in the server-side `IntegrationCredential` table, never in a cookie or client bundle; the OAuth `state` parameter is checked against a short-lived httpOnly cookie to prevent CSRF (`tests/oauth-callback.test.ts`).
- The cron endpoint fails closed (`503`) if `CRON_SECRET` is unset, rejects any request without the exact matching `Authorization: Bearer` header (`401`), and never echoes the secret back in a response (`tests/cron-endpoint.test.ts`).
- API error responses (Google API failures, cron auth failures) return only a short message, never raw provider errors, stack traces, or token values.
- If/when you move to Postgres/Supabase, Row Level Security is documented as an optional defense-in-depth layer — see below (it isn't the primary access control, since there's no direct client-side DB access in this app).

## Integrations & Known Limitations

Per the build spec, integrations that need real credentials are built as a full interface + mock/test mode, not faked as "working". As of the production-readiness pass, Calendar/Drive/Gmail all have **real** implementations behind Google OAuth — they just need real credentials and a completed consent flow to switch from Mock to Connected.

| Integration | Mock mode (default) | Once connected |
| --- | --- | --- |
| **Google Calendar / Meet** | Fake event ID + fake Meet link (`src/lib/integrations/google-calendar.ts`) | Creates a real Calendar event with a real Google Meet conference; can fetch/sync an event's live status ("Sync from Google" on a meeting) |
| **Google Drive** | Fake root-folder link (`src/lib/integrations/google-drive.ts`) | Creates (or reuses, idempotently) the client's root folder and the 6 standard subfolders via the Drive API |
| **Gmail sending** | Logged to `AutomationRun`, nothing sent (`src/lib/integrations/email.ts` → `gmail.ts`) | Sends the real email via the Gmail API as the connected account; a rejected send is recorded as `error`, never as a false `success` |
| **Lead follow-up scheduler** | Available in mock or live mode — it only affects whether emails are mocked | A protected endpoint (`GET/POST /api/cron/lead-followups`) runs Day 3-5 / Day 10 / Nurture on a schedule — see "Deploying the scheduler" below |

Check **Settings → Integration Settings** and **Settings → Lead Follow-up Scheduler** in the app for live status (Mock/Connected/Disconnected/Error, and Configured/Last Run/Last Successful Run/Last Failure).

Other things intentionally **not built** in V1, per the spec's scope control (section 32): client portal, team/multi-user accounts or RBAC, a full email inbox, WhatsApp/Slack replacements, a real payment processor, a full Canva/CapCut editor, AI features, and advanced reporting. The data model and service-layer pattern are designed so these can be added later without a rewrite.

### Google Cloud setup (required before any of the three integrations can go live)

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or reuse) a project.
2. **APIs & Services → Library** — enable the **Google Calendar API**, **Google Drive API**, and **Gmail API**.
3. **APIs & Services → OAuth consent screen** — set up an "External" (or "Internal" if using Google Workspace) consent screen. Since there's exactly one EA user in V1, add that Google account as a **test user** if the app stays in "Testing" publishing status (avoids needing Google's app-verification review).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type **Web application**.
   - Add an **Authorized redirect URI** that exactly matches `GOOGLE_REDIRECT_URI` in your `.env` (e.g. `https://your-app.vercel.app/api/integrations/google/callback` in production, or `http://localhost:3000/api/integrations/google/callback` locally).
5. Copy the generated **Client ID** and **Client Secret** into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
6. Set `GMAIL_SENDER_ADDRESS` to that same Google account's email address.
7. Set `AUTOMATIONS_TEST_MODE="false"` when you're ready for real sends/events/folders (leave it `"true"` for staging smoke-tests even with real credentials configured).
8. In the running app: **Settings → Integration Settings → Connect Google**, sign in, and grant the requested Calendar/Drive/Gmail-send scopes. Settings will flip to **Connected**.

Tokens are stored server-side only, in the `IntegrationCredential` table (`src/lib/integrations/google-oauth.ts`) — never in a cookie, never sent to the browser. The OAuth `state` parameter is CSRF-protected via a short-lived httpOnly cookie (see `tests/oauth-callback.test.ts`).

### Deploying the scheduler

The Day 3-5 / Day 10 / Nurture lead follow-up logic (`runLeadFollowUpCheck`) always existed and is fully idempotent, but it previously only ran when someone opened a lead and clicked "Run automation check". `src/lib/automations/scheduler.ts` + `GET/POST /api/cron/lead-followups` now let it run unattended:

1. Set `CRON_SECRET` in your production environment (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`).
2. **If deploying to Vercel** (the default assumption — no other deployment config existed in this project): `vercel.json` already defines an hourly cron hitting `/api/cron/lead-followups`. Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on cron-triggered requests once `CRON_SECRET` is set as a project env var — no extra wiring needed. Cron Jobs require a paid Vercel plan for schedules more frequent than once/day; adjust `vercel.json`'s `schedule` if you're on the Hobby plan.
3. **Any other host**: point any scheduler at the same URL with the same header — for example a GitHub Actions workflow:
   ```yaml
   on:
     schedule:
       - cron: "0 * * * *"
   jobs:
     lead-followups:
       runs-on: ubuntu-latest
       steps:
         - run: |
             curl -sf -X POST https://your-app.example.com/api/cron/lead-followups \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
   ```
   or a Railway/Render cron job, or any free service like cron-job.org — it's a plain authenticated HTTP endpoint, not Vercel-specific.
4. Until a scheduler is wired up, run it manually — **Settings → Lead Follow-up Scheduler → Run Scheduler Now** — or per-lead via "Run automation check" on the lead detail page, exactly as before.

The endpoint fails closed: if `CRON_SECRET` isn't set at all, every request gets `503` (never silently "no auth required"). Every run writes one summary `AutomationRun` (visible in Settings as Last Run / Last Successful Run / Last Failure) plus the existing per-lead automation logs; a single lead's failure is retried once and then isolated — it can't abort the rest of the batch (see `tests/scheduler.test.ts`).

## Moving to Postgres/Supabase

The schema was already written to be portable, and the production-readiness review found exactly one real SQLite-vs-Postgres behavior difference (see below) — otherwise no SQLite-only types, no raw SQL, and no auto-increment IDs (cuids are used everywhere) are in play.

**What needs to change:**

1. In `prisma/schema.prisma`, change the datasource `provider` from `"sqlite"` to `"postgresql"`.
2. Set `DATABASE_URL` to your Postgres/Supabase connection string (include `?sslmode=require` for most managed Postgres).
3. Delete the SQLite-generated `prisma/migrations/` folder (SQLite and Postgres migrations aren't interchangeable) and run `npx prisma migrate dev --name init` to generate a fresh Postgres migration from the current schema.
4. Run `npx prisma generate` and redeploy.
5. **The one code-level difference**: SQLite's `LIKE` (what Prisma's `contains` compiles to) is case-insensitive for ASCII by default; Postgres's isn't unless you pass `mode: "insensitive"`. `src/lib/search.ts`'s `caseInsensitiveContains()` helper already handles this — it detects a Postgres `DATABASE_URL` and adds `mode: "insensitive"` automatically, so global search behaves the same on both databases with no further changes needed.
6. Re-run `npm run db:seed` against the new database if you want the fictional demo data there too (optional — skip for a real production database).

**Row Level Security (Supabase):** every application query goes through Prisma running server-side (Server Components, Server Actions, API routes) using a single Postgres connection — there is no direct client-side Supabase JS access to the database, so Postgres RLS is a defense-in-depth measure here, not the primary access control (the primary control is `workspaceScope()` plus the cookie-session check in `src/proxy.ts`). If you still want RLS as a second layer:

```sql
-- Enable RLS on every client-scoped table, e.g.:
alter table "Lead" enable row level security;

-- Since there is exactly one EA user (V1) with no direct client-side DB
-- access, the simplest correct policy is "server role only":
create policy "server_only" on "Lead"
  using (auth.role() = 'service_role');
```
Repeat for `Contact`, `Client`, `Task`, `Meeting`, `ContentItem`, `Package`, `ClientPackage`, `Invoice`, `Payment`, `TimeEntry`, `FileAsset`, `Activity`, `AutomationRun`. If/when the multi-user roadmap (spec section 42) is built, replace the `service_role`-only policy with one that checks `workspace_id` against the requesting user's assigned workspaces — the schema's `workspaceId` column on every table is already exactly what such a policy would filter on.

## Testing

`npm test` runs the full suite against an isolated SQLite file (`tests/test.db`, created and torn down automatically) — it never touches your dev database. Covers, per the spec's testing requirements: lead creation + duplicate-contact handling + status transitions, Day 0/3-5/10 automation + idempotency + nurture transition, lead→client conversion + contact/history preservation + onboarding tasks, task due-date/overdue/waiting logic, invoice total/partial-payment/balance/overdue calculation, timer duration + manual edits + weekly/monthly totals, workspace isolation / unauthorized cross-workspace access, the scheduler (Day 3-5/Day 10/Nurture end to end, idempotency, per-lead failure isolation), the cron endpoint's auth (missing/wrong/correct secret, fail-closed when unconfigured, never echoes the secret), Google integrations in mock mode, and the OAuth callback's CSRF `state` check.

## Seed Data

`npm run db:seed` creates two fictional demo workspaces ("Demo Client A", "Demo Client B") with 5 leads, 3 clients, 8 tasks, 4 meetings, 6 content items, 3 invoices, 3 payments, and several time entries — all clearly fictional, no real people or sensitive data.
