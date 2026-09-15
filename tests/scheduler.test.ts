import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { runLeadFollowUpScheduler, processLeadWithRetry, SCHEDULER_AUTOMATION_NAME } from "@/lib/automations/scheduler";
import { createWorkspace, createLeadWithContact } from "./fixtures";
import { addDays } from "@/lib/dates";

describe("Lead follow-up scheduler", () => {
  it("Day 3-5: processes a due lead automatically, creating the follow-up task and email run", async () => {
    const workspace = await createWorkspace();
    const { lead } = await createLeadWithContact(workspace.id, { createdAt: addDays(new Date(), -5) });

    const summary = await runLeadFollowUpScheduler();

    expect(summary.candidates).toBeGreaterThanOrEqual(1);
    expect(summary.actioned).toBeGreaterThanOrEqual(1);
    expect(summary.status).toBe("success");

    const tasks = await prisma.task.findMany({ where: { relatedLeadId: lead.id } });
    expect(tasks.length).toBeGreaterThan(0);

    const emailRuns = await prisma.automationRun.findMany({
      where: { relatedRecordId: lead.id, automationName: { startsWith: "email:" } },
    });
    expect(emailRuns.length).toBeGreaterThan(0);
  });

  it("running the scheduler twice does not duplicate the follow-up task or email", async () => {
    const workspace = await createWorkspace();
    const { lead } = await createLeadWithContact(workspace.id, { createdAt: addDays(new Date(), -5) });

    await runLeadFollowUpScheduler();
    const tasksAfterFirst = await prisma.task.findMany({ where: { relatedLeadId: lead.id } });
    const emailRunsAfterFirst = await prisma.automationRun.findMany({
      where: { relatedRecordId: lead.id, automationName: "lead_followup" },
    });

    await runLeadFollowUpScheduler();
    const tasksAfterSecond = await prisma.task.findMany({ where: { relatedLeadId: lead.id } });
    const emailRunsAfterSecond = await prisma.automationRun.findMany({
      where: { relatedRecordId: lead.id, automationName: "lead_followup" },
    });

    expect(tasksAfterSecond.length).toBe(tasksAfterFirst.length);
    expect(emailRunsAfterSecond.length).toBe(emailRunsAfterFirst.length);
  });

  it("Day 10: transitions the lead to Nurture and sends the final follow-up, via the scheduler", async () => {
    const workspace = await createWorkspace();
    const { lead } = await createLeadWithContact(workspace.id, { createdAt: addDays(new Date(), -11) });

    await runLeadFollowUpScheduler();

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.status).toBe("Nurture");

    const finalEmailRuns = await prisma.automationRun.findMany({
      where: { relatedRecordId: lead.id, automationName: "email:lead_final_followup" },
    });
    expect(finalEmailRuns.length).toBe(1);
  });

  it("writes one scheduler-summary AutomationRun per run, for the Settings status panel", async () => {
    const workspace = await createWorkspace();
    await createLeadWithContact(workspace.id, { createdAt: addDays(new Date(), -5) });

    await runLeadFollowUpScheduler();

    const schedulerRuns = await prisma.automationRun.findMany({ where: { automationName: SCHEDULER_AUTOMATION_NAME } });
    expect(schedulerRuns).toHaveLength(1);
    expect(schedulerRuns[0].workspaceId).toBeNull(); // scheduler runs span every workspace
    expect(schedulerRuns[0].status).toBe("success");

    const metadata = JSON.parse(schedulerRuns[0].metadata ?? "{}");
    expect(metadata.candidates).toBeGreaterThanOrEqual(1);
  });

  it("does not process leads that are not in the active pipeline (e.g. already Nurture or Lost)", async () => {
    const workspace = await createWorkspace();
    const { lead } = await createLeadWithContact(workspace.id, { createdAt: addDays(new Date(), -20) });
    await prisma.lead.update({ where: { id: lead.id }, data: { status: "Lost / Disqualified" } });

    const summary = await runLeadFollowUpScheduler();

    expect(summary.candidates).toBe(0);
  });

  it("processLeadWithRetry retries the given number of times and reports failure for a nonexistent lead", async () => {
    const outcome = await processLeadWithRetry("does-not-exist", 2);
    expect(outcome.ok).toBe(false);
    expect(outcome.attempts).toBe(2);
    expect(outcome.error).toBeTruthy();
  });

  it("a per-lead failure never escapes processLeadWithRetry, so one bad lead can't abort the batch", async () => {
    // processLeadWithRetry always returns an outcome object (ok: true/false)
    // instead of throwing — this is what guarantees the scheduler's per-lead
    // for-loop in runLeadFollowUpScheduler can never be aborted partway
    // through by a single lead's failure (spec: "must safely handle
    // failures"). Proven directly: a guaranteed-to-fail lead ID resolves
    // rather than rejects.
    await expect(processLeadWithRetry("definitely-does-not-exist")).resolves.toMatchObject({ ok: false });
  });

  it("multiple due leads across different workspaces are all processed in one run", async () => {
    const workspaceA = await createWorkspace("Workspace A");
    const workspaceB = await createWorkspace("Workspace B");
    const { lead: leadA } = await createLeadWithContact(workspaceA.id, {
      email: "a@example.com",
      createdAt: addDays(new Date(), -5),
    });
    const { lead: leadB } = await createLeadWithContact(workspaceB.id, {
      email: "b@example.com",
      createdAt: addDays(new Date(), -5),
    });

    const summary = await runLeadFollowUpScheduler();

    expect(summary.candidates).toBe(2);
    expect(summary.actioned).toBe(2);
    expect(summary.failed).toBe(0);

    const tasksA = await prisma.task.findMany({ where: { relatedLeadId: leadA.id } });
    const tasksB = await prisma.task.findMany({ where: { relatedLeadId: leadB.id } });
    expect(tasksA.length).toBeGreaterThan(0);
    expect(tasksB.length).toBeGreaterThan(0);
  });
});
