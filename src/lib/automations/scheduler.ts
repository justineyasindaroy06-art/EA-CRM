import { prisma } from "../prisma";
import { isTestMode } from "../integrations/types";
import { runLeadFollowUpCheck } from "./lead-automation";

const SCHEDULER_AUTOMATION_NAME = "lead_followup_scheduler";
const MAX_ATTEMPTS_PER_LEAD = 2;

interface LeadOutcome {
  leadId: string;
  attempts: number;
  ok: boolean;
  ran?: boolean;
  error?: string;
}

/**
 * Runs `runLeadFollowUpCheck` for one lead with a small retry (spec
 * production-readiness item 1: "must support retry behavior"). Safe to
 * retry because `runLeadFollowUpCheck` is itself idempotent — a retry after
 * a transient failure (e.g. a dropped DB connection) can't cause a
 * duplicate email or task.
 */
export async function processLeadWithRetry(
  leadId: string,
  maxAttempts: number = MAX_ATTEMPTS_PER_LEAD
): Promise<LeadOutcome> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await runLeadFollowUpCheck(leadId);
      return { leadId, attempts: attempt, ok: true, ran: result.ran };
    } catch (err) {
      lastError = err;
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  return { leadId, attempts: maxAttempts, ok: false, error: message };
}

export interface SchedulerRunSummary {
  startedAt: string;
  finishedAt: string;
  candidates: number;
  actioned: number;
  failed: number;
  errors: { leadId: string; error: string }[];
  status: "success" | "error";
}

/**
 * The one entry point the cron endpoint calls. Finds every lead still in
 * the active follow-up pipeline and runs the (idempotent) follow-up check
 * on each, individually retried and individually fault-isolated so one bad
 * lead can never abort the whole batch. Always writes one summary
 * AutomationRun so Settings can show Last Run / Last Successful Run / Last
 * Failure (spec production-readiness item 1 and 5).
 */
export async function runLeadFollowUpScheduler(): Promise<SchedulerRunSummary> {
  const startedAt = new Date();

  // Mirrors the same "active pipeline" definition runLeadFollowUpCheck uses
  // internally — narrowing here too just avoids fetching leads we already
  // know will short-circuit as not_active_pipeline.
  const candidateLeads = await prisma.lead.findMany({
    where: { status: { in: ["New Lead", "Contacted"] } },
    select: { id: true },
  });

  const outcomes: LeadOutcome[] = [];
  for (const lead of candidateLeads) {
    outcomes.push(await processLeadWithRetry(lead.id));
  }

  const actioned = outcomes.filter((o) => o.ok && o.ran).length;
  const failed = outcomes.filter((o) => !o.ok);
  const errors = failed.map((o) => ({ leadId: o.leadId, error: o.error ?? "Unknown error" }));

  const finishedAt = new Date();
  // A run "fails" only if every single candidate failed — partial failures
  // are logged per-lead but don't prevent the batch from completing
  // (spec: "must safely handle failures").
  const status: "success" | "error" =
    candidateLeads.length > 0 && failed.length === candidateLeads.length ? "error" : "success";

  const summary: SchedulerRunSummary = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    candidates: candidateLeads.length,
    actioned,
    failed: failed.length,
    errors,
    status,
  };

  await prisma.automationRun.create({
    data: {
      workspaceId: null,
      automationName: SCHEDULER_AUTOMATION_NAME,
      relatedRecordType: "scheduler",
      relatedRecordId: null,
      status,
      error: failed.length > 0 ? `${failed.length}/${candidateLeads.length} leads failed` : null,
      metadata: JSON.stringify(summary),
      attemptCount: 1,
      testMode: isTestMode(),
      runAt: finishedAt,
    },
  });

  return summary;
}

export { SCHEDULER_AUTOMATION_NAME };
