/**
 * Standalone entry point for the Railway Cron Job that runs the lead
 * follow-up scheduler (Day 3-5 / Day 10 / Nurture — spec production-
 * readiness item 1, Railway items 6-7).
 *
 * Deliberately NOT an HTTP call into the running web service: Railway Cron
 * Jobs are their own one-off process that must exit when done, not stay
 * running — this script calls the existing, already-idempotent
 * runLeadFollowUpScheduler() directly against the database and exits.
 * The protected /api/cron/lead-followups HTTP endpoint is untouched and
 * still works for manual/external triggering; this script is simply the
 * Railway-native way to run the same logic on its own schedule.
 *
 * Usage: `npm run cron:lead-followups` (Railway Cron Job start command).
 * Requires the same DATABASE_URL as the web service, generated against the
 * PostgreSQL schema (prisma/postgresql/schema.prisma) — see
 * RAILWAY_DEPLOYMENT.md "Cron configuration".
 */
import { runLeadFollowUpScheduler } from "../src/lib/automations/scheduler";

async function main() {
  const summary = await runLeadFollowUpScheduler();
  console.log(JSON.stringify({ ok: true, summary }));
  process.exit(summary.status === "error" ? 1 : 0);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
