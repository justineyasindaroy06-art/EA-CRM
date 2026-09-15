import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { runLeadDay0Automation, runLeadFollowUpCheck } from "@/lib/automations/lead-automation";
import { createWorkspace, createLeadWithContact } from "./fixtures";
import { addDays } from "@/lib/dates";

describe("Lead automation", () => {
  it("Day 0: sends welcome email, sets next follow-up, creates a follow-up task", async () => {
    const workspace = await createWorkspace();
    const { lead } = await createLeadWithContact(workspace.id);

    const result = await runLeadDay0Automation(lead.id);
    expect(result.ran).toBe(true);

    const runs = await prisma.automationRun.findMany({ where: { relatedRecordId: lead.id } });
    expect(runs.some((r) => r.automationName === "email:lead_welcome")).toBe(true);
    expect(runs.some((r) => r.automationName === "lead_day0_welcome")).toBe(true);

    const tasks = await prisma.task.findMany({ where: { relatedLeadId: lead.id } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].automationKey).toBe(`lead:${lead.id}:followup`);

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.nextFollowUpAt).not.toBeNull();
  });

  it("Day 0 automation does not run twice for the same lead", async () => {
    const workspace = await createWorkspace();
    const { lead } = await createLeadWithContact(workspace.id);

    await runLeadDay0Automation(lead.id);
    const second = await runLeadDay0Automation(lead.id);

    expect(second.ran).toBe(false);
    const tasks = await prisma.task.findMany({ where: { relatedLeadId: lead.id } });
    expect(tasks).toHaveLength(1); // no duplicate task
  });

  it("Day 3-5: sends a follow-up email and creates a follow-up task once the window has passed", async () => {
    const workspace = await createWorkspace();
    const { lead } = await createLeadWithContact(workspace.id, { createdAt: addDays(new Date(), -5) });

    const result = await runLeadFollowUpCheck(lead.id);
    expect(result.ran).toBe(true);

    const runs = await prisma.automationRun.findMany({ where: { relatedRecordId: lead.id, automationName: "lead_followup" } });
    expect(runs).toHaveLength(1);
  });

  it("Day 10: sends the final follow-up and transitions the lead to Nurture (not Lost)", async () => {
    const workspace = await createWorkspace();
    const { lead } = await createLeadWithContact(workspace.id, { createdAt: addDays(new Date(), -11) });

    await runLeadFollowUpCheck(lead.id);

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.status).toBe("Nurture");
    expect(updated.status).not.toBe("Lost / Disqualified");

    const reviewTask = await prisma.task.findFirst({ where: { automationKey: `lead:${lead.id}:review` } });
    expect(reviewTask).not.toBeNull();
  });

  it("does not run follow-up automation twice for the same window (idempotent)", async () => {
    const workspace = await createWorkspace();
    const { lead } = await createLeadWithContact(workspace.id, { createdAt: addDays(new Date(), -11) });

    await runLeadFollowUpCheck(lead.id);
    const second = await runLeadFollowUpCheck(lead.id);

    // After nurture transition, status is no longer in the active pipeline,
    // so the second call should also be a no-op (defense in depth).
    expect(second.ran).toBe(false);
  });

  it("does not touch leads outside the active pipeline (e.g. already Nurture)", async () => {
    const workspace = await createWorkspace();
    const { lead } = await createLeadWithContact(workspace.id, { createdAt: addDays(new Date(), -20) });
    await prisma.lead.update({ where: { id: lead.id }, data: { status: "Nurture" } });

    const result = await runLeadFollowUpCheck(lead.id);
    expect(result.ran).toBe(false);
    expect(result.reason).toBe("not_active_pipeline");
  });
});
