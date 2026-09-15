import { NextRequest, NextResponse } from "next/server";
import { runLeadFollowUpScheduler } from "@/lib/automations/scheduler";

/**
 * Protected scheduler endpoint for the Day 3-5 / Day 10 / Nurture lead
 * follow-up automation (spec production-readiness item 1).
 *
 * Not protected by the EA's session cookie — a cron caller has no session.
 * Instead, protected by a shared secret (`CRON_SECRET`) checked against the
 * `Authorization: Bearer <CRON_SECRET>` header. This is the header Vercel
 * Cron sends automatically when `CRON_SECRET` is set as an env var on the
 * project (see vercel.json + README "Deploying the scheduler"). Any other
 * scheduler (GitHub Actions, cron-job.org, a Railway/Render cron service,
 * etc.) can call this the same way — it's just an authenticated HTTP
 * endpoint, not Vercel-specific.
 *
 * GET is the primary method because Vercel Cron invokes cron jobs with GET.
 * POST is accepted too for manual/external triggering.
 */
async function handle(req: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    // Fail closed: an unconfigured secret must never be treated as "no auth
    // required" — that would let anyone trigger automation runs.
    return NextResponse.json(
      { error: "Scheduler is not configured: CRON_SECRET is not set." },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runLeadFollowUpScheduler();
    return NextResponse.json({ ok: true, summary }, { status: summary.status === "error" ? 500 : 200 });
  } catch (err) {
    // Defense in depth: runLeadFollowUpScheduler already isolates per-lead
    // failures, so reaching here means something broke outside that loop
    // (e.g. the initial lead query). Never leak internals to the response.
    const message = err instanceof Error ? err.message : "Unknown scheduler error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
