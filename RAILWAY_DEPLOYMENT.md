# Deploying EA CRM to Railway

This is a step-by-step guide for deploying the EA CRM to **your own Railway account**. It assumes no prior Railway experience — every step says exactly what to click.

You will create **three things** inside one Railway project:

1. A **PostgreSQL** database (Railway provides this as a one-click service)
2. A **web service** running the CRM itself
3. A **Cron Job** that automatically runs the lead follow-up scheduler on a schedule

Nothing in this repository is configured to talk to any Railway account automatically — you do every step below yourself, inside your own Railway dashboard.

---

## Architecture

```
Railway Project: "ea-crm" (you create this)
│
├── PostgreSQL service          ← Railway creates this for you (one click)
│     Holds all application data (leads, clients, tasks, etc.)
│
├── Web service ("ea-crm-web")  ← runs the CRM app itself, always on
│     Build:  npm run railway:build
│     Start:  npm run railway:start   (applies DB migrations, then serves the app)
│     Health check: GET /api/health
│
└── Cron Job ("ea-crm-scheduler")  ← runs on a schedule, then stops
      Start: npm run cron:lead-followups
      Runs the Day 3-5 / Day 10 / Nurture lead follow-up logic, then exits.
      This does NOT run a copy of the web server — it's a separate,
      short-lived process that does one thing and stops.
```

Both the web service and the cron job read from the **same PostgreSQL database** and the **same set of secrets**, which you set once and share between them (Railway makes this easy with "variable references" — see below).

---

## Required Variables

Set these in Railway (not in any file you commit). See "Environment Variables" further down for exactly where to enter them.

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | Web, Cron | Set to `${{Postgres.DATABASE_URL}}` (a reference to your Railway Postgres service — Railway fills in the real value) |
| `AUTH_SECRET` | Web | Random string; signs login session cookies |
| `EA_LOGIN_EMAIL` | Web | The email you'll log in with |
| `EA_LOGIN_PASSWORD_HASH` | Web | Bcrypt hash of your login password (see "First-login setup") |
| `CRON_SECRET` | Web | Protects the manual-trigger endpoint `/api/cron/lead-followups` (the Cron Job itself doesn't need this — see "Cron configuration") |
| `AUTOMATIONS_TEST_MODE` | Web, Cron | `"true"` = mock emails/Calendar/Drive (safe); `"false"` = real sends |
| `GOOGLE_CLIENT_ID` | Web | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Web | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | Web | Your Railway domain + `/api/integrations/google/callback` |
| `GMAIL_SENDER_ADDRESS` | Web, Cron | The Google account address emails send "from" |
| `BOOKING_LINK_URL` | Web | Your real consultation booking link |

None of these have real values in this repository — `.env.example` documents them with placeholders only.

---

## Database Setup

1. In your Railway account, click **New Project** → name it `ea-crm` (or anything you like).
2. Inside the project, click **+ New** → **Database** → **Add PostgreSQL**. Railway provisions it immediately — nothing to configure.
3. Click into the new Postgres service → **Variables** tab → confirm it has a `DATABASE_URL` (Railway sets this automatically). You'll reference this from the other two services; you never need to type it out yourself.

---

## Web Service Setup

1. In the same project, click **+ New** → **GitHub Repo** (or **Empty Service** + deploy from your Git provider / CLI — however you host this repo) and select the `ea-crm` repository.
2. Once created, open the service → **Settings** tab:
   - **Build Command**: `npm run railway:build`
   - **Start Command**: `npm run railway:start`
   - **Healthcheck Path**: `/api/health`
   (Railway auto-detects Node.js/Next.js via Nixpacks; these overrides just point it at the Postgres-specific scripts instead of the plain `build`/`start` scripts, which stay SQLite-oriented for your local machine.)
3. **Variables** tab → add every variable from the "Required Variables" table above, scoped to this service. For `DATABASE_URL`, click the "reference" option and pick your Postgres service's `DATABASE_URL` (or type `${{Postgres.DATABASE_URL}}` — replace `Postgres` with whatever you named that service if you renamed it).
4. **Settings → Networking** → click **Generate Domain** to get a public `https://your-app.up.railway.app` URL. This is "your Railway domain" referenced elsewhere in this guide.
5. Click **Deploy**. Railway will: install dependencies → run `npm run railway:build` (generates the Postgres-targeted Prisma client, then builds Next.js) → run `npm run railway:start` (applies any pending database migrations, then starts the app) → check `/api/health` until it responds, then mark the deploy healthy.

### Why the start command applies migrations

`railway:start` is `npm run postgres:migrate:deploy && next start`. `prisma migrate deploy` applies any migrations from `prisma/postgresql/migrations/` that haven't been applied yet, then exits — it's safe to run on every deploy (it does nothing if there's nothing new to apply). This means every deploy keeps the database schema in sync automatically, without a separate manual step.

---

## Migration Commands

These are the exact commands involved (you don't need to run them yourself — Railway runs them via the build/start commands above — but here's what's actually happening, and how to run one manually if you ever need to):

| Command | What it does |
|---|---|
| `npm run postgres:generate` | Generates the Prisma Client targeting PostgreSQL (uses `prisma/postgresql/schema.prisma`) |
| `npm run postgres:migrate:deploy` | Applies all pending migrations from `prisma/postgresql/migrations/` — safe to re-run |
| `npm run postgres:migrate:dev` | Creates a **new** migration after you change a model (only run this locally against a real Postgres, never in production) |
| `npm run postgres:studio` | Opens Prisma Studio against PostgreSQL (point `DATABASE_URL` at your Railway Postgres first, e.g. via `railway run`) |

**If you run any `postgres:*` command on your own machine** (not inside Railway's build), run `npm run dev:restore-sqlite-client` afterward — these commands regenerate the one shared `node_modules/@prisma/client`, which overwrites the SQLite-targeted client your local `npm run dev` / `npm test` need. See README.md "Local + Production Database Support" for why.

If you ever need to run one manually against your Railway database from your own machine, install the Railway CLI, run `railway link` to connect to your project, then prefix any command with `railway run`, e.g.:
```bash
railway run npm run postgres:migrate:deploy
```

---

## Cron Configuration

1. In the same Railway project, click **+ New** → **Empty Service** (or redeploy the same repo as a second service — either works since it's the same codebase).
2. Rename it to something like `ea-crm-scheduler`.
3. **Settings** tab:
   - **Build Command**: `npm run postgres:generate` (only needs the Prisma client, not a full Next.js build)
   - **Start Command**: `npm run cron:lead-followups`
   - Scroll to **Cron Schedule** and enable it (see "Cron Schedule" section below for the exact value).
4. **Variables** tab → add `DATABASE_URL` (same reference as the web service), `AUTOMATIONS_TEST_MODE`, and `GMAIL_SENDER_ADDRESS` / Google variables if you want real Gmail sends from the scheduler's automated follow-up emails. `CRON_SECRET` is **not** needed by this service — it only runs when Railway's own scheduler triggers it, which is not an HTTP call and has nothing to authenticate.
5. Deploy it once manually (Railway's UI has a "Deploy" button) to confirm it builds and the start command exits cleanly (check the deploy logs — you should see one line of JSON like `{"ok":true,"summary":{...}}` and then the process stopping). After that, it will only run on its configured schedule.

**Important — this is a Cron Job, not a web service**: `npm run cron:lead-followups` runs `scripts/run-scheduler.ts`, which calls the scheduler once and calls `process.exit()` when done. It never starts `next start` and never listens on a port. Do not point Railway's healthcheck at this service (it isn't a persistent server) and do not accidentally set its Start Command to `npm run railway:start` — that would try to run the web app inside what's supposed to be a one-shot job.

---

## Cron Schedule

The business rule is: follow up 3-5 days after a lead's created, send a final follow-up (and move to Nurture) after 10 days. The scheduler doesn't need to fire at an exact minute — it checks each lead's actual age every time it runs and only acts on leads that are actually due, so running it more often than strictly necessary is harmless (it's fully idempotent — see `tests/scheduler.test.ts`).

**Recommended schedule**: `0 * * * *` (hourly, on the hour).

**Railway cron schedules are in UTC.** `0 * * * *` fires at the top of every hour UTC — e.g. that's 12:00am, 1:00am, 2:00am... Eastern Standard Time (UTC-5) or 9:00pm, 10:00pm... Pacific Standard Time (UTC-8) shifted by your offset from UTC. Since the automation only cares about whole days elapsed, an hourly cadence in any timezone will always catch a lead within about an hour of becoming due — which is more than adequate for a 3-to-10-day business rule.

If you'd rather run once a day, use `0 13 * * *` (1:00pm UTC — mid-morning across US timezones) instead.

---

## Google OAuth Configuration

Google needs to know it's allowed to redirect back to your Railway domain after the EA signs in and grants access.

1. In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** → open your OAuth 2.0 Client ID (create one if you haven't — "Web application" type).
2. Under **Authorized redirect URIs**, add:
   ```
   https://<your-railway-domain>/api/integrations/google/callback
   ```
   Replace `<your-railway-domain>` with the exact domain from "Generate Domain" above (e.g. `ea-crm-production.up.railway.app`). You can keep the `http://localhost:3000/...` entry alongside it for local development — Google allows multiple redirect URIs on one client.
3. In Railway's web service **Variables**, set `GOOGLE_REDIRECT_URI` to that same `https://<your-railway-domain>/api/integrations/google/callback` value (must match exactly, including `https://`).
4. Enable the **Google Calendar API**, **Google Drive API**, and **Gmail API** for the project (APIs & Services → Library) if you haven't already.
5. On the **OAuth consent screen**, add the EA's Google account as a **test user** if the app is in "Testing" publishing status (this avoids needing Google's full app-verification review, since there's only one user).

---

## Gmail Configuration

1. Set `GMAIL_SENDER_ADDRESS` (in Railway's web service — and the cron service, if you want its automated emails sent for real too) to the exact Google account address that completes the OAuth consent below.
2. Once deployed, log into the CRM and go to **Settings → Integration Settings → Connect Google**, sign in with that account, and approve the Calendar/Drive/Gmail-send permissions.
3. Leave `AUTOMATIONS_TEST_MODE="true"` until you're ready for real sends — while it's `"true"`, Settings will show Gmail as "Test Mode" and no real email is ever sent, regardless of whether Google is connected.

---

## First-Login Setup

1. Generate your production login password hash **locally** (never type a real password into a shared/AI tool):
   ```bash
   node scripts/hash-password.js "your-real-password"
   ```
2. The script prints an already-escaped value like:
   ```
   EA_LOGIN_PASSWORD_HASH="\$2b\$10\$abc123..."
   ```
3. Copy that exact string into Railway's web service **Variables** as `EA_LOGIN_PASSWORD_HASH`, and set `EA_LOGIN_EMAIL` to your real email.
4. Once deployed, visit your Railway domain and log in with that email/password.

---

## Staging Testing (do this before trusting it with real client data)

With `AUTOMATIONS_TEST_MODE="true"` (the safe default):

1. Log in at your Railway domain.
2. **Settings** → confirm the page loads, shows Google Calendar/Drive as "Mock" and Gmail as "Test Mode", and the Lead Follow-up Scheduler section shows "Not Configured" or "Configured" correctly and "Never" for Last Run (until the cron job fires once).
3. Add a test lead (Leads → New Lead) with a fake name/email — confirm it appears, the Day 0 automation logs an activity entry, and a follow-up task is created.
4. In the cron service, trigger a manual deploy (or wait for its first scheduled run) and confirm its logs show a JSON summary and the process exits.
5. Back in the web app's Settings, confirm "Last Run" now shows a recent timestamp.
6. Click **Connect Google** and complete the OAuth consent screen — confirm Settings flips Calendar/Drive to "Connected" (Gmail stays "Test Mode" until you flip `AUTOMATIONS_TEST_MODE` off).
7. Delete the test lead/contact when done (there is no "seed fictional data into production" step in this guide on purpose — see below).

Do **not** run `npm run db:seed` (or its Postgres equivalent) against this database — that script creates clearly-fictional demo data meant only for local development, and should never populate a real deployment.

---

## Production Migration Considerations

- **Never run `prisma migrate dev` against the production database** — it's designed for iterative local development and can prompt for destructive resets. Production always uses `prisma migrate deploy` (which `railway:start` already runs automatically on every deploy).
- **Back up before a schema-changing deploy.** Railway's Postgres has a **Backups** tab (Settings → Backups) — take a manual snapshot before deploying a version that changes `prisma/postgresql/schema.prisma`.
- **Changing a model**: edit `prisma/schema.prisma` (SQLite, local) and `prisma/postgresql/schema.prisma` (Postgres) identically, run `npm run postgres:migrate:dev` against a real Postgres you control (a local Docker Postgres or a Railway staging database — never directly against production) to generate the new migration file, commit it, then deploy — `railway:start` applies it automatically.
- **Rolling back**: Prisma doesn't auto-generate down-migrations. If a migration needs to be undone, write the reverse SQL by hand and apply it manually (`railway run npx prisma db execute --schema=prisma/postgresql/schema.prisma --file=rollback.sql`), then restore from a backup if needed.

---

## Health Check

`GET /api/health` returns `{"status":"ok"}` (200) if the app is running and the database is reachable, or `{"status":"error"}` (503) otherwise. It never reveals credentials, connection strings, row counts, or any client data — Railway (or you, via `curl https://your-app.up.railway.app/api/health`) can use it to confirm the app is alive without exposing anything sensitive.

---

## Security Checklist (confirm before going live)

- [ ] `AUTH_SECRET` on Railway is a fresh value, not the one from your local `.env`
- [ ] `CRON_SECRET` on Railway is a fresh, unique value
- [ ] `EA_LOGIN_PASSWORD_HASH` is a real password hash, not the `changeme123` dev default
- [ ] No `.env` file, database file, or real credential is committed to the repository (`.gitignore` already covers this — see README "Security")
- [ ] `AUTOMATIONS_TEST_MODE` is `"true"` until you've completed Staging Testing above
- [ ] The Google OAuth redirect URI registered in Google Cloud Console matches your Railway domain exactly
